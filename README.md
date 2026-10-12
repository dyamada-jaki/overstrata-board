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

Docker 互換ランタイムだけで開発できます。

```sh
docker compose up --build
```

ブラウザで http://localhost:5173 を開いてください。ソースの変更は自動で反映されます。
停止する場合は `Ctrl+C`、コンテナを削除する場合は `docker compose down` を実行します。

複数の worktree を同時に起動するときは、ポートと Compose プロジェクト名をそれぞれ変えます。

```sh
PORT=5174 docker compose -p overstrata-issue-1 up --build
```

この場合は http://localhost:5174 を開きます。後続の `exec` / `down` にも同じ `-p` を指定してください。
依存パッケージは専用ボリュームに保持され、起動時の `npm ci` でロックファイルに合わせて更新されます。

### テスト・型チェック・Lint・ビルド

開発コンテナの起動中に実行します。

```sh
docker compose exec app npm run test
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm run build
```

ホストで実行する場合は Node.js 24 を用意します。

```sh
npm ci
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

`npm run test` はテストを1回実行して終了します。ビルド結果は `dist/` に出力されます。

### 本番用イメージ

```sh
docker build --target production -t overstrata-board .
docker run --rm -p 127.0.0.1:8080:80 overstrata-board
```

http://localhost:8080 でビルド済みの画面を確認できます。本番イメージは nginx で静的ファイルを配信します。

### CI

PR と main への push で、テスト・型チェック・Lint・ビルド・本番用イメージのビルドを実行します。
