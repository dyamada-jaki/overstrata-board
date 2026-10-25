import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { decideMutation } from './mutation-ci.mjs'

// Git は実物。GitHub API だけを境界として置き換える。
function fixture(t, event = 'push') {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'mutation-ci-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git('init', '-b', 'main')
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'CI test')
  const write = (file, text = 'example\n') => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true })
    writeFileSync(path.join(cwd, file), text)
  }
  const commit = () => { git('add', '-A'); git('commit', '--allow-empty', '-qm', 'fixture'); return git('rev-parse', 'HEAD') }
  write('src/app.ts'); write('README.md'); write('docs/old.md')
  const verified = commit()
  const context = { cwd, repository: 'owner/repo', event, target: verified, head: verified, base: verified,
    before: verified, branch: 'main', pr: 47, runId: 99 }
  const record = { id: 10, run_attempt: 1, event, status: 'completed', conclusion: 'success',
    head_sha: verified, head_branch: 'main', pull_requests: [{ number: 47 }], html_url: 'https://example.invalid/runs/10' }
  let jobs = [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', html_url: 'https://example.invalid/jobs/1',
    steps: [{ name: event === 'push' ? 'Run npm run test:mutation' : '全対象のミューテーションテスト', conclusion: 'success' }] }]
  let artifacts = [{ name: `mutation-verified-${verified}-1`, expired: false }]
  const runs = [record]
  const api = async (endpoint) => {
    if (endpoint.includes('/jobs')) return { jobs }
    if (endpoint.includes('/artifacts')) return { artifacts }
    return { workflow_runs: runs }
  }
  const decide = () => {
    context.target = git('rev-parse', 'HEAD'); context.head = context.target
    return decideMutation(context, { api })
  }
  return { cwd, git, write, commit, verified, context, record, runs, decide,
    setJobs: (value) => { jobs = value }, setArtifacts: (value) => { artifacts = value } }
}

test('push: 全対象成功地点からMarkdownだけなら省略し比較範囲と成功記録を残す', async (t) => {
  const f = fixture(t)
  f.write('README.md', 'documentation\n'); const target = f.commit()
  const result = await f.decide()
  assert.equal(result.run, false)
  assert.equal(result.from, f.verified)
  assert.equal(result.target, target)
  assert.match(result.record, /runs\/10/)
  assert.match(result.reason, /Markdown/)
})

test('PR: baseの成功したpushがあればMarkdownだけの新規PRを省略できる', async (t) => {
  const f = fixture(t, 'pull_request')
  f.record.event = 'push'; f.record.pull_requests = []
  f.write('docs/new.md'); f.commit()
  assert.equal((await f.decide()).run, false)
})

test('PR: 以前のheadを全対象検証済みならREADME追記を省略できる', async (t) => {
  const f = fixture(t, 'pull_request')
  f.write('README.md', 'review correction\n'); f.commit()
  assert.equal((await f.decide()).run, false)
})

for (const file of ['src/app.ts', 'src/app.test.ts', 'package-lock.json', '.github/workflows/ci.yml', 'stryker.config.mjs']) {
  test(`Markdownと${file}の混在は全対象を実行する`, async (t) => {
    const f = fixture(t)
    f.write('README.md', 'docs\n'); f.write(file, 'changed\n'); f.commit()
    assert.equal((await f.decide()).run, true)
  })
}

test('Markdownの改名・削除（空白・改行入りパスも含む）は省略できる', async (t) => {
  const f = fixture(t)
  renameSync(path.join(f.cwd, 'docs/old.md'), path.join(f.cwd, 'docs/new name\n.md'))
  rmSync(path.join(f.cwd, 'README.md')); f.commit()
  assert.equal((await f.decide()).run, false)
})

for (const [from, to] of [['src/app.ts', 'docs/app.md'], ['docs/old.md', 'src/old.ts']]) {
  test(`${from} → ${to} の改名は全対象を実行する`, async (t) => {
    const f = fixture(t)
    renameSync(path.join(f.cwd, from), path.join(f.cwd, to)); f.commit()
    assert.equal((await f.decide()).run, true)
  })
}

test('コードの削除は全対象を実行する', async (t) => {
  const f = fixture(t)
  rmSync(path.join(f.cwd, 'src/app.ts')); f.commit()
  assert.equal((await f.decide()).run, true)
})

for (const state of ['failure', 'in_progress', 'unknown']) {
  test(`最後がMarkdownでも前のコード変更の検証が${state}なら実行する`, async (t) => {
    const f = fixture(t)
    f.write('src/app.ts', 'unverified code\n'); const code = f.commit()
    f.runs.unshift({ ...f.record, id: 11, head_sha: code,
      status: state === 'in_progress' ? 'in_progress' : 'completed', conclusion: state === 'failure' ? 'failure' : null })
    f.context.before = code
    f.write('README.md', 'last commit is docs\n'); f.commit()
    const result = await f.decide()
    assert.equal(result.run, true)
    assert.equal(result.from, f.verified)
  })
}

test('省略済みの成功jobを全対象成功記録に使わず、さらに前の全対象成功記録を見る', async (t) => {
  const f = fixture(t)
  f.write('README.md', 'first docs\n'); const skipped = f.commit()
  f.runs.unshift({ ...f.record, id: 11, head_sha: skipped })
  f.context.before = skipped
  f.write('README.md', 'second docs\n'); f.commit()
  const api = async (endpoint) => {
    if (endpoint.includes('/11/') && endpoint.includes('/jobs')) return { jobs: [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', steps: [{ name: '全対象のミューテーションテスト', conclusion: 'skipped' }] }] }
    if (endpoint.includes('/jobs')) return { jobs: [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', steps: [{ name: 'Run npm run test:mutation', conclusion: 'success' }] }] }
    return { workflow_runs: f.runs }
  }
  const result = await decideMutation({ ...f.context, target: f.git('rev-parse', 'HEAD') }, { api })
  assert.equal(result.run, false)
  assert.equal(result.from, f.verified)
})

test('比較元が取得できない場合は全対象を実行する', async (t) => {
  const f = fixture(t)
  f.record.head_sha = 'f'.repeat(40)
  f.write('README.md', 'docs\n'); f.commit()
  assert.equal((await f.decide()).run, true)
})

test('API取得失敗・成功記録なしは全対象を実行する', async (t) => {
  const f = fixture(t)
  f.write('README.md', 'docs\n'); f.commit()
  const context = { ...f.context, target: f.git('rev-parse', 'HEAD') }
  assert.equal((await decideMutation(context, { api: async () => { throw new Error('403') } })).run, true)
  f.runs.length = 0
  assert.equal((await f.decide()).run, true)
})

test('同じSHAの再実行は全対象を実行し、異なるSHAで同じtreeなら差分なしで省略する', async (t) => {
  const f = fixture(t)
  assert.equal((await f.decide()).run, true)
  f.commit()
  const result = await f.decide()
  assert.equal(result.run, false)
  assert.match(result.reason, /差分なし/)
})

test('省略済みrun自体の再実行でも全対象を実行する', async (t) => {
  const f = fixture(t)
  f.write('README.md', 'docs\n'); f.commit()
  f.context.attempt = 2
  assert.equal((await f.decide()).run, true)
})

test('PRのbaseにコードの差分が入れば、前headが成功済みでも実行する', async (t) => {
  const f = fixture(t, 'pull_request')
  f.write('src/from-base.ts', 'base update\n'); f.write('README.md', 'docs\n'); f.commit()
  assert.equal((await f.decide()).run, true)
})

test('別PR・別pushブランチ・失敗step・成功証明のないPRを成功記録にしない', async (t) => {
  for (const kind of ['other-pr', 'other-branch', 'failed-step', 'missing-proof']) {
    const f = fixture(t, kind === 'other-branch' ? 'push' : 'pull_request')
    if (kind === 'other-pr') f.record.pull_requests = [{ number: 48 }]
    if (kind === 'other-branch') f.record.head_branch = 'unrelated'
    if (kind === 'failed-step') f.setJobs([{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', steps: [{ name: '全対象のミューテーションテスト', conclusion: 'failure' }] }])
    if (kind === 'missing-proof') f.setArtifacts([])
    f.write('README.md', 'docs\n'); f.commit()
    assert.equal((await f.decide()).run, true, kind)
  }
})

test('手元は既定2、CI明示値は4（CI=trueだけでは変わらない）', () => {
  const load = (env) => Number(execFileSync(process.execPath, ['--input-type=module', '-e', "import config from './stryker.config.mjs'; console.log(config.concurrency)"],
    { cwd: process.cwd(), env: { ...process.env, STRYKER_CONCURRENCY: '', ...env }, encoding: 'utf8' }).trim())
  assert.equal(load({}), 2)
  assert.equal(load({ CI: 'true' }), 2)
  assert.equal(load({ STRYKER_CONCURRENCY: '4' }), 4)
})

test('より新しいbaseの成功runが先に並んでも、検証済みPRへのREADME追記は省略する', async (t) => {
  const f = fixture(t, 'pull_request')
  f.write('src/app.ts', 'verified PR code\n'); const verifiedHead = f.commit()
  f.record.head_sha = verifiedHead
  f.write('README.md', 'review docs\n'); const target = f.commit()
  const baseRun = { ...f.record, id: 20, event: 'push', head_sha: f.verified, pull_requests: [] }
  const api = async (endpoint) => {
    if (endpoint.includes('/20/') && endpoint.includes('/jobs')) return { jobs: [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', steps: [{ name: 'Run npm run test:mutation', conclusion: 'success' }] }] }
    if (endpoint.includes('/jobs')) return { jobs: [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success', steps: [{ name: '全対象のミューテーションテスト', conclusion: 'success' }] }] }
    if (endpoint.includes('/artifacts')) return { artifacts: [{ name: `mutation-verified-${verifiedHead}-1`, expired: false }] }
    return { workflow_runs: [baseRun, f.record] }
  }
  assert.equal((await decideMutation({ ...f.context, target, head: target }, { api })).run, false)
})

test('実際のgh接続の入口で1MiBを超える成功run一覧も読んで省略を判定する', (t) => {
  const f = fixture(t)
  f.write('README.md', 'docs\n'); const target = f.commit()
  const jobs = [{ name: 'ミューテーションテスト（StrykerJS）', conclusion: 'success',
    steps: [{ name: 'Run npm run test:mutation', conclusion: 'success' }] }]
  f.write('bin/gh', `#!/usr/bin/env node\nconst endpoint=process.argv[3];\nconsole.log(JSON.stringify(endpoint.includes('/jobs') ? ${JSON.stringify({ jobs })} : { workflow_runs: [${JSON.stringify(f.record)}], metadata: 'x'.repeat(2*1024*1024) }));\n`)
  chmodSync(path.join(f.cwd, 'bin/gh'), 0o755)
  const context = { ...f.context, target, head: target }
  const source = `import { decideMutation } from ${JSON.stringify(new URL('./mutation-ci.mjs', import.meta.url).href)}; console.log(JSON.stringify(await decideMutation(${JSON.stringify(context)})));`
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8', env: { ...process.env, PATH: `${path.join(f.cwd, 'bin')}${path.delimiter}${process.env.PATH}` },
  }))
  assert.equal(result.run, false, result.reason)
})
