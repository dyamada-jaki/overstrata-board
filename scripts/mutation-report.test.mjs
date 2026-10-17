import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatSummary, summarizeReport } from './mutation-report.mjs'

// Stryker の JSON レポート（mutation-testing-report-schema）の必要な項目だけを持つ例。
function mutant(status, line, extra = {}) {
  return {
    id: `${status}-${line}`,
    mutatorName: 'EqualityOperator',
    replacement: 'a < b',
    status,
    location: { start: { line, column: 3 }, end: { line, column: 9 } },
    testsCompleted: status === 'NoCoverage' || status === 'CompileError' ? undefined : 2,
    ...extra,
  }
}

function report(files) {
  return {
    schemaVersion: '1.0',
    files: Object.fromEntries(Object.entries(files).map(([name, mutants]) => [name, { mutants }])),
  }
}

const expected = ['src/a.ts', 'src/b.ts']

test('ファイル別・合計の状態別件数を数え、Killed と Timeout を分ける', () => {
  const summary = summarizeReport(report({
    'src/a.ts': [mutant('Killed', 1), mutant('Killed', 2), mutant('Timeout', 3), mutant('Survived', 4)],
    'src/b.ts': [mutant('NoCoverage', 1), mutant('CompileError', 2), mutant('RuntimeError', 3), mutant('Ignored', 4)],
  }), expected)

  assert.deepEqual(summary.problems, [])
  assert.deepEqual(summary.files.map(({ file, counts }) => [file, counts.Killed, counts.Timeout, counts.Survived]),
    [['src/a.ts', 2, 1, 1], ['src/b.ts', 0, 0, 0]])
  assert.equal(summary.totals.Killed, 2)
  assert.equal(summary.totals.Timeout, 1)
  assert.equal(summary.totals.Survived, 1)
  assert.equal(summary.totals.NoCoverage, 1)
  assert.equal(summary.totals.CompileError, 1)
  assert.equal(summary.totals.RuntimeError, 1)
  assert.equal(summary.totals.Ignored, 1)
  // スコアは Stryker と同じ（Killed+Timeout）/（Killed+Timeout+Survived+NoCoverage）。
  // エラー・除外は分母にも検出にも入れない。
  assert.equal(summary.totals.valid, 5)
  assert.equal(summary.totals.score, 60)
  assert.equal(summary.totals.killedOnly, 40)
})

test('Survived と NoCoverage を位置付きで一覧にする', () => {
  const summary = summarizeReport(report({
    'src/a.ts': [mutant('Killed', 1), mutant('Survived', 4)],
    'src/b.ts': [mutant('NoCoverage', 7)],
  }), expected)

  assert.deepEqual(summary.survivors.map(({ file, line, status }) => [file, line, status]),
    [['src/a.ts', 4, 'Survived'], ['src/b.ts', 7, 'NoCoverage']])
})

test('JSON レポートが無ければ失敗にする', () => {
  assert.match(summarizeReport(null, expected).problems.join('\n'), /JSON/)
})

test('変異が1件も無ければ失敗にする', () => {
  const summary = summarizeReport(report({}), [])
  assert.notDeepEqual(summary.problems, [])
})

test('設定した対象ファイルがレポートに無い、または変異0件なら失敗にする', () => {
  const missing = summarizeReport(report({ 'src/a.ts': [mutant('Killed', 1)] }), expected)
  assert.match(missing.problems.join('\n'), /src\/b\.ts/)

  const empty = summarizeReport(report({ 'src/a.ts': [mutant('Killed', 1)], 'src/b.ts': [] }), expected)
  assert.match(empty.problems.join('\n'), /src\/b\.ts/)
})

test('テストが1件も実行されずに Survived になった変異は実行障害として失敗にする', () => {
  const summary = summarizeReport(report({
    'src/a.ts': [mutant('Killed', 1)],
    'src/b.ts': [mutant('Survived', 12, { testsCompleted: 0 })],
  }), expected)
  assert.match(summary.problems.join('\n'), /src\/b\.ts:12/)
})

test('テストで検証された変異が無ければ失敗にする', () => {
  const summary = summarizeReport(report({
    'src/a.ts': [mutant('CompileError', 1)],
    'src/b.ts': [mutant('Ignored', 1)],
  }), expected)
  assert.notDeepEqual(summary.problems, [])
})

test('未完了の変異（Pending）が残れば失敗にする', () => {
  const summary = summarizeReport(report({
    'src/a.ts': [mutant('Killed', 1)],
    'src/b.ts': [mutant('Pending', 2)],
  }), expected)
  assert.match(summary.problems.join('\n'), /Pending/)
})

test('要約に対象ごとの Killed・Timeout の列、生き残り、問題を出す', () => {
  const text = formatSummary(summarizeReport(report({
    'src/a.ts': [mutant('Killed', 1), mutant('Timeout', 2), mutant('Survived', 4)],
  }), expected))

  assert.match(text, /Killed/)
  assert.match(text, /Timeout/)
  assert.match(text, /src\/a\.ts/)
  assert.match(text, /src\/a\.ts:4/)
  assert.match(text, /src\/b\.ts/)
})
