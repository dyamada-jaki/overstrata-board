// CI のミューテーションテストを省略してよいかを判定する（.github/workflows/ci.yml のミューテーションのジョブの最初に実行）。
// 比較元 = 対象より前のコミットのうち、全対象のミューテーション（npm run test:mutation の step）が成功した最も近いもの。
// 比較元から対象までの差分が Markdown だけのときだけ省略する。判定できないとき・エラーのときは必ず実行にする。
// 手元の npm run test:mutation は使わない（手元では常に全対象を実行する）。
import { spawnSync } from 'node:child_process'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workflowPath = '.github/workflows/ci.yml'
// ci.yml のミューテーションのジョブの name と、全対象を実行する step の名前（GitHub が `run` から付ける名前）。
export const jobName = 'ミューテーションテスト（StrykerJS）'
const stepName = 'Run npm run test:mutation'
// 比較元を探す候補の数（PR の head 側・main 側それぞれ）。
const maxCandidates = 30
const regularModes = new Set(['100644', '100755'])

const stateLabels = {
  success: '全対象が成功',
  failure: '失敗',
  cancelled: 'キャンセル',
  skipped: '省略（全対象を実行していない）',
  in_progress: '実行中（未完了）',
  unknown: '不明（ジョブ・step の記録なし）',
  none: 'run なし',
}

/** `git diff --raw -z --no-renames` の出力を `{ srcMode, dstMode, status, path }` の一覧にする。 */
export function parseRawDiff(output) {
  const tokens = output.split('\0')
  const entries = []
  for (let i = 0; i < tokens.length; i += 1) {
    if (!tokens[i].startsWith(':')) continue
    const [srcMode, dstMode, , , status] = tokens[i].slice(1).split(' ')
    entries.push({ srcMode, dstMode, status, path: tokens[i + 1] })
    i += 1
  }
  return entries
}

/** 通常のファイルの `.md` の追加・変更・削除だけを Markdown の変更とみなす。改名は削除と追加に分けて判定する。 */
function isMarkdown({ status, path: file, srcMode, dstMode }) {
  if (!file.endsWith('.md')) return false
  if (status === 'A') return srcMode === '000000' && regularModes.has(dstMode)
  if (status === 'D') return regularModes.has(srcMode) && dstMode === '000000'
  if (status === 'M') return regularModes.has(srcMode) && regularModes.has(dstMode)
  return false
}

/**
 * 省略するか実行するかを決める。
 * base: 比較元（全対象の成功記録があるコミット）。entries: 比較元から対象までの差分。diffError: 差分を取得できなかった理由。
 */
export function decide({ event, base, entries, diffError }) {
  if (event !== 'push' && event !== 'pull_request') {
    return { skip: false, reason: `対象外のイベント（${event ?? '不明'}）なので実行する`, others: [] }
  }
  if (!base) {
    return { skip: false, reason: '比較元の成功記録（全対象のミューテーションの成功）が見つからないので実行する', others: [] }
  }
  if (diffError || !entries) {
    return { skip: false, reason: `比較元との差分を取得できない（比較不能）ので実行する: ${diffError ?? '不明'}`, others: [] }
  }
  const others = [...new Set(entries.filter((entry) => !isMarkdown(entry)).map((entry) => entry.path))]
  if (others.length > 0) return { skip: false, reason: 'Markdown 以外の変更を含むので実行する', others }
  if (entries.length === 0) return { skip: true, reason: '比較元と差分なし（同じ内容）なので省略する', others }
  return { skip: true, reason: '比較元からの変更が Markdown だけなので省略する', others }
}

/** run の最新 attempt のジョブ一覧から、全対象のミューテーションの結果を読む。成功は 'success' だけ。 */
export function verificationOf(jobs) {
  const job = jobs.find(({ name }) => name === jobName)
  if (!job) return 'unknown'
  if (job.status !== 'completed') return 'in_progress'
  const step = job.steps?.find(({ name }) => name === stepName)
  if (!step) return 'unknown'
  if (step.status !== 'completed') return 'in_progress'
  return step.conclusion ?? 'unknown'
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${(result.stderr || result.error?.message || '').trim()}`)
  return result.stdout
}

function revList(cwd, ...revs) {
  return git(cwd, ['rev-list', '--first-parent', `--max-count=${maxCandidates}`, ...revs]).split('\n').filter(Boolean)
}

/** 比較元の候補を近い順に返す。対象自身（同じ SHA の再実行）は含めない。 */
function candidatesOf(cwd, { event, target, head, baseSha }) {
  if (event === 'push') {
    return revList(cwd, `${target}^`).map((sha) => ({ sha, event: 'push' }))
  }
  // PR: 以前に push した PR の head（pull_request の run）→ base の main（push の run）の順。
  const heads = revList(cwd, head, `^${baseSha}`).filter((sha) => sha !== head)
  return [
    ...heads.map((sha) => ({ sha, event: 'pull_request' })),
    ...revList(cwd, baseSha).map((sha) => ({ sha, event: 'push' })),
  ]
}

async function findBase({ candidates, env, fetch, checked }) {
  const api = `${env.GITHUB_API_URL ?? 'https://api.github.com'}/repos/${env.GITHUB_REPOSITORY}`
  const request = async (url) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${url}`)
    return response.json()
  }
  for (const { sha, event } of candidates) {
    const { workflow_runs: runs } = await request(`${api}/actions/runs?head_sha=${sha}&event=${event}&per_page=20`)
    const latest = runs
      .filter((run) => run.path === workflowPath && (event !== 'push' || run.head_branch === 'main'))
      .sort((a, b) => b.id - a.id)[0]
    if (!latest) {
      checked.push({ sha, event, state: 'none' })
      continue
    }
    // 同じ SHA に複数の run があるときは最新の run だけで判断する（後の再実行の失敗を見落とさない）。
    const { jobs } = await request(`${api}/actions/runs/${latest.id}/jobs?filter=latest&per_page=100`)
    const state = verificationOf(jobs)
    checked.push({ sha, event, state, runUrl: latest.html_url })
    if (state === 'success') return { sha, event, runUrl: latest.html_url }
  }
  return null
}

function formatRecord(record) {
  const { skip, reason, event, target, head, baseSha, base, checked, entries, others, notes } = record
  const lines = [
    '## ミューテーションテストの実行範囲',
    '',
    `- 判定: **${skip ? '省略' : '実行'}**${skip ? '（全対象のミューテーションを実行しない）' : '（全対象を実行する）'}`,
    `- 理由: ${reason}`,
    `- イベント: ${event ?? '不明'}`,
    `- 対象 SHA（チェックアウトしたコミット）: ${target ?? '不明'}`,
  ]
  if (head) lines.push(`- PR の head: ${head}・base: ${baseSha}`)
  lines.push(base
    ? `- 比較元: ${base.sha}（${base.event} の全対象の成功記録: ${base.runUrl}）`
    : '- 比較元: なし')
  if (base && target) lines.push(`- 比較範囲: \`${base.sha}..${target}\``)
  for (const note of notes) lines.push(`- 補足: ${note}`)
  if (checked.length > 0) {
    lines.push('', '### 確かめた比較元の候補（近い順）', '')
    for (const { sha, event: kind, state, runUrl } of checked) {
      lines.push(`- ${sha}（${kind}）: ${stateLabels[state] ?? state}${runUrl ? ` ${runUrl}` : ''}`)
    }
  }
  if (entries) {
    lines.push('', `### 比較元からの変更（${entries.length}件）`, '')
    for (const { status, path: file } of entries.slice(0, 100)) lines.push(`- ${status} ${file}`)
    if (entries.length > 100) lines.push(`- ほか ${entries.length - 100}件`)
  }
  if (others.length > 0) {
    lines.push('', '### Markdown 以外の変更', '', ...others.slice(0, 100).map((file) => `- ${file}`))
  }
  return `${lines.join('\n')}\n`
}

/**
 * GitHub Actions の環境変数から判定し、GITHUB_OUTPUT に `skip=true|false`、Job Summary に記録を書く。
 * 例外は投げず、判定できないときは実行（skip=false）にする。
 */
export async function main({ env = process.env, cwd = process.cwd(), fetch = globalThis.fetch, log = console.log } = {}) {
  const record = { event: env.GITHUB_EVENT_NAME, target: env.GITHUB_SHA, checked: [], notes: [], others: [] }
  let base = null
  let entries = null
  let diffError = null
  try {
    if (record.event === 'push' && env.GITHUB_REF !== 'refs/heads/main') {
      record.event = `push（${env.GITHUB_REF ?? '不明'}）`
    }
    if (record.event === 'pull_request') {
      const payload = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'))
      record.head = payload.pull_request.head.sha
      record.baseSha = payload.pull_request.base.sha
    }
    if (record.event === 'push' || record.event === 'pull_request') {
      if (!env.GITHUB_TOKEN) {
        record.notes.push('GITHUB_TOKEN が無いので成功記録を確認できない')
      } else {
        const candidates = candidatesOf(cwd, { event: record.event, target: record.target, head: record.head, baseSha: record.baseSha })
        base = await findBase({ candidates, env, fetch, checked: record.checked })
      }
    }
  } catch (error) {
    record.notes.push(`比較元を確かめられない: ${error instanceof Error ? error.message : error}`)
    base = null
  }
  if (base) {
    try {
      entries = parseRawDiff(git(cwd, ['diff', '--raw', '-z', '--no-renames', '--no-abbrev', base.sha, record.target]))
    } catch (error) {
      diffError = error instanceof Error ? error.message : String(error)
    }
  }

  const decision = decide({ event: record.event, base, entries, diffError })
  Object.assign(record, decision, { base, entries })
  const text = formatRecord(record)
  log(text)
  log(`::notice title=ミューテーションテストの${record.skip ? '省略' : '実行'}::${record.reason}`
    + `${base ? `（比較元 ${base.sha.slice(0, 7)}）` : ''}`)
  try {
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `skip=${record.skip}\n`)
    if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, text)
  } catch (error) {
    // skip の出力が書けなければ、ci.yml の条件（skip != 'true'）で実行になる。
    log(`記録を書き込めない: ${error instanceof Error ? error.message : error}`)
  }
  return { ...record, text }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const { text } = await main({ cwd: root })
  // 省略したときも、成功・失敗にかかわらず保存する mutation-artifacts に判定を残す。
  await mkdir(path.join(root, 'mutation-artifacts'), { recursive: true })
  await writeFile(path.join(root, 'mutation-artifacts', 'scope.md'), text)
}
