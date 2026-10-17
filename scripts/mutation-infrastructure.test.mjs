import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { applyCompatibilityFix } from './stryker-compat.mjs'
import { validateMutationReport } from './mutation-report.mjs'

const files = [
  '@stryker-mutator/vitest-runner/dist/src/test-helpers.js',
  '@stryker-mutator/vitest-runner/dist/src/stryker-setup.js',
  '@stryker-mutator/instrumenter/dist/src/util/syntax-helpers.js',
]
const hash = (value) => createHash('sha256').update(value).digest('hex')
function installation(t) {
  const root = mkdtempSync(join(tmpdir(), 'overstrata-compat-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const pkg of ['vitest', '@stryker-mutator/core', '@stryker-mutator/vitest-runner', '@stryker-mutator/instrumenter']) {
    const destination = join(root, 'node_modules', pkg, 'package.json')
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(join('node_modules', pkg, 'package.json'), destination)
  }
  for (const file of files) {
    const destination = join(root, 'node_modules', file)
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(join('node_modules', file), destination)
  }
  return root
}

test('互換処理は両方の名前連結とasの実行式を直し、再適用しても同じ内容になる', (t) => {
  const root = installation(t)
  const result = applyCompatibilityFix(root)
  assert.equal(result.length, 3)
  for (const file of files.slice(0, 2)) {
    assert.match(readFileSync(join(root, 'node_modules', file), 'utf8'), /join\(' > '\)/)
  }
  const helper = readFileSync(join(root, 'node_modules', files[2]), 'utf8')
  assert.match(helper, /path\.isTSType\(\)/)
  assert.doesNotMatch(helper, /'TSAsExpression'/)
  const before = files.map((file) => hash(readFileSync(join(root, 'node_modules', file))))
  applyCompatibilityFix(root)
  assert.deepEqual(files.map((file) => hash(readFileSync(join(root, 'node_modules', file)))), before)
})

test('未知の配布内容を拒否し、照合途中に他の依存を書き換えない', (t) => {
  const root = installation(t)
  const first = join(root, 'node_modules', files[0])
  const last = join(root, 'node_modules', files[2])
  writeFileSync(last, readFileSync(last, 'utf8') + '\n// unknown build\n')
  const before = readFileSync(first, 'utf8')
  assert.throws(() => applyCompatibilityFix(root), /SHA256/)
  assert.equal(readFileSync(first, 'utf8'), before)
})

test('実際のVitest/Strykerの版が変わったら互換処理を拒否する', (t) => {
  const root = installation(t)
  writeFileSync(join(root, 'node_modules/vitest/package.json'), '{"version":"6.0.0"}')
  assert.throws(() => applyCompatibilityFix(root), /Vitest/)
  cpSync('node_modules/vitest/package.json', join(root, 'node_modules/vitest/package.json'))
  writeFileSync(join(root, 'node_modules/@stryker-mutator/core/package.json'), '{"version":"10.0.1"}')
  assert.throws(() => applyCompatibilityFix(root), /10\.0\.0/)
})

test('worktree外へ向くnode_modulesのsymlinkを拒否する', (t) => {
  const root = installation(t)
  const outside = mkdtempSync(join(tmpdir(), 'overstrata-outside-test-'))
  t.after(() => rmSync(outside, { recursive: true, force: true }))
  const pkg = join(root, 'node_modules/@stryker-mutator/vitest-runner')
  cpSync(pkg, join(outside, 'runner'), { recursive: true })
  rmSync(pkg, { recursive: true })
  symlinkSync(join(outside, 'runner'), pkg)
  const before = readFileSync(join(outside, 'runner/dist/src/test-helpers.js'), 'utf8')
  assert.throws(() => applyCompatibilityFix(root), /worktree/)
  assert.equal(readFileSync(join(outside, 'runner/dist/src/test-helpers.js'), 'utf8'), before)
})

const report = (mutants) => ({ files: { 'src/a.ts': { mutants } } })
test('状態を混ぜず集計し、型エラーやTimeoutをKilledに含めない', () => {
  assert.deepEqual(validateMutationReport(report([
    { status: 'Killed', testsCompleted: 1 }, { status: 'Timeout' },
    { status: 'CompileError' }, { status: 'Survived', testsCompleted: 2, coveredBy: ['a'] },
    { status: 'NoCoverage' },
  ]), ['src/a.ts']), { Killed: 1, Timeout: 1, CompileError: 1, Survived: 1, NoCoverage: 1 })
})
test('変異0件や設定した対象ファイルの欠落は成功扱いしない', () => {
  assert.throws(() => validateMutationReport(report([]), ['src/a.ts']), /変異.*0|空/)
  assert.throws(() => validateMutationReport(report([{ status: 'Killed', testsCompleted: 1 }]), ['src/a.ts', 'src/b.ts']), /src\/b\.ts/)
})
test('coveredByがあるのに0テストで生存した変異と未完了をツール異常にする', () => {
  assert.throws(() => validateMutationReport(report([{ id: '17', status: 'Survived', testsCompleted: 0, coveredBy: ['a'] }]), ['src/a.ts']), /17.*テスト|テスト.*17/)
  assert.throws(() => validateMutationReport(report([{ status: 'Pending' }]), ['src/a.ts']), /Pending/)
})
