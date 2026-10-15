---
name: implement-issue
description: GitHub Issue を1本実装して PR を作るときの手順。Claude Code では「/implement-issue 12」、Codex では「implement-issue スキルで Issue 12」のように Issue 番号を渡して使う。
argument-hint: <Issue番号>
---

# Issue を実装する

- 以下の `N` は、人間が渡した Issue 番号（Claude Code では $ARGUMENTS）。渡されていなければ聞く
- このファイルは Claude Code 用（`.claude/skills/implement-issue/`）と Codex 用（`.agents/skills/implement-issue/`）に同じ内容で置いてある。直すときは両方を直す

次の5手順を順番に行う。手順3で承認をもらうまで、コードを書かない。

## 1. Issue を読む
- `gh issue view N --json title,body,comments` で本文とコメントを読む
- 目的・受け入れ条件・スコープ外・前提（着手条件）を確認する
- 着手条件に、未完了の Issue や「確認中」「未決」の仕様が残っていたら、実装せずに止めて人間に伝える

## 2. 仕様を読む
- `docs/spec.md` のうち、Issue がリンクしている箇所を読む。画面を含む Issue では「2.4 画面の前提」も読む
- `CLAUDE.md`（Codex では `AGENTS.md`）の「守ること」を確認する

## 3. 実装計画を出して、承認を待つ
次を書いた計画を出し、人間の承認を待つ。
- 受け入れ条件ごとに、どう満たすか
- 作る・変えるファイル
- 書くテスト（`src/domain/` の関数には必ずテスト）
  - 計算の性質に応じて、仕様の例、境界の内外、向きの対称性、入力を変更しないことを検討する。仕様にない入力ルールは追加しない
  - 一覧を返す関数では、小さな例の期待一覧を明記して、要素の欠落・混入を確かめる。#7 の例は `docs/issue-reports/issue-7.md` を参照する
- 画面を含む場合: 画面の確認方法（使う環境、確かめる画面幅と操作）
- 確認したいこと（spec.md や Issue から読み取れない点）

spec.md に書かれていないルールを決めないと進めない場合は、推測で埋めずに質問して止まる。

## 4. 実装して確かめる
- 承認された計画どおりに実装する。スコープ外のことはしない
- `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` がすべて通るまで直す
- 画面を含む場合は、テストとは別に、**実際の画面**で表示と操作を確かめる（spec.md 2.4。DOM のテストだけで「画面確認済み」としない）
  1. 開発サーバーを起動する（`docker compose up -d`。ポートは `.env` の `HOST_PORT`）
  2. Orca のブラウザで開く: `orca tab create --url http://localhost:<ポート> --json`。操作の仕方は `orca skills get orca-cli --reference references/browser.md` を読む
  3. スマホ幅にする: `orca set device --name "iPhone SE" --json` などで幅375pxの端末を指定し、`orca eval --expression "window.innerWidth" --json` で幅が375であることを確かめる。375にできなければ、実際の幅を記録する
  4. Issue の受け入れ条件にある操作（タップ・選択・移動など）を `orca snapshot` と `orca click` で行い、`orca screenshot` で結果を見る。横スクロールが出ないことも確かめる
  5. PC 幅でも崩れないことを確かめる
  6. 確認が終わったら `docker compose down` で止める
  - Orca のブラウザが使えないなど、確かめられなかったときは、その理由と未確認の項目を記録して先に進む（手順5で PR に書く）
- スマホ実機での確認はしなくてよい。レビューのときに人間が行う

## 5. 証拠を付けて PR を作る
`gh pr create` で PR を作る。本文には次を書く。
- 何をしたか
  - 承認した計画の要点と、確認事項の決着。計画から変えた点があれば、その理由
- どう確認したか
  - テストの実行結果
  - 画面を含む場合: 使った環境（Orca のブラウザ・端末の指定など）、画面幅、行った操作、結果。スクリーンショットを撮ったなら、その説明
  - スマホ実機での確認は未実施で、レビュー時に人間が行うこと
- 確認したいこと（なければ「なし」）
  - 受け入れ条件のうち、自分で確かめられなかったもの（実機・ブラウザの目視など）は必ずここに書く。「なし」と書けるのは、すべて確かめたときだけ
- `Closes #N`
