# Overstrata Board

TRPG「Overstrata」のプレイ中に使う戦闘ボード（Web アプリ）です。戦場のマス目・キャラの位置・移動できる範囲を画面に出します。

- 目標: GM とプレイヤーが、それぞれの端末で同じ盤面を見て操作できること
- 最初の形: 1台のスマホで誰か1人が操作し、画面を見せる
- ルールは強制しません。補助として見せるだけです

## ドキュメント

- [docs/spec.md](docs/spec.md) — 仕様（何を・なぜ・どこまで）
- [docs/workflow.md](docs/workflow.md) — 開発の進め方（Spec × Issue × Orca）
- [docs/next-issues.md](docs/next-issues.md) — 現在地と、次に切る Issue の下書き
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — AI エージェント向けガイド

## 技術方針

- Vite + React + TypeScript
- テストは Vitest、CI は GitHub Actions
- 開発も本番も Docker コンテナで動かす（OrbStack などの互換ランタイムでもよい）
- ルール計算は `src/domain/` の純粋関数にまとめる
- 盤面の描画は、まず CSS Grid で行う
- サーバーやデータベースは、共有・保存機能が必要になるまで導入しない

## 開発

### コンテナで動かす（おすすめ）

Docker（OrbStack などの互換ランタイムでもよい）があれば、ホストに Node は要りません。

```sh
docker compose up            # 開発サーバーを起動 → http://localhost:5173
```

同じ LAN のスマホで実機確認するため、開発サーバーはホストの全ネットワークインターフェースに公開します。スマホからは `http://<開発マシンのLAN内IPアドレス>:5173` を開きます（`HOST_PORT` を変えた場合はそのポートを使います）。

コンテナを止めるときは、次を実行します。

```sh
docker compose down
```

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

### 本番用イメージ

ビルド済みのファイルを nginx で配信するイメージです。

```sh
docker build --target prod -t overstrata-board .
docker run --rm -p 8080:80 overstrata-board   # → http://localhost:8080
```

### CI

PR を作ったときと main への push のときに、GitHub Actions（`.github/workflows/ci.yml`）が次の2つを実行します。

- テスト・型チェック・Lint・ビルド
- 本番用イメージのビルド
