// ミューテーションテスト（StrykerJS）の設定。実行は `npm run test:mutation`（scripts/mutation.mjs）から行う。
// 対象・除外の考え方は docs/testing.md 7章、結果の読み方は README を参照。
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // 初期の変異対象。glob を使わずファイルを明示し、scripts/mutation.mjs が全ファイルの計測を確かめる。
  mutate: [
    'src/domain/movement.ts', // 距離・移動力・移動範囲の境界と占有判定（spec.md 2.3・3.1・3.2）
    'src/data/movement.ts', // 移動力の基本値と装備補正
    'src/domain/board.ts', // 内部座標と表示座標の変換、盤面の座標一覧（spec.md 2.1）
    'src/data/board.ts', // 盤面サイズ
    'src/components/Board.tsx', // マス・キャラの選択表示、移動範囲の表示、座標ラベル（spec.md 2.1・2.3）
    'src/domain/selection.ts', // 未選択・マス・キャラの選択の状態変化と移動、未配置の駒の配置（spec.md 2.1・2.2・2.3）
    'src/domain/battle.ts', // 駒の数の境界、駒の用意、一覧の駒の選択、確定の条件（spec.md 2.2）
    'src/data/battle.ts', // 駒の移動力と1陣営の最大数。数値は変異しないため、仕様例のテストで確かめる
    'src/components/BattleScreen.tsx', // 数の入力と案内、未配置一覧、確定・やり直しの表示と確認（spec.md 2.2）
  ],
  // 対象外: テスト（*.test.*・src/test/）、CSS、型だけの宣言（src/domain/character.ts など）、生成物、雛形 src/domain/sample.ts、
  // 文言と受け渡しだけの src/App.tsx、起動処理の src/main.tsx、開発基盤（scripts/・e2e/・docker/）。

  testRunner: 'vitest',
  // 既存の vite.config.ts（jsdom・setup）で、実物の部品・状態・domain を使う既存テストをそのまま実行する。
  // 初期実行では関連ファイルに絞らず全テストを実行する。
  vitest: { configFile: 'vite.config.ts', related: false },
  // 型として成立しない変異を CompileError に分け、テストによる検出に数えない。
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.app.json',

  // サンドボックスへのコピーが不要なもの。.agents はディレクトリへのシンボリックリンクでコピーに失敗する。
  ignorePatterns: [
    '.agents', '.claude', '.github', 'docs', 'docker', 'e2e', 'scripts',
    'dist', 'e2e-artifacts', 'mutation-artifacts', 'playwright-report', 'test-results',
  ],
  tempDirName: '.stryker-tmp',
  // 他の作業と同時に動かすため、テスト実行プロセスを2つに固定する。
  concurrency: 2,
  incremental: false,

  reporters: ['html', 'json', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/mutation.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  // debug 以上は vitest-runner 10.0.0 の初期化で失敗するため info にする。
  fileLogLevel: 'info',
  // 導入時はスコアで不合格にしない（docs/testing.md 7章）。
  thresholds: { high: 80, low: 60, break: null },
}
