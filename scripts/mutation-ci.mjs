// .md だけの差分を、過去の「全対象が成功した実行」から証明する。
// API・履歴・差分の取得に失敗した場合は全対象を実行する。
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const jobName = 'ミューテーションテスト（StrykerJS）'
const fullStep = '全対象のミューテーションテスト'
const shaPattern = /^[0-9a-f]{40}$/

export async function decideMutation(context, { api = githubApi } = {}) {
  const result = { run: true, event: context.event, target: context.target, head: context.head,
    from: null, record: null, reason: '全対象の成功記録を確認できないため実行' }
  const git = (...args) => execFileSync('git', args, {
    cwd: context.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
  const ensureCommit = (sha) => {
    if (!shaPattern.test(sha ?? '')) return false
    try { git('cat-file', '-e', `${sha}^{commit}`) } catch {
      try { git('fetch', '--no-tags', 'origin', sha) } catch { return false }
    }
    return true
  }
  const ancestor = (sha, tip) => {
    if (!ensureCommit(sha) || !ensureCommit(tip)) return false
    try { git('merge-base', '--is-ancestor', sha, tip); return true } catch { return false }
  }
  try {
    if (context.attempt > 1) return { ...result, reason: '同じSHAの再実行のため全対象を実行' }
    if (!['pull_request', 'push'].includes(context.event) || !ensureCommit(context.target)) return result
    const prefix = `repos/${context.repository}/actions`
    // 検索上限内で証明できなければ実行する。最新の失敗/未完了を成功記録と取り違えない。
    const { workflow_runs: runs } = await api(`${prefix}/workflows/ci.yml/runs?status=success&per_page=100`)
    for (const run of runs) {
      if (String(run.id) === String(context.runId) || run.status !== 'completed' || run.conclusion !== 'success') continue
      let eligible = false
      if (context.event === 'pull_request') {
        eligible = run.event === 'pull_request'
          ? run.pull_requests?.some(({ number }) => number === context.pr) && ancestor(run.head_sha, context.head)
          : run.event === 'push' && run.head_branch === (context.baseBranch ?? 'main') && ancestor(run.head_sha, context.base)
      } else {
        eligible = run.event === 'push' && run.head_branch === context.branch && ancestor(run.head_sha, context.before)
      }
      if (!eligible) continue
      const { jobs } = await api(`${prefix}/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
      const job = jobs.find(({ name }) => name === jobName)
      if (job?.conclusion !== 'success') continue
      const full = job.steps?.some(({ name, conclusion }) => name === fullStep && conclusion === 'success')
      const legacy = run.event === 'push' && job.steps?.some(({ name, conclusion }) => name === 'Run npm run test:mutation' && conclusion === 'success')
      if (!full && !legacy) continue
      let from
      if (full) {
        const { artifacts } = await api(`${prefix}/runs/${run.id}/artifacts?per_page=100`)
        const proof = artifacts.find(({ name, expired }) => !expired && new RegExp(`^mutation-verified-([0-9a-f]{40})-${run.run_attempt}$`).test(name))
        if (!proof) continue
        from = proof.name.split('-')[2]
      } else from = run.head_sha // 旧workflowのpushはcheckout SHAとhead SHAが一致する。
      if (!ensureCommit(from)) continue
      Object.assign(result, { from, record: run.html_url, job: job.html_url,
        range: `${from}..${context.target}` })
      // 同じSHAの再実行を省略の成功で置き換えない。
      if (from === context.target) return { ...result, reason: '同じSHAの再実行のため全対象を実行' }
      // -z で空白/改行入りパスも区別し、改名・コピーは両端を確認する。
      const fields = git('diff', '--name-status', '-z', '--find-renames', from, context.target, '--').split('\0')
      fields.pop()
      const files = []
      while (fields.length) {
        const status = fields.shift()
        if (!/^[AMDT]$|^[RC]\d+$/.test(status)) throw new Error('差分の状態を解釈できません')
        const count = /^[RC]/.test(status) ? 2 : 1
        if (fields.length < count) throw new Error('差分のパスが欠落しています')
        files.push(...fields.splice(0, count))
      }
      if (files.some((file) => !file.endsWith('.md'))) {
        Object.assign(result, { files, reason: 'Markdown以外の変更を含むため全対象を実行' })
        // 別の成功地点（検証済みPRなど）からなら証明できる場合もある。
        continue
      }
      return { ...result, files, run: false, reason: files.length ? '検証済みの比較元からMarkdownだけの変更のため省略' : '検証済みの比較元と差分なしのため省略' }
    }
    return result
  } catch (error) {
    return { ...result, run: true, reason: `比較不能のため全対象を実行: ${error.message}` }
  }
}

function githubApi(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
}

async function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const pr = event.pull_request
  const result = await decideMutation({ cwd: process.cwd(), repository: process.env.GITHUB_REPOSITORY,
    event: process.env.GITHUB_EVENT_NAME, target: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    head: pr?.head.sha ?? process.env.GITHUB_SHA, base: pr?.base.sha, baseBranch: pr?.base.ref,
    before: event.before, branch: process.env.GITHUB_REF_NAME, pr: event.number })
  const text = `## ミューテーションの実行判定\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`
  console.log(text)
  mkdirSync('mutation-artifacts', { recursive: true })
  writeFileSync('mutation-artifacts/ci-decision.json', `${JSON.stringify(result, null, 2)}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${result.run}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main()
