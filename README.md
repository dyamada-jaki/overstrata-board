# Overstrata Board

TRPG「Overstrata」のプレイ中に使う戦闘ボード（Web アプリ）です。戦場のマス目・キャラの位置・移動できる範囲を画面に出します。

- 目標: GM とプレイヤーが、それぞれの端末で同じ盤面を見て操作できること
- 最初の形: 1台のスマホで誰か1人が操作し、画面を見せる
- ルールは強制しません。補助として見せるだけです

## ドキュメント

- [docs/spec.md](docs/spec.md) — 仕様（何を・なぜ・どこまで）
- [docs/workflow.md](docs/workflow.md) — 開発の進め方（Spec × Issue × Orca）
- [docs/testing.md](docs/testing.md) — テストの分担・TDD・モック・PR レビューの方針
- [docs/next-issues.md](docs/next-issues.md) — 現在地と、次に切る Issue の下書き
- [docs/issue-reports/](docs/issue-reports/README.md) — Issue ごとの計画・実装・レビュー・採用判断と改善の記録
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — AI エージェント向けガイド

## 技術方針

- Vite + React + TypeScript
- テストは Vitest と Playwright（Chromium）、CI は GitHub Actions
- 開発も本番も Docker コンテナで動かす（OrbStack などの互換ランタイムでもよい）
- ルール計算は `src/domain/` の純粋関数にまとめる
- 盤面の描画は、まず CSS Grid で行う
- サーバーやデータベースは、共有・保存機能が必要になるまで導入しない

## 開発

### コンテナで動かす（おすすめ）

Docker（OrbStack などの互換ランタイムでもよい）があれば、ホストに Node は要りません。

```sh
docker compose up            # 開発サーバーを起動 → http://localhost:5173
docker compose down          # 止める（コンテナを削除する）
docker compose down -v       # node_modules のボリュームも消して止める
```

`docker compose up` を Ctrl+C で止めた場合も、コンテナを片付けるときは `docker compose down` を実行します。

テスト・型チェック・Lint・ビルドもコンテナの中で実行できます。

```sh
docker compose run --rm app npm run test
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run lint
docker compose run --rm app npm run build
# 開発サーバーを起動中なら exec でもよい: docker compose exec app npm run test
```

- `node_modules` はコンテナ専用のボリュームに入ります。`package-lock.json` が変わると、起動時に自動で `npm ci` し直します
- ファイルを変えても画面が更新されないときは、`.env` に `WATCH_POLLING=1` を書きます

### スマホ実機から開く

開発サーバーは、同じ LAN の端末からも開けるように公開しています。スマホの実機で画面を確かめるためです（[docs/spec.md](docs/spec.md)「2.4 画面の前提」）。

- スマホをホストと同じ Wi-Fi につなぎ、`http://<ホストの LAN 内の IP アドレス>:5173`（`HOST_PORT` を変えたときはその番号）を開きます
- 同じ LAN の誰からでも開けます。カフェなど信頼できないネットワークでは起動しないでください

### 複数の worktree で同時に起動する

worktree ごとに `.env.example` を `.env` にコピーし、ポートとプロジェクト名を変えます（`.env` はコミットしません）。

```sh
# 例: 2つ目の worktree の .env
HOST_PORT=5174
COMPOSE_PROJECT_NAME=overstrata-board-issue-2
```

`HOST_PORT` を変えると、ホスト側のポートがぶつかりません。`COMPOSE_PROJECT_NAME` を変えると、コンテナとボリュームが worktree ごとに分かれます（既定ではディレクトリ名から決まります）。

### ホストで動かす

Node 24 が必要です（`.nvmrc`）。

```sh
npm ci
npm run dev        # 開発サーバー
npm run test       # テスト（Vitest）
npm run typecheck  # 型チェック
npm run lint       # Lint（ESLint）
npm run build      # ビルド（dist/ に出力）
```

### E2E（Playwright）

実際の Chromium でアプリを開き、見出し「Overstrata 戦闘ボード」と未処理の JavaScript 例外がないことに加え、10×10の盤面・数字の座標ラベル・マスの選択／切替／解除・余白タップでの選択維持を375×667px・1280×720pxで確認します。マスが正方形であること、盤面全体が画面内にあり横スクロールが出ないことも確認します。モックは使いません。スマホ実機の指での使いやすさは、レビュー時に人間が別途確認します。

#### Docker だけで実行（ホストの Node・ブラウザは不要）

クリーンな checkout のルートで、Docker Compose が使える状態から実行します。初回はイメージ・依存・Chromium を取得するため時間がかかります。

```sh
sh scripts/e2e.sh --docker
```

アプリは現在の checkout を本番イメージにビルドし、nginx コンテナで配信します。runner は Node 24 / Debian 12（`node:24-bookworm`）で、lockfile に固定した `@playwright/test` 1.64.1 の CLI が対応する Chromium と OS 依存を導入します。既存の Alpine 開発コンテナにはブラウザを入れません（[対応 OS](https://playwright.dev/docs/intro#system-requirements)、[Docker 構成](https://playwright.dev/docs/docker#build-your-own-image)）。更新時も lockfile の更新後に runner を再ビルドすることで版を揃えます。

#### ホストから実行（macOS / Linux）

Docker に加え、`.nvmrc` の Node 24 と Playwright 対応 OS が必要です。macOS 14 以降、または対応する Debian / Ubuntu を使ってください。

```sh
# 初回・lockfile 更新時（nvm を使う場合は先に nvm use）
npm ci
npx playwright install chromium
# Linux では OS 依存も必要: npx playwright install --with-deps chromium

# 以後の実行入口（アプリ配信は Docker）
npm run test:e2e
# 対象を絞る例
npm run test:e2e -- --project=chromium-mobile
```

どちらの経路もアプリのビルド、新規コンテナの起動、healthcheck の準備待機、テスト、後片付けまで行います。Docker runner 内でも `npm run test:e2e` を実行しますが、内部フラグ `E2E_IN_CONTAINER=1` により Playwright だけを起動します。利用者はこのフラグや `E2E_BASE_URL` を設定しません。再試行は0回で、失敗を終了コードに反映します。

#### worktree・並行実行と後片付け

実行ごとに一意な Compose project と `e2e-artifacts/run-*/` を作ります。ホスト向けポートは Docker が空いている番号を loopback に割り当て、コンテナの実際のポートから接続先を取得します。`.env` の開発用 `HOST_PORT` / `COMPOSE_PROJECT_NAME` や起動済みサーバーは再利用しません。同じ worktree 内で並行実行しても出力を上書きしません。

成功・失敗・通常の中断（Ctrl+C）では、その実行のコンテナ・ネットワーク・イメージを削除します。runner は実行固有の名前で管理し、起動処理と停止・削除の完了を待ってからネットワークとイメージを片付けます。既知の資源の残存や検査の失敗は非ゼロ終了と復旧コマンドで知らせます。Docker のビルドキャッシュと調査材料は残します。強制終了や Docker 停止により後片付けに失敗した場合だけ、表示された結果ディレクトリを指定して再実行してください。他の worktree の project に対する操作や全体の prune は不要です。

```sh
# run-XXXXXXXX は実行時に表示されたディレクトリ名に置き換える
export E2E_ARTIFACT_DIR="$PWD/e2e-artifacts/run-XXXXXXXX"
project=$(cat "$E2E_ARTIFACT_DIR/project.txt")
docker rm -f "$project-runner" # 存在しない場合は続行
docker compose -p "$project" -f compose.e2e.yaml down --volumes --rmi local
unset E2E_ARTIFACT_DIR
```

後片付けの回帰テストは `npm run test` に含まれます。Docker CLI の境界を fake に置き換え、起動中の中断、終了コードの伝播、削除・照会の失敗、`down` が成功扱いでも残る資源の検出を確認します。実際の Docker と Chromium の確認は上記 E2E で行います。

#### 結果・失敗の調べ方

実行終了時に表示された `e2e-artifacts/run-*/` に次を保存します。生成物は Git・Docker build context・Lint から除外します。

- `report/index.html`: HTML report（実行環境・pageerror の添付を含む）
- `test-results/`: 失敗時の `trace.zip`・スクリーンショット・エラーの状況
- `build.log` / `app.log` / `cleanup.log`: ビルド・アプリ・終了処理のログ
- `project.txt`: その実行の Compose project 名

```sh
# ホストに Node の準備がある場合
npx playwright show-report e2e-artifacts/run-XXXXXXXX/report
# trace 単体は npx playwright show-trace <trace.zip のパス>

# Docker のみでもレポートを閲覧できる（http://localhost:9323）
# 競合するときは9323を変更。閲覧後はCtrl+Cでこのコンテナを削除。
docker run --rm -p 127.0.0.1:9323:80 \
  -v "$PWD/e2e-artifacts/run-XXXXXXXX/report:/usr/share/nginx/html:ro" nginx:1.29-alpine
```

HTML report の失敗テストから trace を開き、操作・DOM・通信・エラーを調べます。CI では実行ページの artifact をダウンロードして展開し、同じ `run-*/report` と `test-results` を使います。テスト開始前のビルド・起動失敗では trace は作られないので、Actions のログと `build.log` / `app.log` を確認します。

失敗検出を確認するときは、`e2e/smoke.spec.ts` の期待する見出しを一時的に存在しない文字列へ変更し、非ゼロ終了と HTML report・trace・スクリーンショットの生成を確認します。CI でも検証する場合は作業ブランチにその一時変更を push し、失敗した job と artifact を確認してください。必ず期待値を戻してローカルと CI を再実行し、最終コミットの成功を記録します。

### 本番用イメージ

ビルド済みのファイルを nginx で配信するイメージです。

```sh
docker build --target prod -t overstrata-board .
docker run --rm -p 8080:80 overstrata-board   # → http://localhost:8080
```

### CI

PR を作ったときと main への push のときに、GitHub Actions（`.github/workflows/ci.yml`）が次を実行します。

- テスト・型チェック・Lint・ビルド
- 本番用イメージのビルド
- Docker で Chromium E2E（幅375px・1280px）。失敗は CI の失敗となり、Actions の実行ページから `e2e-<run ID>-<attempt>` artifact を取得できます（保存14日）

### ミューテーション（StrykerJS）

既存のVitest・React Testing Libraryが、比較や条件式を誤って変えたコードを検出できるか確認します。アプリの部品・状態・domainを実物で組み合わせるテストを使い、Playwrightは変異ごとには起動しません。

```sh
# Node 24。初回・lock更新時は npm ci
npm run test:mutation
# 開発コンテナでも同じnpm入口（ホストにNode不要）
docker compose run --rm app npm run test:mutation
```

入口は互換処理の照合、通常の `npm run test`、Strykerの変異前の初期実行、全対象の変異検証、結果ガードの順で動きます。通常テストや初期実行、ツールのエラーは非ゼロ終了します。対象が空、設定したファイルがレポートから欠落、Pendingが残る、または `coveredBy` があるのに `testsCompleted=0` のSurvivedがあった場合も失敗です。スコアによる合否閾値は設定していません（表の色はStryker既定）。

`stryker.config.mjs` の初期対象は以下の5ファイルです。演算子を一括除外しません。

| 対象 | 確かめる内容 |
|---|---|
| `src/domain/movement.ts` | 距離、移動力、移動範囲の境界・現在地と占有の除外 |
| `src/data/movement.ts` | 基本移動力と装備補正の定数 |
| `src/domain/board.ts` | 座標の双方向変換、盤面座標の生成 |
| `src/data/board.ts` | 盤面サイズの共通定数 |
| `src/components/Board.tsx` | 実際の部品内の選択・切替・解除、座標表示 |

テスト自身、型だけの宣言、CSS、生成物、雛形sample、Appの固定文言・main起動、開発基盤は初期対象外です。定数も対象に含めますが、標準演算子は数値リテラルすべてを任意の値に変えるわけではありません。例えば装備補正の負号は変異し、オブジェクトを空にする変異は型エラーになることがあります。スコアは仕様の全数値を検証した割合ではありません。

#### 結果と分類

実行ごとに一意な `mutation-artifacts/run-*/` を作り、以前の測定を上書きしません。

- `mutation.html` / `mutation.json`: 変異位置・置換・状態・検出テスト（`killedBy`）・カバーしたテスト（`coveredBy`）・実行件数。
- `run.log`: 通常テスト、互換処理、Stryker、結果ガードの成功・失敗ログ。失敗が早い場合はHTML/JSONがないことがあります。
- `run.json`: 対象SHA、対象ソースのSHA256、ツール版、環境、開始終了・所要時間、段階別終了コード、互換処理、状態別件数。
- `config.json`: 出力先を含む通常実行の設定。診断用CLI引数を追加した場合は `run.json` の実コマンドも確認します。
- `sandbox/`: 失敗時の調査用コピー。成功時にはStrykerが削除します。

ホストでGitが使える場合はHEADを記録します。開発コンテナ等でGitがない場合は `MUTATION_SOURCE_SHA`、次いでCIの `GITHUB_SHA` を使い、どれもなければ未取得と表示して対象ファイルのSHA256を残します。明示したSHAとcheckoutの一致は実行者が確認してください。

```sh
# コンテナにも対象SHAを渡す例（ホストで実行）
docker compose run --rm -e MUTATION_SOURCE_SHA="$(git rev-parse HEAD)" app npm run test:mutation
# HTMLはブラウザで開く。以下はmacOSの例
open mutation-artifacts/run-XXXXXX/mutation.html
# 必要なレポートを保存してから、その実行の生成物だけ削除
rm -rf mutation-artifacts/run-XXXXXX
```

一時変異はコピー内だけに適用し、追跡ソースは変えません。生成物はGit・Lint・Docker build contextから除外します。複数worktreeはそれぞれのnode_modules・Compose project・出力を使い、共有pruneは不要です。同じworktreeで依存のインストールと測定を同時に行わないでください。Strykerの並列度は1、runner 10はVitestの `maxWorkers=1`・`maxConcurrency=1` を強制します。増分キャッシュ・外部ダッシュボードへの送信は使いません。

Killedはassertion等による検出、Timeoutは別枠です。ループの減算への変異などではhit limitでTimeoutになりますが、負荷による遅延と混同しないよう理由を確認します。CompileError（TypeScript checkerで無効と判定）・RuntimeError・Ignored・Pending等は検出成功に混ぜません。Survived/NoCoverageは、仕様上意味のある不足・等価・対象外・判断待ちに分類し、根拠と対応先をPRに記録します。既存テストの独立した改善はそのIssueへ引き継ぎます。詳しくは [testing.md 7章](docs/testing.md#7-ミューテーションテスト)を参照してください。

CIでは独立した「ミューテーション（Stryker・Vitest）」ジョブがPRとmainで同じ入口を実行し、成功・失敗とも `mutation-<run ID>-<attempt>` artifactを14日保存します。既存の通常チェック・本番イメージ・E2Eも維持します。

#### Vitest 5 / Stryker 10.0.0 の暫定互換処理

宣言上のpeer範囲内でも、未修正runnerではテストを実行せずSurvivedとなる不具合があります。さらにinstrumenterは `as const` の実行式ごと変異を省略します。`scripts/stryker-compat.mjs` は実際のVitest 5とStryker/core・runner・instrumenter 10.0.0、配布JSのSHA256を照合して、実行開始時に次だけを自worktree内のnode_modulesへ適用します。未知の内容・版・worktree外へのsymlinkは拒否します。通常の `npm ci` を変えず、再実行は冪等です。

- [上流 #6210](https://github.com/stryker-mutator/stryker-js/issues/6210): runnerの `dist/src/test-helpers.js` と `dist/src/stryker-setup.js` の `collectTestName` 各1行で、空の階層名を除いて ` > ` で連結。テストID・coverage・filterを一致させます。
- [上流 #6208](https://github.com/stryker-mutator/stryker-js/issues/6208) / [#6227](https://github.com/stryker-mutator/stryker-js/issues/6227): instrumenterの `dist/src/util/syntax-helpers.js` で、`isTSType()` を除外判定に加え、`TSAsExpression` 全体をskipする指定だけ削除。型側を除外したまま実行式を変異させます。

TypeScript checker 10.0.0も追加し、既存 `tsconfig.app.json` と精度優先モードで、型として成立しない変異をCompileErrorに分けます。既存Vitest/Vite/TypeScriptは下げません。runnerのdebug出力にはVitest設定の循環参照による別の既知障害があるため、保存する通常ログはinfoとstdout/stderrを使います。

上流更新時は、未パッチ版で距離・選択状態・装備定数の代表的な変異が実テストを実行して検出されること、型側が変異していないことを実際の位置・内容で確認し、全対象を再測定してから暫定修正を削除・更新します。変異数の不変は条件にしません。正当な演算子追加もあり得るためです。通常テストが通ることやバージョン範囲だけで解除しないでください。
