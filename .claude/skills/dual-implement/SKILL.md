---
name: dual-implement
description: GitHub Issue を1本、Claude Code と Codex の両方に実装させ、互いの PR をレビューさせて、結果のまとめと一次判断を人間に見せる（workflow.md の③〜⑥）。Claude Code では「/dual-implement 4」、Codex では「dual-implement スキルで Issue 4」のように Issue 番号を渡して使う。Orca のターミナルから実行する。
argument-hint: <Issue番号>
---

# Issue を Claude Code と Codex で並行して実装し、相互レビューする

あなたは**コーディネーター**。自分ではコードを書かない。Orca のワーカーに実装とレビューをさせ、人間との窓口になる。
流れの背景は `docs/workflow.md`（③着手〜⑥レビュー、ステップ6の「2つのエージェントで作らせて比べる」）にある。

- 以下の `N` は、人間が渡した Issue 番号（Claude Code では $ARGUMENTS）。渡されていなければ聞く
- このファイルは Claude Code 用（`.claude/skills/dual-implement/`）と Codex 用（`.agents/skills/dual-implement/`）に同じ内容で置いてある（Codex はシンボリックリンクを読まないため）。直すときは両方を直す。どちらがコーディネーターでも、ワーカーは Claude Code と Codex の1つずつ
- `orca` コマンドは Orca のターミナルの中で使う。最初に `orca skills get orchestration` を読み、そこに書かれた安全のルール（完了の証拠がないワーカーを止めない・二重に起動しない、など）に従う
- **マージ（⑦）はしない。** 人間が判断する
- 人間に聞く場面は2回だけ: 手順4（計画承認）と手順7（最終報告）。それ以外は止まらずに進める
- 待つときは `orca orchestration check --wait --timeout-ms 540000` を繰り返す（コマンドの実行時間の上限より短くする）。時間切れは失敗ではない。待ち続ける

## 1. 事前確認
- `gh issue view N --comments` で目的・受け入れ条件・スコープ外を読む
- Issue に「前提」「依存」として書かれた Issue や PR がすべて閉じている／マージ済みか確かめる。まだなら止めて人間に伝える
- `git pull` で main を最新にする。`docs/spec.md` の、Issue がリンクしている箇所を読む
- `orca status --json` でランタイムが動いていることを確かめる

## 2. Run を作る
```
orca orchestration run-create --objective "Issue #N を Claude Code と Codex で並行実装し、相互レビューする" --json
```

## 3. 実装ワーカーを2つ起動する
Claude Code 用と Codex 用に、main から新しい worktree を作って起動する。2つを続けて起動してから待つ。

```
orca orchestration worker-start --spec "<下の実装用の指示>" --task-title "#N 実装（Claude Code）" \
  --worktree new-top-level --repo path:<このリポジトリの絶対パス> --base-branch main \
  --name issue-N-claude --agent claude --json
orca orchestration worker-start --spec "<下の実装用の指示>" --task-title "#N 実装（Codex）" \
  --worktree new-top-level --repo path:<このリポジトリの絶対パス> --base-branch main \
  --name issue-N-codex --agent codex --json
```

`worker-start` が 0 以外で終わったら、起動し直さない。結果の `failedStage` と `recovery` を読み、`orca skills get orchestration --reference references/recovery-and-cleanup.md` に従う。

### 実装用の指示（`--spec` に入れる。<…> は埋める）
```
対象: GitHub Issue #N（dyamada-jaki/overstrata-board）。この worktree の中だけで作業する。
やること: .claude/skills/implement-issue/SKILL.md の5手順に従って Issue #N を実装し、PR を作る。ただし次の点だけ手順を置き換える。
- 最初に、worktree の直下に .env を作る（コミットしない）: HOST_PORT=<ポート> と COMPOSE_PROJECT_NAME=issue-N-<claude|codex>
- 手順3の計画は、人間に直接聞かず、指示文の先頭に付いている ask コマンド（orca orchestration ask）で、計画の全文を質問として送る。返事が来るまで実装を始めない。返事に修正の指示があれば従う
- 手順5の PR のタイトルの先頭に「[<Claude Code|Codex>]」を付ける。PR 本文の先頭に「作成: <Claude Code|Codex>」と書く
守ること: CLAUDE.md（AGENTS.md）の「守ること」。Issue のスコープ外はやらない。main に直接 push しない。
完了の条件: PR ができていて、npm run test / typecheck / lint / build がすべて通っている。worker_done の要約に PR の URL を書く。
```
- ポートは Claude Code が `5181`、Codex が `5182` を使う（main の開発サーバーの `5173` とぶつけない）

## 4. 計画を人間に見せて承認をもらう（④ 関所）
- `check --wait --types question,worker_done,escalation` で、2つのワーカーから計画（question）が届くのを待つ
- **2つとも届いてから**、人間に並べて見せる。見せ方:
  - それぞれの計画の要約（受け入れ条件ごとの満たし方・作る/変えるファイル・テスト）
  - 2つの計画の主な違い
  - 各ワーカーの「確認したいこと」
  - コーディネーターとしての所見: スコープ外に踏み込んでいないか、受け入れ条件の抜け、spec.md との食い違い
- 人間の答えを、それぞれの質問に `orca orchestration reply --id <message_id> --body "<答え>" --json` で返す。返したら、そのバッチを `--ack` する
- 人間が「仕様の穴なので止める」と言ったら、ワーカーに中止を伝えて、手順7の形で状況だけ報告して終わる

## 5. 実装の完了を待つ
- 2つの `worker_done` が届くまで待つ。途中で質問が来たら、自分で答えられる実装上の選択なら答える。仕様を決めることになる質問なら人間に聞く（workflow.md「迷ったときの判断基準」）
- `worker_done` の `outcome` が `failed` なら、相互レビューには進まず、手順7で状況を報告する
- 完了したワーカーは `orca orchestration worker-release --dispatch <dispatch_id> --json` で片付ける
- `gh pr list --search "N in:body"` などで、2つの PR の番号を確かめる

## 6. 相互レビューのワーカーを起動する
**相手の** worktree に、レビュー用のワーカーを起動する。Claude Code が Codex の PR を、Codex が Claude Code の PR をレビューする。

```
orca orchestration worker-start --spec "<下のレビュー用の指示>" --task-title "#N レビュー（Claude Code → Codex の PR）" \
  --worktree path:<issue-N-codex の worktree の絶対パス> --agent claude --json
orca orchestration worker-start --spec "<下のレビュー用の指示>" --task-title "#N レビュー（Codex → Claude Code の PR）" \
  --worktree path:<issue-N-claude の worktree の絶対パス> --agent codex --json
```

### レビュー用の指示（`--spec` に入れる）
```
対象: PR #<番号>（dyamada-jaki/overstrata-board）。Issue #N を実装したもの。
やること: この PR をコードレビューする。ファイルは編集しない・コミットしない・push しない。
見ること:
- Issue #N の受け入れ条件を1つずつ満たしているか（gh issue view N）
- docs/spec.md と CLAUDE.md の「守ること」に反していないか
- バグ、壊れやすい作り、スコープ外の変更、不要な依存の追加
- PR 本文の「確認したいこと」が正直に書かれているか
必要なら npm run test などを実行して確かめてよい（.env はすでにある。docker compose を使うなら、すでに動いているコンテナを止めない）。
出力: レビュー結果を gh pr comment <番号> --body-file <ファイル> で PR にコメントする。先頭に「レビュー: <Claude Code|Codex>」と書く。中身は次の形:
- 受け入れ条件ごとの判定（満たす / 満たさない / 確かめられない）と根拠
- 指摘の一覧。1件ごとに: 重さ（必須 / 推奨 / 好み）、ファイル:行、何が問題か、どう直すか
- 総評（2〜3行）
完了の条件: コメントが PR に付いている。worker_done の要約にコメントの URL を書く。
```

- 2つの `worker_done` を待ち、手順5と同じように片付ける

## 7. まとめて一次判断し、人間に報告する
レビューの指摘をそのまま信じない。コーディネーター自身が裏を取ってから報告する。
- `gh pr view <番号> --comments` で両方のレビューを読む
- `gh pr checks <番号>` で CI の結果を見る
- 指摘ごとに `gh pr diff <番号>` の実際のコードで確かめ、「確認できた / 誤り / 判断できない」を付ける

報告の形（日本語）:
1. **概要**: 2つの PR の番号・URL・CI の結果
2. **受け入れ条件の表**: 行が受け入れ条件、列が2つの PR。○ / × / ？ と一言
3. **確認できた指摘**: PR ごとに、重さ順。誤りだった指摘は「除外した理由」と一緒に短く
4. **spec.md との関係**: 仕様の抜けや食い違いが見つかったら、spec.md に戻す候補として書く
5. **一次判断**: どちらを採るかの推奨と理由。採る PR をマージ前に直すべき点（あれば）。別 Issue にする改善点の候補
6. **人間にやってほしいこと**: 画面での確認（スマホ実機など）、マージ、採らない PR を理由付きで閉じること

最後に `orca orchestration worker-list --run <run_id> --terminal-state reclaimable --json` が空であることを確かめてから終える。
