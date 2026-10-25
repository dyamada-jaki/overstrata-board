// ミューテーションテストの並列数。既定値は2で、環境変数 MUTATION_CONCURRENCY で変えられる（CI は2を明示）。
// stryker.config.mjs（Stryker に渡す値）と scripts/mutation.mjs（ログと実際の割り当ての照合）が使う。

export const defaultConcurrency = 2

/** 環境変数から並列数を決める。`CI=true` では切り替えない（開発コンテナや人が設定しうるため）。 */
export function resolveConcurrency(env) {
  const value = env.MUTATION_CONCURRENCY
  if (value === undefined || value === '') return { concurrency: defaultConcurrency, source: '既定値' }
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`MUTATION_CONCURRENCY は1以上の整数にしてください（指定: ${JSON.stringify(value)}）`)
  }
  return { concurrency: Number(value), source: 'MUTATION_CONCURRENCY' }
}

/**
 * checker（TypeScript の型チェック）を使うときの Stryker 10 の割り当て。
 * @stryker-mutator/core の ConcurrencyTokenProvider と同じく、checker は半分を切り上げ、test runner は切り捨てる。
 */
export function allocate(concurrency) {
  return {
    checkers: Math.max(Math.ceil(concurrency / 2), 1),
    testRunners: Math.max(Math.floor(concurrency / 2), 1),
  }
}

/** Stryker のログの `Creating N checker process(es) and M test runner process(es).` を読む。無ければ null。 */
export function readAllocation(log) {
  const match = log.match(/Creating (\d+) checker process\(es\) and (\d+) test runner process\(es\)/)
  return match ? { checkers: Number(match[1]), testRunners: Number(match[2]) } : null
}
