import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allocate, readAllocation, resolveConcurrency } from './mutation-concurrency.mjs'

test('MUTATION_CONCURRENCY が無ければ手元の既定値2にする', () => {
  assert.deepEqual(resolveConcurrency({}), { concurrency: 2, source: '既定値' })
  assert.deepEqual(resolveConcurrency({ MUTATION_CONCURRENCY: '' }), { concurrency: 2, source: '既定値' })
})

test('MUTATION_CONCURRENCY があればその値にする（CI で使う）', () => {
  assert.deepEqual(resolveConcurrency({ MUTATION_CONCURRENCY: '4' }), { concurrency: 4, source: 'MUTATION_CONCURRENCY' })
  assert.deepEqual(resolveConcurrency({ MUTATION_CONCURRENCY: '1' }), { concurrency: 1, source: 'MUTATION_CONCURRENCY' })
})

test('CI=true だけでは並列数を変えない', () => {
  assert.equal(resolveConcurrency({ CI: 'true' }).concurrency, 2)
})

test('正の整数でない値はエラーにする', () => {
  for (const value of ['0', '-1', '2.5', 'abc', '4x', ' 4']) {
    assert.throws(() => resolveConcurrency({ MUTATION_CONCURRENCY: value }), /MUTATION_CONCURRENCY/, value)
  }
})

test('checker を使うときの Stryker の割り当て（checker は切り上げ、test runner は切り捨て）', () => {
  assert.deepEqual(allocate(1), { checkers: 1, testRunners: 1 })
  assert.deepEqual(allocate(2), { checkers: 1, testRunners: 1 })
  assert.deepEqual(allocate(4), { checkers: 2, testRunners: 2 })
  assert.deepEqual(allocate(5), { checkers: 3, testRunners: 2 })
  assert.deepEqual(allocate(6), { checkers: 3, testRunners: 3 })
})

test('Stryker のログから実際の checker・test runner の数を読む', () => {
  const log = [
    '10:42:23 (3125) INFO ProjectReader Found 11 of 61 file(s) to be mutated.',
    '\u001b[32m10:42:24 (3125) INFO ConcurrencyTokenProvider\u001b[39m Creating 2 checker process(es) and 2 test runner process(es).',
  ].join('\n')
  assert.deepEqual(readAllocation(log), { checkers: 2, testRunners: 2 })
  assert.equal(readAllocation('Creating 4 test runner process(es).'), null)
  assert.equal(readAllocation(''), null)
})
