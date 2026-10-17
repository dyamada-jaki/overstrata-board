// Explicit initial scope: rules/constants, coordinates, and the real UI selection state.
// Tests, CSS, type-only declarations, sample scaffolding, App text/main and infrastructure
// are not mutation targets. No operator exclusions or dashboard reporter are used.
export const mutationTargets = [
  'src/domain/movement.ts',
  'src/data/movement.ts',
  'src/domain/board.ts',
  'src/data/board.ts',
  'src/components/Board.tsx',
]
export function makeConfig(runDirectory) {
  return {
    testRunner: 'vitest',
    vitest: { configFile: 'vite.config.ts', related: true },
    mutate: mutationTargets,
    checkers: ['typescript'],
    tsconfigFile: 'tsconfig.app.json',
    typescriptChecker: { prioritizePerformanceOverAccuracy: false },
    concurrency: 1, // runner 10 additionally forces Vitest maxWorkers/maxConcurrency to 1.
    inPlace: false,
    allowEmpty: false,
    incremental: false,
    ignoreStatic: false,
    reporters: ['clear-text', 'progress', 'html', 'json'],
    htmlReporter: { fileName: `${runDirectory}/mutation.html` },
    jsonReporter: { fileName: `${runDirectory}/mutation.json` },
    tempDirName: `${runDirectory}/sandbox`,
    ignorePatterns: ['mutation-artifacts/**', '.agents/**', '.claude/**', '.env', 'docs/**', 'dist/**', 'e2e-artifacts/**', 'playwright-report/**', 'test-results/**'],
    thresholds: { high: 80, low: 60, break: null }, // Colors only; no score-based failure.
  }
}
export default makeConfig(process.env.MUTATION_RUN_DIR ?? 'mutation-artifacts/manual')
