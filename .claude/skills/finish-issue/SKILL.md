---
name: finish-issue
description: 採用する PR が決まったあと、マージ・採らない PR を閉じる・worktree や Docker の後片付けまでを行う（workflow.md の⑦）。Claude Code では「/finish-issue 5」、Codex では「finish-issue スキルで PR 5」のように、採用する PR の番号を渡して使う。dual-implement のあとにコーディネーターへ指示する想定。
argument-hint: <採用するPR番号>
---

# 採用した PR をマージして、後片付けをする

- 以下の `P` は、人間が渡した**採用する PR の番号**（Claude Code では $ARGUMENTS）。渡されていなければ聞く。採らない PR の閉じる理由を人間が添えていれば、それを使う
- このファイルは Claude Code 用（`.claude/skills/finish-issue/`）と Codex 用（`.agents/skills/finish-issue/`）に同じ内容で置いてある。直すときは両方を直す
- 消すものは、必ず中身を見てから消す。手順3で人間の確認を1回だけ取り、そのあとは止まらずに進める
- ふりかえり（⑧）はしない。最後に、ふりかえりの材料を人間に渡して終わる

## 1. 対象を確かめる
- `gh pr view P --json number,title,state,mergeable,mergeStateStatus,headRefName,body,url` で、PR が OPEN でマージできる状態か見る
- `gh pr checks P` で CI がすべて成功しているか見る。失敗・実行中なら止めて人間に伝える
- PR 本文の `Closes #番号` から Issue 番号 `N` を取る
- 同じ Issue を扱う、採らない PR を探す: `gh pr list --state open --json number,title,headRefName,body` から、本文に `#N` があるもの、またはブランチ名に `issue-N-` を含むもの

## 2. 片付ける対象を洗い出す
- **worktree**: `orca worktree list --json` と `git worktree list` から、この Issue 用のもの（`issue-N-claude` / `issue-N-codex` など、手順1の PR のブランチを使っているもの）。main の worktree は対象外
  - それぞれ `git -C <path> status -s` で、未コミットの変更がないか見る（`dist/` などの無視されたファイルと `.env` は消えてよい）。未コミットの変更があれば、消さずに人間に伝える
  - `git -C <path> log origin/<ブランチ>..HEAD --oneline` で、push していないコミットがないか見る。あれば消さずに人間に伝える
- **Docker**: worktree の `.env` にある `COMPOSE_PROJECT_NAME`（なければ worktree のフォルダ名）を控える。`docker ps -a` と `docker volume ls` で、そのプロジェクト名のコンテナとボリュームを確かめる
- **Orca のワーカー**: dual-implement の Run が残っていれば、`orca orchestration worker-list --run <run_id> --terminal-state reclaimable --json` で、片付けていないワーカーのターミナルを確かめる
- **リモートのブランチ**: 採用した PR のブランチはマージ時に消す。**採らない PR のブランチは残す**（あとでコードを見返せるように）

## 3. 人間に確認する（1回だけ）
次を一覧で見せて、実行してよいか聞く。
- マージする PR（番号・タイトル・方式は squash）と、閉じる Issue
- 閉じる PR と、コメントに書く理由（人間が理由を渡していなければ、dual-implement の報告や PR のレビューから一行で案を出す）
- 消す worktree・ローカルブランチ・Docker のコンテナとボリューム・ワーカーのターミナル
- 消さずに残すもの（採らない PR のリモートブランチ、未コミットの変更が見つかったもの、など）

## 4. マージする
- `gh pr merge P --squash --delete-branch`
- `gh issue view N --json state` で Issue が閉じたことを確かめる。閉じていなければ、`gh issue close N --comment "PR #P でマージ"` で閉じる

## 5. 採らない PR を閉じる
- `gh pr close <番号> --comment "<理由>（今回は PR #P を採用）"`。`--delete-branch` は付けない

## 6. 後片付け
worktree ごとに、次の順で行う。
1. Docker を止めて消す: worktree の中で `docker compose -p <プロジェクト名> down -v --remove-orphans`。worktree がすでに無ければ `docker rm` / `docker volume rm` で、手順2で控えた名前のものを消す
2. Orca のワーカーのターミナルを片付ける: 手順2で見つかったものを `orca orchestration worker-release --dispatch <dispatch_id> --json` で片付ける。ワーカーではない、人間が開いたターミナルは閉じない
3. worktree を消す: `orca worktree rm --worktree path:<path> --json`（Orca と git の両方から消える）。消えるまで少しかかることがあるので、`git worktree list` で消えたことを確かめる
4. ローカルブランチ: Orca が一緒に消すことが多い。`git branch` に残っていたら、採用した PR のブランチは `git branch -D`、採らない PR のブランチはリモートに残っていることを確かめてから `git branch -D`

最後に main を最新にする: `git checkout main && git pull`

## 7. 記録を更新する
- `docs/next-issues.md` の「現在地」で、この Issue を完了にする（採用した PR と、採らなかった PR を書く）。「次の一手」も実態に合わせる
- main にコミットして push する。コミットメッセージは `docs: record #N done in next-issues`

## 8. 人間に報告する
- やったこと: マージした PR、閉じた Issue と PR、消したもの、残したもの
- できなかったこと（あれば）と、その理由
- ふりかえり（⑧）の材料: dual-implement の報告や PR のレビューで出た、仕様の発見・エージェントの傾向・別 Issue にする候補を箇条書きで。どこに戻すか（spec.md / CLAUDE.md・スキル / 新しい Issue）の案も添える
