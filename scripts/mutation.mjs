// `npm run test:mutation` の本体。
// 通常テスト → 互換処理 → Stryker → レポートの検証の順に実行し、どこで失敗しても非ゼロで終える。
// 実行ごとの記録は mutation-artifacts/run-*/ に残す（次の実行で消さない）。
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { appendFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { formatSummary, summarizeReport } from './mutation-report.mjs'
import { applyCompat } from './stryker-compat.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportDir = path.join(root, 'reports', 'mutation')
const strykerLog = path.join(root, 'stryker.log')

await mkdir(path.join(root, 'mutation-artifacts'), { recursive: true })
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '')
const runDir = await mkdtemp(path.join(root, 'mutation-artifacts', `run-${stamp}-`))
const runLog = createWriteStream(path.join(runDir, 'run.log'))

function log(line) {
  process.stdout.write(`${line}\n`)
  runLog.write(`${line}\n`)
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, stdio: ['inherit', 'pipe', 'pipe'] })
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); runLog.write(chunk) })
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); runLog.write(chunk) })
    child.on('error', (error) => { log(String(error)); resolve(1) })
    child.on('close', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

async function step(name, action) {
  const started = Date.now()
  log(`\n=== ${name} ===`)
  const code = await action()
  log(`=== ${name}: ${code === 0 ? '成功' : `失敗（終了コード ${code}）`}・${((Date.now() - started) / 1000).toFixed(1)}秒 ===`)
  return code
}

async function finish(code) {
  log(`\n結果: ${code === 0 ? '成功' : `失敗（終了コード ${code}）`}。記録: ${path.relative(root, runDir)}`)
  await new Promise((resolve) => runLog.end(resolve))
  process.exit(code)
}

const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
log(`開始: ${new Date().toISOString()}`)
log(`対象コミット: ${git.status === 0 ? git.stdout.trim() : '不明（git を実行できない環境）'}`
  + `${dirty.status === 0 && dirty.stdout.trim() ? '（未コミットの変更あり）' : ''}`)
log(`環境: Node ${process.version}・${os.platform()} ${os.arch()}・CPU ${os.availableParallelism()}`)

const { default: config } = await import(pathToFileURL(path.join(root, 'stryker.config.mjs')).href)
const expectedFiles = config.mutate
const invalid = expectedFiles.filter((file) => /[*?[\]{}!:]/.test(file) || !existsSync(path.join(root, file)))
log(`変異対象（${expectedFiles.length}件）: ${expectedFiles.join(', ')}`)
if (expectedFiles.length === 0 || invalid.length > 0) {
  log(`変異対象は存在するファイルを glob なしで明示してください: ${invalid.join(', ') || '（空）'}`)
  await finish(1)
}

if (await step('通常テスト（npm run test）', () => run('npm', ['run', 'test'])) !== 0) await finish(1)

const compat = await step('Stryker の互換処理', async () => {
  try {
    for (const { issue, file, state } of await applyCompat(root)) {
      log(`${state === 'applied' ? '適用' : '適用済み'}: ${file}（${issue}）`)
    }
    return 0
  } catch (error) {
    log(String(error instanceof Error ? error.message : error))
    return 1
  }
})
if (compat !== 0) await finish(1)

// 前回のレポートで成功に見えないよう、実行前に消す。
await rm(reportDir, { recursive: true, force: true })
await rm(strykerLog, { force: true })
const stryker = await step('Stryker（初期実行と変異の検証）', () => run(process.execPath, [
  path.join(root, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js'), 'run',
]))

for (const source of [reportDir, strykerLog]) {
  if (existsSync(source)) await cp(source, path.join(runDir, path.basename(source)), { recursive: true })
}

const jsonFile = path.join(reportDir, 'mutation.json')
const report = existsSync(jsonFile) ? JSON.parse(await readFile(jsonFile, 'utf8')) : null
const summary = summarizeReport(report, expectedFiles)
const text = formatSummary(summary, expectedFiles)
log(`\n${text}`)
await writeFile(path.join(runDir, 'summary.md'), text)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text)

if (stryker !== 0) await finish(stryker)
await finish(summary.problems.length > 0 ? 1 : 0)
