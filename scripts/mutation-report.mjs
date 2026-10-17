export function validateMutationReport(report, expectedFiles) {
  const counts = {}
  for (const file of expectedFiles) {
    const mutants = report.files?.[file]?.mutants
    if (!mutants?.length) throw new Error(`${file}: 対象が欠落または変異が0件です`)
  }
  for (const [file, result] of Object.entries(report.files ?? {})) {
    for (const mutant of result.mutants) {
      if (mutant.status === 'Pending') throw new Error(`${file}: Pendingの変異が残っています`)
      if (mutant.status === 'Survived' && mutant.testsCompleted === 0 && mutant.coveredBy?.length) {
        throw new Error(`${file} #${mutant.id}: 対象テストが0件です。既存テスト不足と分類せずrunnerを調査してください`)
      }
      counts[mutant.status] = (counts[mutant.status] ?? 0) + 1
    }
  }
  if (!Object.values(counts).some((count) => count > 0)) throw new Error('変異が0件です')
  return counts
}
