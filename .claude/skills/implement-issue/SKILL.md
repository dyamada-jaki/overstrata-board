---
name: implement-issue
description: GitHub Issue を1本実装して PR を作るときの手順。「/implement-issue 12」のように Issue 番号を渡して使う。
argument-hint: <Issue番号>
---

# Issue #$ARGUMENTS を実装する

次の5手順を順番に行う。手順3で承認をもらうまで、コードを書かない。

## 1. Issue を読む
- `gh issue view $ARGUMENTS --comments` を実行する
- 目的・受け入れ条件・スコープ外を確認する

## 2. 仕様を読む
- `docs/spec.md` のうち、Issue がリンクしている箇所を読む
- `CLAUDE.md` の「守ること」を確認する

## 3. 実装計画を出して、承認を待つ
次を書いた計画を出し、人間の承認を待つ。
- 受け入れ条件ごとに、どう満たすか
- 作る・変えるファイル
- 書くテスト
- 確認したいこと（spec.md や Issue から読み取れない点）

spec.md に書かれていないルールを決めないと進めない場合は、推測で埋めずに質問して止まる。

## 4. 実装してテストを通す
- 承認された計画どおりに実装する。スコープ外のことはしない
- `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` がすべて通るまで直す

## 5. 証拠を付けて PR を作る
`gh pr create` で PR を作る。本文には次を書く。
- 何をしたか
- どう確認したか（テストの実行結果、画面の確認方法）
- 確認したいこと（なければ「なし」）
  - 受け入れ条件のうち、自分で確かめられなかったもの（実機・ブラウザの目視など）は必ずここに書く。「なし」と書けるのは、すべて確かめたときだけ
- `Closes #$ARGUMENTS`
