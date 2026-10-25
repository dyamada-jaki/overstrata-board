import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, test } from 'node:test'
import { decide, main, parseRawDiff, verificationOf } from './mutation-scope.mjs'

// ---- 判定（差分のエントリと比較元の記録から、省略か実行かを決める） ----

const regular = (status, file) => ({
  status, path: file,
  srcMode: status === 'A' ? '000000' : '100644',
  dstMode: status === 'D' ? '000000' : '100644',
})
const base = { sha: 'b'.repeat(40), runUrl: 'https://github.com/o/r/actions/runs/1' }

test('Markdown だけの変更は省略する', () => {
  const result = decide({ event: 'push', base, entries: [regular('M', 'README.md'), regular('M', 'docs/spec.md')] })
  assert.equal(result.skip, true)
  assert.match(result.reason, /Markdown だけ/)
})

test('Markdown の追加・削除だけも省略する', () => {
  assert.equal(decide({ event: 'pull_request', base, entries: [regular('D', 'docs/old.md')] }).skip, true)
  assert.equal(decide({ event: 'pull_request', base, entries: [regular('A', 'docs/new.md')] }).skip, true)
})

test('コードとの混在は実行し、Markdown 以外のパスを理由に挙げる', () => {
  const result = decide({ event: 'push', base, entries: [regular('M', 'README.md'), regular('M', 'src/App.tsx')] })
  assert.equal(result.skip, false)
  assert.deepEqual(result.others, ['src/App.tsx'])
})

test('コード・テスト・依存・CI 設定・Stryker の設定だけの変更は実行する', () => {
  for (const file of [
    'src/domain/movement.ts', 'src/App.test.tsx', 'package-lock.json', 'package.json',
    '.github/workflows/ci.yml', 'stryker.config.mjs', 'scripts/mutation.mjs', '.nvmrc',
  ]) {
    assert.equal(decide({ event: 'push', base, entries: [regular('M', file)] }).skip, false, file)
  }
})

test('拡張子が .md と完全に一致しないものは Markdown として扱わない', () => {
  for (const file of ['README.MD', 'docs/a.mdx', 'docs/md', 'docs/a.md.ts']) {
    assert.equal(decide({ event: 'push', base, entries: [regular('M', file)] }).skip, false, file)
  }
})

test('.md でも通常のファイル以外（シンボリックリンク・サブモジュール・種類の変更）は実行する', () => {
  const link = { status: 'A', path: 'docs/link.md', srcMode: '000000', dstMode: '120000' }
  const submodule = { status: 'M', path: 'docs/sub.md', srcMode: '160000', dstMode: '160000' }
  const typeChange = { status: 'T', path: 'docs/a.md', srcMode: '100644', dstMode: '120000' }
  for (const entry of [link, submodule, typeChange]) {
    assert.equal(decide({ event: 'push', base, entries: [entry] }).skip, false, entry.path)
  }
})

test('差分なし（比較元と同じ木）は省略し、差分なしと記録する', () => {
  const result = decide({ event: 'push', base, entries: [] })
  assert.equal(result.skip, true)
  assert.match(result.reason, /差分なし/)
})

test('比較元の成功記録が無ければ、Markdown だけでも実行する', () => {
  const result = decide({ event: 'push', base: null, entries: [regular('M', 'README.md')] })
  assert.equal(result.skip, false)
  assert.match(result.reason, /成功記録/)
})

test('差分を取得できない（比較不能）なら実行する', () => {
  const result = decide({ event: 'push', base, entries: null, diffError: 'fatal: bad object' })
  assert.equal(result.skip, false)
  assert.match(result.reason, /比較不能/)
})

test('PR と main への push 以外のイベントでは実行する', () => {
  for (const event of ['workflow_dispatch', 'schedule', 'push-branch', undefined]) {
    assert.equal(decide({ event, base, entries: [regular('M', 'README.md')] }).skip, false, String(event))
  }
})

// ---- 比較元の成功記録（ミューテーションのジョブの npm run test:mutation の step） ----

const jobName = 'ミューテーションテスト（StrykerJS）'
const step = (conclusion, status = 'completed') => ({ name: 'Run npm run test:mutation', status, conclusion })
const job = (steps, extra = {}) => ({ name: jobName, status: 'completed', conclusion: 'success', steps, ...extra })

test('npm run test:mutation の step が成功したジョブだけを全対象の成功記録にする', () => {
  assert.equal(verificationOf([job([step('success')])]), 'success')
})

test('失敗・キャンセル・実行中・省略・ジョブ無しは成功記録にしない', () => {
  assert.equal(verificationOf([job([step('failure')], { conclusion: 'failure' })]), 'failure')
  assert.equal(verificationOf([job([step('cancelled')], { conclusion: 'cancelled' })]), 'cancelled')
  assert.equal(verificationOf([job([step(null, 'in_progress')], { status: 'in_progress', conclusion: null })]), 'in_progress')
  assert.equal(verificationOf([job([], { status: 'queued', conclusion: null })]), 'in_progress')
  // Markdown だけで省略したジョブもジョブ全体は success になるが、全対象を通していない。
  assert.equal(verificationOf([job([step('skipped')])]), 'skipped')
  assert.equal(verificationOf([job([])]), 'unknown')
  assert.equal(verificationOf([{ ...job([step('success')]), name: 'テスト・型チェック・Lint・ビルド' }]), 'unknown')
  assert.equal(verificationOf([]), 'unknown')
})

// ---- git の差分の読み取り ----

test('git diff --raw -z の出力を読み、日本語のパスをそのまま扱う', () => {
  const out = [
    ':100644 100644 aaa bbb M', 'README.md',
    ':000000 100644 000 ccc A', 'docs/decisions/0005-駒の状態.md',
    ':100644 000000 ddd 000 D', 'src/old.ts',
    '',
  ].join('\0')
  assert.deepEqual(parseRawDiff(out), [
    { srcMode: '100644', dstMode: '100644', status: 'M', path: 'README.md' },
    { srcMode: '000000', dstMode: '100644', status: 'A', path: 'docs/decisions/0005-駒の状態.md' },
    { srcMode: '100644', dstMode: '000000', status: 'D', path: 'src/old.ts' },
  ])
})

// ---- 入り口（本物の git の履歴と、GitHub API の境界だけを置き換えた記録） ----

const temps = []
after(async () => { await Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true }))) })

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`)
  return result.stdout.trim()
}

async function repo() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mutation-scope-'))
  temps.push(dir)
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  return dir
}

async function commit(dir, files, message = 'change') {
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(dir, file)
    if (content === null) {
      git(dir, 'rm', '-q', file)
      continue
    }
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, content)
    git(dir, 'add', file)
  }
  git(dir, 'commit', '-q', '--allow-empty', '-m', message)
  return git(dir, 'rev-parse', 'HEAD')
}

function rename(dir, from, to) {
  git(dir, 'mv', from, to)
  git(dir, 'commit', '-q', '-m', `rename ${from}`)
  return git(dir, 'rev-parse', 'HEAD')
}

/**
 * GitHub Actions の API（/actions/runs と /runs/{id}/jobs）の応答を、
 * `{ [sha]: [{ event, branch, verification }] }` から作る。ネットワークと実際の run の記録はテストで作れないため、
 * この境界だけを置き換える。実物との接続は CI の実例と手元の dry-run で確かめる。
 */
function fakeGitHub(records) {
  const runs = []
  for (const [sha, list] of Object.entries(records)) {
    for (const { event, branch = 'main', verification, workflow = '.github/workflows/ci.yml' } of list) {
      runs.push({ id: runs.length + 100, head_sha: sha, event, head_branch: branch, path: workflow, verification })
    }
  }
  const calls = []
  const fetch = async (url, options) => {
    calls.push(String(url))
    assert.equal(options.headers.Authorization, 'Bearer token')
    const { pathname, searchParams } = new URL(url)
    const jobsMatch = pathname.match(/\/actions\/runs\/(\d+)\/jobs$/)
    if (jobsMatch) {
      const run = runs.find(({ id }) => id === Number(jobsMatch[1]))
      const steps = {
        success: [step('success')],
        failure: [step('failure')],
        skipped: [step('skipped')],
        in_progress: [step(null, 'in_progress')],
      }[run.verification]
      return Response.json({ jobs: [job(steps, run.verification === 'in_progress' ? { status: 'in_progress', conclusion: null } : {})] })
    }
    const list = runs
      .filter(({ head_sha, event }) => head_sha === searchParams.get('head_sha') && event === searchParams.get('event'))
      .map((run) => ({ ...run, html_url: `https://github.com/o/r/actions/runs/${run.id}` }))
    return Response.json({ total_count: list.length, workflow_runs: list })
  }
  return { fetch, calls }
}

async function runMain(dir, { event, sha, pr, records, token = 'token' }) {
  const out = path.join(dir, '..', `${path.basename(dir)}-out`)
  const summary = path.join(dir, '..', `${path.basename(dir)}-summary`)
  temps.push(out, summary)
  await writeFile(out, '')
  await writeFile(summary, '')
  const env = {
    GITHUB_EVENT_NAME: event,
    GITHUB_SHA: sha,
    GITHUB_REF: event === 'push' ? 'refs/heads/main' : 'refs/pull/1/merge',
    GITHUB_REPOSITORY: 'o/r',
    GITHUB_API_URL: 'https://api.github.test',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_OUTPUT: out,
    GITHUB_STEP_SUMMARY: summary,
    ...(token ? { GITHUB_TOKEN: token } : {}),
  }
  if (pr) {
    const eventFile = path.join(dir, '..', `${path.basename(dir)}-event.json`)
    temps.push(eventFile)
    await writeFile(eventFile, JSON.stringify({ pull_request: { head: { sha: pr.head }, base: { sha: pr.base } } }))
    env.GITHUB_EVENT_PATH = eventFile
  }
  const { fetch, calls } = fakeGitHub(records)
  const result = await main({ env, cwd: dir, fetch, log: () => {} })
  return { result, output: await readFile(out, 'utf8'), summary: await readFile(summary, 'utf8'), calls }
}

test('main への push: 直前のコミットで全対象が成功していて Markdown だけなら省略し、対象・比較範囲・理由を記録する', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'README.md': '# b\n', 'docs/decisions/0005-駒の状態.md': '本文\n' })
  const { result, output, summary } = await runMain(dir, {
    event: 'push', sha: c1, records: { [c0]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, true)
  assert.equal(result.base.sha, c0)
  assert.match(output, /^skip=true$/m)
  assert.ok(summary.includes(c1), '対象 SHA')
  assert.ok(summary.includes(`${c0}..${c1}`), '比較範囲')
  assert.ok(summary.includes('https://github.com/o/r/actions/runs/'), '比較元の成功記録の run')
  assert.ok(summary.includes('docs/decisions/0005-駒の状態.md'), '日本語のパスをそのまま記録する')
  assert.match(summary, /省略/)
})

test('main への push: コードとの混在は実行する', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'README.md': '# b\n', 'src/a.ts': 'export const a = 2\n' })
  const { result, output } = await runMain(dir, {
    event: 'push', sha: c1, records: { [c0]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
  assert.deepEqual(result.others, ['src/a.ts'])
  assert.match(output, /^skip=false$/m)
})

test('main への push: 改名は旧パスと新パスの両方で判定する', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'docs/a.md': '# a\n', 'docs/b.md': '# b\n' })
  const mdToMd = rename(dir, 'docs/a.md', 'docs/c.md')
  const verified = { [c0]: [{ event: 'push', verification: 'success' }] }
  assert.equal((await runMain(dir, { event: 'push', sha: mdToMd, records: verified })).result.skip, true, '.md → .md')

  const mdToTs = rename(dir, 'docs/b.md', 'src/b.ts')
  const onMdToMd = { [mdToMd]: [{ event: 'push', verification: 'success' }] }
  const added = await runMain(dir, { event: 'push', sha: mdToTs, records: onMdToMd })
  assert.equal(added.result.skip, false, '.md → .ts はコードの追加')
  assert.deepEqual(added.result.others, ['src/b.ts'])

  const tsToMd = rename(dir, 'src/a.ts', 'docs/a-code.md')
  const onMdToTs = { [mdToTs]: [{ event: 'push', verification: 'success' }] }
  const removed = await runMain(dir, { event: 'push', sha: tsToMd, records: onMdToTs })
  assert.equal(removed.result.skip, false, '.ts → .md はコードの削除')
  assert.deepEqual(removed.result.others, ['src/a.ts'])
})

test('main への push: Markdown の削除だけは省略する', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'docs/old.md': '# old\n' })
  const c1 = await commit(dir, { 'docs/old.md': null })
  const { result } = await runMain(dir, {
    event: 'push', sha: c1, records: { [c0]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, true)
})

test('最後のコミットが .md だけでも、前のコード変更の検証が失敗していれば、さらに前の成功から比べて実行する', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'src/a.ts': 'export const a = 2\n' }, 'code')
  const c2 = await commit(dir, { 'README.md': '# b\n' }, 'docs')
  const { result, summary } = await runMain(dir, {
    event: 'push', sha: c2,
    records: { [c0]: [{ event: 'push', verification: 'success' }], [c1]: [{ event: 'push', verification: 'failure' }] },
  })
  assert.equal(result.skip, false)
  assert.equal(result.base.sha, c0, '失敗した run を比較元にしない')
  assert.deepEqual(result.others, ['src/a.ts'])
  assert.ok(summary.includes(c1), '飛ばした候補も記録する')
})

test('最後のコミットが .md だけでも、前のコード変更の検証が未完了なら実行する', async () => {
  const dir = await repo()
  await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'src/a.ts': 'export const a = 2\n' }, 'code')
  const c2 = await commit(dir, { 'README.md': '# b\n' }, 'docs')
  const { result, summary } = await runMain(dir, {
    event: 'push', sha: c2, records: { [c1]: [{ event: 'push', verification: 'in_progress' }] },
  })
  assert.equal(result.skip, false)
  assert.equal(result.base, null)
  assert.match(summary, /実行中/)
})

test('最後のコミットが .md だけでも、前のコード変更の検証の記録が不明（run が無い・別の workflow・API 失敗・トークン無し）なら実行する', async () => {
  const dir = await repo()
  await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'src/a.ts': 'export const a = 2\n' }, 'code')
  const c2 = await commit(dir, { 'README.md': '# b\n' }, 'docs')

  assert.equal((await runMain(dir, { event: 'push', sha: c2, records: {} })).result.skip, false, 'run が無い')
  const otherWorkflow = { [c1]: [{ event: 'push', verification: 'success', workflow: '.github/workflows/other.yml' }] }
  assert.equal((await runMain(dir, { event: 'push', sha: c2, records: otherWorkflow })).result.skip, false, '別の workflow')
  const otherBranch = { [c1]: [{ event: 'push', branch: 'feature', verification: 'success' }] }
  assert.equal((await runMain(dir, { event: 'push', sha: c2, records: otherBranch })).result.skip, false, 'main 以外の push')
  const noToken = await runMain(dir, { event: 'push', sha: c2, records: { [c1]: [{ event: 'push', verification: 'success' }] }, token: null })
  assert.equal(noToken.result.skip, false, 'トークン無し')

  const env = {
    GITHUB_EVENT_NAME: 'push', GITHUB_SHA: c2, GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'o/r',
    GITHUB_API_URL: 'https://api.github.test', GITHUB_TOKEN: 'token',
  }
  const failing = async () => new Response('rate limited', { status: 403 })
  assert.equal((await main({ env, cwd: dir, fetch: failing, log: () => {} })).skip, false, 'API 失敗')
  const throwing = async () => { throw new Error('network down') }
  assert.equal((await main({ env, cwd: dir, fetch: throwing, log: () => {} })).skip, false, '通信の失敗')
})

test('省略したジョブ（Stryker を実行していない成功）は比較元にしない', async () => {
  const dir = await repo()
  await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(dir, { 'src/a.ts': 'export const a = 2\n' }, 'code')
  const c2 = await commit(dir, { 'README.md': '# b\n' }, 'docs')
  const { result } = await runMain(dir, {
    event: 'push', sha: c2, records: { [c1]: [{ event: 'push', verification: 'skipped' }] },
  })
  assert.equal(result.skip, false)
})

test('同じ SHA の成功記録（再実行）は比較元にしない', async () => {
  const dir = await repo()
  const c0 = await commit(dir, { 'src/a.ts': 'export const a = 1\n' })
  const { result } = await runMain(dir, {
    event: 'push', sha: c0, records: { [c0]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
})

test('比較不能（浅い履歴で比較元の候補を取得できない）なら実行する', async () => {
  const origin = await repo()
  const c0 = await commit(origin, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' })
  const c1 = await commit(origin, { 'README.md': '# b\n' })
  const shallow = await mkdtemp(path.join(os.tmpdir(), 'mutation-scope-shallow-'))
  temps.push(shallow)
  git(shallow, 'clone', '-q', '--depth', '1', `file://${origin}`, '.')
  const { result, summary } = await runMain(shallow, {
    event: 'push', sha: c1, records: { [c0]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
  assert.match(summary, /実行/)
})

/** main（base）と PR のブランチを作り、GitHub と同じく base に PR の head をマージしたコミットを返す。 */
async function pullRequest(dir, { prFiles, mainFilesAfterFork }) {
  const fork = await commit(dir, { 'src/a.ts': 'export const a = 1\n', 'README.md': '# a\n' }, 'fork')
  git(dir, 'checkout', '-q', '-b', 'feature')
  const heads = []
  for (const files of prFiles) heads.push(await commit(dir, files, 'pr'))
  git(dir, 'checkout', '-q', 'main')
  const baseSha = mainFilesAfterFork ? await commit(dir, mainFilesAfterFork, 'main') : fork
  git(dir, 'checkout', '-q', '--detach', baseSha)
  git(dir, 'merge', '-q', '--no-ff', '-m', 'merge', heads.at(-1))
  return { fork, heads, baseSha, merge: git(dir, 'rev-parse', 'HEAD') }
}

test('PR: コードを検証済みの PR へ README だけを追加修正したら、前の head の成功記録と比べて省略する', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, {
    prFiles: [{ 'src/a.ts': 'export const a = 2\n' }, { 'README.md': '# fixed\n' }],
  })
  const { result, summary } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[1], base: baseSha },
    records: { [heads[0]]: [{ event: 'pull_request', branch: 'feature', verification: 'success' }] },
  })
  assert.equal(result.skip, true)
  assert.equal(result.base.sha, heads[0])
  assert.ok(summary.includes(heads[1]), 'PR の head も記録する')
  assert.ok(summary.includes(merge), '対象（マージコミット）を記録する')
})

test('PR: 前の head の検証が実行中のうちに README だけを追加したら実行する', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, {
    prFiles: [{ 'src/a.ts': 'export const a = 2\n' }, { 'README.md': '# fixed\n' }],
  })
  const { result } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[1], base: baseSha },
    records: {
      [heads[0]]: [{ event: 'pull_request', branch: 'feature', verification: 'in_progress' }],
      [baseSha]: [{ event: 'push', verification: 'success' }],
    },
  })
  assert.equal(result.skip, false, 'base の成功記録まで遡ると PR のコードの変更が差分に入る')
  assert.deepEqual(result.others, ['src/a.ts'])
})

test('PR: 前の head の検証後に main へコードが入っていたら実行する', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, {
    prFiles: [{ 'src/a.ts': 'export const a = 2\n' }, { 'README.md': '# fixed\n' }],
    mainFilesAfterFork: { 'src/main-only.ts': 'export const m = 1\n' },
  })
  const { result } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[1], base: baseSha },
    records: { [heads[0]]: [{ event: 'pull_request', branch: 'feature', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
  assert.deepEqual(result.others, ['src/main-only.ts'])
})

test('PR: Markdown だけの PR は、base の main の成功記録と比べて省略する', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, { prFiles: [{ 'docs/spec.md': '# spec\n' }] })
  const { result } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[0], base: baseSha },
    records: { [baseSha]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, true)
  assert.equal(result.base.sha, baseSha)
})

test('PR: 最初の push（成功記録なし）はコードとの混在で実行する', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, {
    prFiles: [{ 'src/a.ts': 'export const a = 2\n', 'README.md': '# b\n' }],
  })
  const { result } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[0], base: baseSha },
    records: { [baseSha]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
  assert.deepEqual(result.others, ['src/a.ts'])
})

test('PR: base の main のコミットへの pull_request の記録や、PR の head への push の記録は比較元にしない', async () => {
  const dir = await repo()
  const { heads, baseSha, merge } = await pullRequest(dir, { prFiles: [{ 'docs/spec.md': '# spec\n' }] })
  const { result } = await runMain(dir, {
    event: 'pull_request', sha: merge, pr: { head: heads[0], base: baseSha },
    records: { [baseSha]: [{ event: 'pull_request', branch: 'other', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
})

test('シンボリックリンクの .md を追加した PR は実行する', async () => {
  const dir = await repo()
  const fork = await commit(dir, { 'src/a.ts': 'export const a = 1\n' })
  await symlink('../src/a.ts', path.join(dir, 'link.md'))
  git(dir, 'add', 'link.md')
  const c1 = await commit(dir, {})
  const { result } = await runMain(dir, {
    event: 'push', sha: c1, records: { [fork]: [{ event: 'push', verification: 'success' }] },
  })
  assert.equal(result.skip, false)
})
