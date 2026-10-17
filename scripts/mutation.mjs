import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { platform, release } from 'node:os'
import { join } from 'node:path'
import { applyCompatibilityFix } from './stryker-compat.mjs'
import { validateMutationReport } from './mutation-report.mjs'
import { makeConfig, mutationTargets } from '../stryker.config.mjs'

mkdirSync('mutation-artifacts', { recursive: true })
const directory = mkdtempSync('mutation-artifacts/run-')
const log = join(directory, 'run.log')
const started = Date.now()
const manifest = { startedAt: new Date(started).toISOString(), node: process.version, platform: `${platform()} ${release()}`, command: 'npm run test:mutation', targets: mutationTargets, phases: [] }
let activeChild
let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true
  activeChild?.kill(signal)
})
function message(value) {
  console.log(value)
  appendFileSync(log, value + '\n')
}
function run(command, args, env = process.env) {
  if (interrupted) throw new Error('実行が中断されました')
  message(`$ ${command} ${args.join(' ')}`)
  const start = Date.now()
  return new Promise((resolve, reject) => {
    activeChild = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    for (const [stream, output] of [[activeChild.stdout, process.stdout], [activeChild.stderr, process.stderr]]) {
      stream.on('data', (data) => { appendFileSync(log, data); output.write(data) })
    }
    activeChild.on('error', reject)
    activeChild.on('close', (code, signal) => {
      manifest.phases.push({ command, args, durationMs: Date.now() - start, exitCode: code, signal })
      activeChild = undefined
      if (code !== 0 || signal || interrupted) reject(new Error(`コマンドが失敗しました: code=${code}, signal=${signal}`))
      else resolve()
    })
  })
}
try {
  message(`結果: ${directory}`)
  try { manifest.sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { manifest.sourceSha = process.env.MUTATION_SOURCE_SHA ?? process.env.GITHUB_SHA ?? '未取得（ソースのSHA256を参照）' }
  manifest.sourceHashes = Object.fromEntries(mutationTargets.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]))
  manifest.versions = Object.fromEntries(['vitest', 'vite', 'typescript', '@stryker-mutator/core', '@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker', '@stryker-mutator/instrumenter'].map((pkg) => [pkg, JSON.parse(readFileSync(join('node_modules', pkg, 'package.json'), 'utf8')).version]))
  writeFileSync(join(directory, 'config.json'), JSON.stringify(makeConfig(directory), null, 2))
  manifest.compatibility = applyCompatibilityFix()
  message('互換処理: Vitest/Stryker版と3ファイルのSHA256を照合しました')
  await run('npm', ['run', 'test'])
  await run(process.execPath, ['node_modules/@stryker-mutator/core/bin/stryker.js', 'run', 'stryker.config.mjs', ...process.argv.slice(2)], { ...process.env, MUTATION_RUN_DIR: directory })
  manifest.counts = validateMutationReport(JSON.parse(readFileSync(join(directory, 'mutation.json'), 'utf8')), mutationTargets)
  for (const [file, before] of Object.entries(manifest.sourceHashes)) {
    if (createHash('sha256').update(readFileSync(file)).digest('hex') !== before) throw new Error(`追跡ソースが変化しました: ${file}`)
  }
  manifest.success = true
  message(`状態別件数: ${JSON.stringify(manifest.counts)}`)
} catch (error) {
  manifest.success = false
  manifest.error = String(error.stack ?? error)
  message(manifest.error)
  process.exitCode = interrupted ? 130 : 1
} finally {
  manifest.finishedAt = new Date().toISOString()
  manifest.durationMs = Date.now() - started
  writeFileSync(join(directory, 'run.json'), JSON.stringify(manifest, null, 2))
  message(`実行記録: ${directory}/run.json (${manifest.durationMs}ms)`)
}
