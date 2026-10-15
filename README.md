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
- テストは Vitest、E2E は Playwright（Chromium）、CI は GitHub Actions
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

E2E は `app` コンテナではなく `./scripts/e2e-docker.sh` で実行します（→「E2E テスト（Playwright）」）。

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
E2E_HOST_PORT=4174
```

`HOST_PORT` を変えると、ホスト側のポートがぶつかりません（ホストで E2E を実行するときのポート `E2E_HOST_PORT` も同様。→「E2E テスト」）。`COMPOSE_PROJECT_NAME` を変えると、コンテナとボリュームが worktree ごとに分かれます（既定ではディレクトリ名から決まります）。

### ホストで動かす

Node 24 が必要です（`.nvmrc`）。

```sh
npm ci
npm run dev        # 開発サーバー
npm run test       # テスト（Vitest）
npm run typecheck  # 型チェック
npm run lint       # Lint（ESLint）
npm run build      # ビルド（dist/ に出力）
npm run test:e2e   # E2E（Playwright）。準備は「E2E テスト」を参照
```

### 本番用イメージ

ビルド済みのファイルを nginx で配信するイメージです。

```sh
docker build --target prod -t overstrata-board .
docker run --rm -p 8080:80 overstrata-board   # → http://localhost:8080
```

### E2E テスト（Playwright）

配信された実際のアプリを Chromium で開いて確かめます（方針は [docs/testing.md](docs/testing.md) 4章）。テストは `e2e/`、設定は `playwright.config.ts` にあります。

- アプリは、**この checkout から本番用イメージ（nginx）をビルドしたコンテナ**で配信します。開発サーバーや別 worktree のサーバーは使いません
- 幅375px（`mobile-375`: 375×667、タッチ有効）と PC 幅（`desktop-1280`: 1280×800）の2つで同じテストを実行します
- Vitest（`npm run test`）は `src/` のテストだけを、Playwright（`npm run test:e2e`）は `e2e/` のテストだけを実行します
- 再試行はしません。1回で通らなければ失敗です

#### Docker だけで実行する（ホストに Node やブラウザは不要）

```sh
./scripts/e2e-docker.sh                          # 全部実行
./scripts/e2e-docker.sh --project=mobile-375     # 引数は Playwright に渡る
```

- 初回は E2E 用イメージ（Debian 系の Node 24 + Chromium、約1.5GB）のビルドに数分かかります。2回目からはキャッシュが効きます
- この checkout から `e2e-web`（本番用イメージ）と `e2e`（Playwright を実行するイメージ）をビルドし、`e2e` コンテナの中で `npm run test:e2e` を実行します。`e2e` は Compose のネットワーク内で `http://e2e-web` を開くので、ホストのポートは使いません
- 終了時（成功・失敗・Ctrl+C）に、このスクリプトが起動したコンテナと、新しく作られたネットワークだけを片付けます。同じ worktree の開発サーバー（`app`）や、他の worktree のコンテナには触れません
- 開発用の `app` コンテナ（Alpine）の中では `npm run test:e2e` は動きません。Alpine は Playwright の対応 OS ではなく、ブラウザも入っていないためです。コンテナで実行するときはこのスクリプトを使います
- Linux のホストでは、`e2e-results/` のファイルが root の所有になることがあります。消せないときは `sudo rm -rf e2e-results` で消します

#### ホストで実行する

Node 24（`.nvmrc`）と Docker が必要です。アプリはホストでもコンテナで配信します。

```sh
npm ci
npx playwright install --with-deps --only-shell chromium   # 初回と @playwright/test の版を上げたとき。macOS では --with-deps は不要
npm run test:e2e
```

- `npm run test:e2e` は `scripts/e2e-web.sh` を起動し、この checkout から本番用イメージをビルドして `127.0.0.1:${E2E_HOST_PORT}`（既定 4173）で配信します。`.env` に書いた `E2E_HOST_PORT` を読みます
- そのポートが既に使われている（別 worktree のサーバーなど）と、起動前に `is already used` で失敗します。既存のサーバーを使い回すことはありません。`.env` の `E2E_HOST_PORT` を空いている番号に変えてください
- テストが終わると（成功・失敗・Ctrl+C）、起動したコンテナを削除します

#### 結果の見方

結果は `e2e-results/` に出ます（Git にも Docker のビルドにも入りません）。実行のたびに上書きされます。

- `e2e-results/report/` — HTML レポート
- `e2e-results/artifacts/` — 失敗したテストの trace（`trace.zip`）・スクリーンショット・動画・エラーの要約（`error-context.md`）

```sh
npx playwright show-report e2e-results/report      # ホスト（Node あり）。失敗したテストの「View Trace」で trace を開ける
npx playwright show-trace <trace.zip のパス>        # trace だけを開く
# Node が無いとき（Docker）: http://localhost:9323 を開く。Ctrl+C で止まる
docker compose --profile e2e run --rm --no-deps -p 127.0.0.1:9323:9323 e2e \
  npx playwright show-report e2e-results/report --host 0.0.0.0
```

`index.html` をファイルとして直接開いても一覧は見られますが、trace の表示には上のようにサーバー経由で開く必要があります。

CI では、ジョブの Summary の Artifacts にある `e2e-results` をダウンロードし、展開したフォルダで同じように開きます。

#### 後片付け

```sh
rm -rf e2e-results                              # 結果を消す
docker image rm "$(basename "$PWD")-e2e" "$(basename "$PWD")-e2e-web"   # E2E 用イメージを消す（COMPOSE_PROJECT_NAME を変えたときはその名前）
```

コンテナは実行のたびに片付きます。強制終了などで残ったときは、`docker ps -a --filter label=com.docker.compose.project=<プロジェクト名>` で確かめてから、そのコンテナだけを消してください。

#### 複数の worktree で使い分ける

- Docker で実行する: `COMPOSE_PROJECT_NAME` が worktree ごとに違えば（既定はディレクトリ名）、イメージ・コンテナ・ネットワークが分かれます。ホストのポートは使いません
- ホストで実行する: `.env` の `E2E_HOST_PORT` を worktree ごとに変えます（`HOST_PORT` とも別の番号にする）
- 結果は各 worktree の `e2e-results/` に出るので混ざりません

### CI

PR を作ったときと main への push のときに、GitHub Actions（`.github/workflows/ci.yml`）が次の3つを実行します。

- テスト・型チェック・Lint・ビルド
- 本番用イメージのビルド
- E2E（`./scripts/e2e-docker.sh`。ローカルの Docker と同じ手順）。テストが失敗すると CI も失敗します。レポートと trace などは Artifacts の `e2e-results` に14日間残ります
