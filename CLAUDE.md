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
- `npm run test` — テスト
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
```

## 守ること
1. **ルール計算は `src/domain/` の純粋関数に書く**。UI の中に計算を書かない
2. **`src/domain/` の関数には必ずテストを書く**
3. **スマホ縦画面（幅 375px）を基準**に作る。PC でも崩れなければよい
4. 画面の文言は日本語
5. 依存パッケージを増やすときは、PR 本文に理由を書く。版は実行環境（`.nvmrc` の Node）に合わせる
6. **1つの PR は1つの Issue だけを扱う**。PR 本文に `Closes #番号` を書く
7. Issue の「スコープ外」に書かれたことはやらない。必要だと思ったら PR 本文で提案する
8. spec.md や Issue に書かれていないルールを推測で実装しない。不明点は計画の段階で質問するか、PR 本文に「確認したいこと」として書く
9. Overstrata の設定資料にある秘匿情報（GM 向けの裏設定など）を、コード・Issue・PR・ドキュメントに書かない

## Issue の実装手順
`.claude/skills/implement-issue/SKILL.md`（Codex 用は `.agents/skills/implement-issue/SKILL.md`。中身は同じ）に従う。Claude Code では `/implement-issue 番号`、Codex では「implement-issue スキルで Issue 番号」。

## 完了の定義
- Issue の受け入れ条件をすべて満たす
- `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` がすべて通る
- PR 本文に「何をしたか」「どう確認したか」「確認したいこと」を書く

## 用語
| 日本語 | コード上の名前 |
|---|---|
| キャラ | `Character` |
| 味方 / 敵 | `side: 'ally' \| 'enemy'` |
| 装備の重さ（軽装/中装/重装） | `armor: 'light' \| 'medium' \| 'heavy'` |
| マス座標 | `Position { x, y }`（内部は0始まりで左上が `{ x: 0, y: 0 }`。表示は1始まりの `(横, 縦)` で左上が `(1, 1)`） |
| 移動力 | `movement` |
