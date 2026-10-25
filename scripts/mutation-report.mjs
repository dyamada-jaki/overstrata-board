// Stryker の JSON レポートを状態別に集計し、検出結果として扱えない実行を見つける。

export const statuses = [
  'Killed', 'Timeout', 'Survived', 'NoCoverage',
  'CompileError', 'RuntimeError', 'Ignored', 'Pending',
]

function countStatuses(mutants) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]))
  for (const { status } of mutants) counts[status] = (counts[status] ?? 0) + 1
  return counts
}

function percent(part, whole) {
  return whole === 0 ? null : Math.round((part / whole) * 10000) / 100
}

/**
 * 状態別の件数と、Survived/NoCoverage の一覧、失敗として扱う問題を返す。
 * スコアは Stryker と同じく（Killed+Timeout）/（Killed+Timeout+Survived+NoCoverage）。
 */
export function summarizeReport(report, expectedFiles) {
  const problems = []
  if (!report?.files) {
    return { files: [], totals: {}, statics: {}, survivors: [], problems: ['JSON レポートがありません'] }
  }

  const entries = Object.entries(report.files)
  const files = entries.map(([file, { mutants }]) => ({ file, counts: countStatuses(mutants) }))
  const all = entries.flatMap(([file, { mutants }]) => mutants.map((mutant) => ({ file, ...mutant })))
  const totals = countStatuses(all)
  totals.mutants = all.length
  totals.valid = totals.Killed + totals.Timeout + totals.Survived + totals.NoCoverage
  totals.score = percent(totals.Killed + totals.Timeout, totals.valid)
  totals.killedOnly = percent(totals.Killed, totals.valid)
  // static（読み込み時に決まる値）の変異は、変異ごとに全テストを実行するため時間がかかる。件数を別に出す。
  const statics = countStatuses(all.filter((mutant) => mutant.static))
  statics.mutants = all.filter((mutant) => mutant.static).length

  for (const file of expectedFiles) {
    if (!(file in report.files)) problems.push(`${file}: 対象ファイルがレポートにありません`)
    else if (report.files[file].mutants.length === 0) problems.push(`${file}: 変異が0件です`)
  }
  if (all.length === 0) problems.push('変異が1件もありません')
  else if (totals.Killed + totals.Timeout + totals.Survived === 0) {
    problems.push('テストで検証された変異が1件もありません')
  }
  for (const mutant of all) {
    const where = `${mutant.file}:${mutant.location.start.line}`
    if (mutant.status === 'Survived' && mutant.testsCompleted === 0) {
      problems.push(`${where}: テストが1件も実行されないまま Survived になりました（実行障害）`)
    }
    if (mutant.status === 'Pending') problems.push(`${where}: Pending のまま完了していません`)
  }

  const survivors = all
    .filter(({ status }) => status === 'Survived' || status === 'NoCoverage')
    .map(({ file, location, mutatorName, replacement, status }) => ({
      file, line: location.start.line, column: location.start.column, mutatorName, replacement, status,
    }))

  return { files, totals, statics, survivors, problems }
}

/** 端末と GitHub の Job Summary に出す Markdown。 */
export function formatSummary({ files, totals, statics = {}, survivors, problems }, expectedFiles = []) {
  const head = ['対象', ...statuses]
  const row = (name, counts) => `| ${[name, ...statuses.map((status) => counts[status] ?? 0)].join(' | ')} |`
  const listed = new Set(files.map(({ file }) => file))
  const lines = [
    '## ミューテーションテスト',
    '',
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...files.map(({ file, counts }) => row(file, counts)),
    ...expectedFiles.filter((file) => !listed.has(file)).map((file) => row(`${file}（レポートに無し）`, {})),
    row('合計', totals),
    '',
    `スコア（Killed+Timeout）: ${totals.score ?? '-'}% / Killed のみ: ${totals.killedOnly ?? '-'}%`
      + `（分母 ${totals.valid ?? 0}件。CompileError・RuntimeError・Ignored は含めない）`,
    `static（読み込み時に決まる値）の変異: ${statics.mutants ?? 0}件`
      + `（${statuses.filter((status) => statics[status] > 0).map((status) => `${status} ${statics[status]}`).join(' / ') || '-'}）`,
  ]
  if (survivors.length > 0) {
    lines.push('', '### Survived / NoCoverage（分類が必要）', '')
    for (const { file, line, column, mutatorName, replacement, status } of survivors) {
      lines.push(`- ${file}:${line}:${column} ${status} ${mutatorName} → \`${replacement}\``)
    }
  }
  if (problems.length > 0) {
    lines.push('', '### 失敗として扱う問題', '', ...problems.map((problem) => `- ${problem}`))
  }
  return `${lines.join('\n')}\n`
}
