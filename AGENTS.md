# Overstrata 戦闘ボード — エージェント向けガイド

TRPG「Overstrata」のプレイ中に使う戦闘ボード（Web アプリ）。
**仕様はすべて [docs/spec.md](docs/spec.md) にある。作業の前に必ず読むこと。**
アプリはルールを強制しない。補助として見せるだけ。

## 技術スタック
- Vite + React + TypeScript（strict）
- テスト: Vitest（+ React Testing Library）
- サーバーなし。ブラウザだけで完結する（複数端末の共有を入れるまで）
- 実行環境: 開発も本番も Docker コンテナで動かす（→ spec.md 1章「実行環境」）

## コマンド
雛形ができたら有効になる。
- `docker compose up` — コンテナで開発サーバーを起動
- 下の npm コマンドは、コンテナの中でもホストでも同じように動くこと
- `npm run dev` — 開発サーバー
- `npm run test` — テスト（Vitest）
- `npm run test:e2e` — Chromium E2E（初回準備・Docker 実行は README を参照）
- `npm run test:mutation` — ミューテーションテスト（StrykerJS。通常テストから順に実行。結果の読み方は README・testing.md 7章）
- `npm run typecheck` — 型チェック
- `npm run lint` — Lint
- `npm run build` — ビルド

## ディレクトリ構成
```
src/
  domain/      ルール計算（純粋関数のみ。React を import しない）
  components/  画面部品
  data/        サンプルデータ・定数
docs/
  spec.md      仕様（正）
  workflow.md  開発の進め方
  testing.md   テストとレビューの方針
```

## 開発設定（スキルが参照する値）
`.claude/skills/` のスキルは、プロジェクト固有の値をここから読む。値を変えるときはここだけを直す。

| 項目 | 値 |
|---|---|
| リポジトリ | `dyamada-jaki/overstrata-board`（既定ブランチ `main`） |
| 確認コマンド | `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` |
| E2E | `npm run test:e2e`（導入済みで、対象となる場合） |
| ミューテーション | `npm run test:mutation`（testing.md 7章の対象変更で実行） |
| 開発サーバー | `docker compose up -d`。worktree ごとに `.env` の `HOST_PORT`（ホスト側のポート）と `COMPOSE_PROJECT_NAME` で分ける |
| ポート | main: `5173` / 実装（Claude Code）: `5181` / 実装（Codex）: `5182` / 品質レビュー: `5183`・`5184` |
| 画面確認の幅 | スマホ縦 `375px`（Orca のブラウザで端末を指定）と PC 幅 |
| マージ方式 | squash（`finish-issue/scripts/finish.sh` で固定） |
| 仕様・方針 | `docs/spec.md` / `docs/testing.md` / `docs/workflow.md` |
| 記録 | `docs/next-issues.md`（現在地。PO だけが書く）/ `docs/issue-reports/`（Issue レポート。開発チームから PO への申し送りもここに書く） |
| 席 | PO（Claude Code か Codex。開いたら `dev-team.sh po-register` で登録）/ 開発チーム（Issue ごとに開いて閉じる。`dev-team.sh claim` で登録）/ 開発者（dual-implement のワーカー）。役割は workflow.md「3つの席」 |
| 着手のラベル | `開発可`（着手してよい。付けるのは PO か人間だけ）/ `着手中`（開発チームが動いている。同時に1つまで） |
| 起動係 | Orca の定期実行 `開発チーム起動`。`.claude/skills/dual-implement/scripts/dev-team.sh` で確認と起動を行う |
| PO の差し戻し | 2回まで。3回目は人間に判断を仰ぐ |

## 守ること
1. **ルール計算は `src/domain/` の純粋関数に書く**。UI の中に計算を書かない
2. **機能追加・振る舞いの変更では、テストを先に書いてから実装する**。振る舞いは画面から呼ばれる入り口（画面操作の結合テスト）で確かめ、仕様に例があるルールや分岐の多い処理は、外から使われる domain 関数の単位でもテストする。内部の補助関数の個別テストは必須にせず、複雑な計算や境界条件を効果的に確かめられる場合に追加する。計画・実装・レビューでは [docs/testing.md](docs/testing.md) に従う（期待結果を仕様から決める、対象の振る舞いによる失敗を確かめてから実装する、振る舞いを変えない整理は変更前後の成功を確認する、モックは必要な境界だけ）
3. **スマホ縦画面（幅 375px）を基準**に作る。PC でも崩れなければよい
4. 画面の文言は日本語
5. 依存パッケージを増やすときは、PR 本文に理由を書く。版は実行環境（`.nvmrc` の Node）に合わせる
6. **1つの PR は1つの Issue だけを扱う**。PR 本文に `Closes #番号` を書く
7. Issue の「スコープ外」に書かれたことはやらない。必要だと思ったら PR 本文で提案する
8. spec.md や Issue に書かれていないルールを推測で実装しない。不明点は計画の段階で質問するか、PR 本文に「確認したいこと」として書く
9. Overstrata の設定資料にある秘匿情報（GM 向けの裏設定など）を、コード・Issue・PR・ドキュメントに書かない。設定資料の vault は読むだけで書き換えない。vault の `20_gm_secret/` と `layer: GM` のファイルは GM 専用なので読まず、内容をこのリポジトリに書かない（→ spec.md 3.0）

## Issue の実装手順
`.claude/skills/implement-issue/SKILL.md`（Codex 用の `.agents/skills/implement-issue` は、このフォルダへのシンボリックリンク）に従う。Claude Code では `/implement-issue 番号`、Codex では「implement-issue スキルで Issue 番号」。

## 完了の定義
- Issue の受け入れ条件をすべて満たす
- `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` がすべて通る
- E2E 導入後は対象となる E2E も通る。未導入時の扱いとレビューの分担は [docs/testing.md](docs/testing.md) を参照する
- PR 本文に「何をしたか」「どう確認したか」「確認したいこと」を書く

## 用語
| 日本語 | コード上の名前 |
|---|---|
| キャラ | `Character` |
| 味方 / 敵 | `side: 'ally' \| 'enemy'` |
| 装備の重さ（軽装/中装/重装） | `armor: 'light' \| 'medium' \| 'heavy'` |
| マス座標 | `Position { x, y }`（内部は0始まりで左上が `{ x: 0, y: 0 }`。表示は1始まりの `(横, 縦)` で左上が `(1, 1)`） |
| 移動力 | `movement` |
