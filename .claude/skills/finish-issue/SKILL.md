---
name: finish-issue
description: 採用する PR が決まったあと、マージ・採らない PR を閉じる・worktree や Docker の後片付けまでを行う（workflow.md の⑦）。Claude Code では「/finish-issue 5」、Codex では「$finish-issue 5」のように、採用する PR の番号を渡して使う。dual-implement のあとにコーディネーターへ指示する想定。
argument-hint: <採用するPR番号>
disable-model-invocation: true
model: sonnet
effort: medium
allowed-tools: Bash(bash .claude/skills/finish-issue/scripts/finish.sh *)
---

# 採用した PR をマージして、後片付けをする

- 以下の `P` は、人間が渡した**採用する PR の番号**（Claude Code では $ARGUMENTS）。渡されていなければ聞く。採らない PR の閉じる理由を人間が添えていれば、それを使う
- このスキルの本体は `.claude/skills/finish-issue/`。Codex 用の `.agents/skills/finish-issue` はこのフォルダへのシンボリックリンクなので、直すのはここだけでよい
- プロジェクト固有の値（リポジトリ・確認コマンド・ポート・画面確認の幅など）は、CLAUDE.md（Codex では AGENTS.md）の「開発設定」から読む。このスキルには直接書かない
- 人間が呼んだときだけ使う（Claude Code は `disable-model-invocation`、Codex は `agents/openai.yaml` で自動の呼び出しを止めている）。Claude Code ではこのスキルのターンは Sonnet で動く。Codex にはスキルごとのモデル指定がないので、コーディネーターのモデルのまま動く
- 機械的な操作は `bash .claude/skills/finish-issue/scripts/finish.sh <サブコマンド>` で行う（リポジトリのルートで実行）。判断と確認はこのスキルの手順で済ませてから呼ぶ。スクリプトが止まったら、無理に手で続けず人間に伝える
- 消すものは、必ず中身を見てから消す。手順3で人間の確認を1回だけ取り、そのあとは止まらずに進める
- ふりかえり（⑧）はしない。最後に、ふりかえりの材料を人間に渡して終わる

## 1. 対象を確かめる
- `gh pr view P --json number,title,state,mergeable,mergeStateStatus,headRefName,headRefOid,body,url` で、PR が OPEN でマージできる状態か見る。head の SHA を控える
- `gh pr checks P` で CI がすべて成功しているか見る。失敗・実行中なら止めて人間に伝える
- PR 本文の `Closes #番号` から Issue 番号 `N` を取る
- `docs/testing.md` を読み、PR コメント・レビューと Issue レポートで、採用判断に使うレビューが現在の head を確認しているか、必須指摘が解消されているか確かめる。dual-implement を使った場合は相互レビューと適用対象の品質レビューを確認し、欠けている場合は同スキルの手順6〜7の該当部分で補う。通常の単独実装には、依頼されていない dual-implement を新たに始めない。実装者の報告や古い SHA のレビューを現在の確認済みとして扱わず、修正後の再確認を終えてから進む
- 画面を含む Issue（本文に「レビュー時の実機確認」がある）なら、人間の実機確認の結果が PR のコメントかレビューに残っているか見る。無ければ手順3で「実機確認の記録がない」と伝える（マージを止めるかは人間が決める）
- 同じ Issue を扱う、採らない PR を探す: `gh pr list --state open --json number,title,headRefName,body` から、本文に `#N` があるもの、またはブランチ名に `issue-N-` を含むもの

## 2. 片付ける対象を洗い出す
- **worktree**: `orca worktree list --json` と `git worktree list` から、この Issue 用のもの（`issue-N-claude` / `issue-N-codex` など、手順1の PR のブランチを使っているもの）。main の worktree は対象外
  - 品質レビューを行った場合は、Issue レポートと Run の記録にある `issue-N-quality-pr-P` の作業場所も含める。名前だけで判断せず、対象 PR・パス・ブランチ・レビュー対象 SHA を照合する
  - それぞれ `git -C <path> status -s` で、未コミットの変更がないか見る（`dist/` などの無視されたファイルと `.env` は消えてよい）。未コミットの変更があれば、消さずに人間に伝える
  - 実装ブランチは `git -C <path> log origin/<ブランチ>..HEAD --oneline` で、push していないコミットがないか見る。あれば消さずに人間に伝える
  - push しないレビュー専用ブランチは、HEAD が記録した対象 SHA と一致し、その SHA を元の PR から参照できることを確かめる。不一致や記録不足なら削除しない。リモートブランチが無いことだけを未保存の作業とは扱わない
- **Docker**: worktree の `.env` にある `COMPOSE_PROJECT_NAME`（なければ worktree のフォルダ名）を控える。`docker ps -a` と `docker volume ls` で、そのプロジェクト名のコンテナとボリュームを確かめる
- **Orca のワーカー**: dual-implement の Run が残っていれば、`orca orchestration worker-list --run <run_id> --terminal-state reclaimable --json` で、片付けていないワーカーのターミナルを確かめる
- **リモートのブランチ**: 採用した PR のブランチはマージ時に消す。**採らない PR のブランチは残す**（あとでコードを見返せるように）
- **レポートの材料**: `docs/issue-reports/README.md` を読み、`docs/issue-reports/issue-N.md` に計画・承認・実装・検証・レビューの記録を集める。相互レビューと品質レビューの対象 SHA・結果・修正後の再確認を区別し、試行時の有効な指摘・誤検出・所要時間も引き継ぐ。既存レポートは引き継ぎ、なければ下書きを作る。worktree を消す前に必要な証拠を残し、分からない内容は「記録なし」「未確認」とする

## 3. 人間に確認する（1回だけ）
次を一覧で見せて、実行してよいか聞く。
- マージする PR（番号・タイトル・方式は CLAUDE.md（AGENTS.md）の「開発設定」のマージ方式）と、閉じる Issue
- 画面を含む Issue なら、実機確認の記録の有無
- 閉じる PR と、コメントに書く理由（人間が理由を渡していなければ、dual-implement の報告や PR のレビューから一行で案を出す）
- 消す worktree・ローカルブランチ・Docker のコンテナとボリューム・ワーカーのターミナル
- 消さずに残すもの（採らない PR のリモートブランチ、未コミットの変更が見つかったもの、など）
- 更新して main にコミット・push する記録（next-issues.md と Issue レポート）

## 4. マージする
- マージ直前に head が手順1から変わっていないことと CI を再確認する。変わっていれば手順1のレビュー確認へ戻り、古い証拠のままマージしない
- `bash .claude/skills/finish-issue/scripts/finish.sh merge P <確認済みの SHA>`（squash・ブランチ削除・head の SHA の一致を条件にマージ）。head の不一致で拒否された場合は SHA の制約を外さず、再確認する
- `gh issue view N --json state` で Issue が閉じたことを確かめる。閉じていなければ、`gh issue close N --comment "PR #P でマージ"` で閉じる

## 5. 採らない PR を閉じる
- `bash .claude/skills/finish-issue/scripts/finish.sh close-pr <番号> "<理由>（今回は PR #P を採用）"`。リモートのブランチは残る

## 6. 後片付け
worktree ごとに、次の順で行う。
1. Docker を止めて消す: `bash .claude/skills/finish-issue/scripts/finish.sh docker-down <プロジェクト名>`（そのプロジェクトのコンテナ・ボリューム・ネットワークを消す。worktree が無くても動く）。Docker を使わなかったレビュー専用 worktree ではこの操作は不要
2. Orca のワーカーのターミナルを片付ける: 手順2で見つかったものを `orca orchestration worker-release --dispatch <dispatch_id> --json` で片付ける。ワーカーではない、人間が開いたターミナルは閉じない
3. worktree を消す: `bash .claude/skills/finish-issue/scripts/finish.sh remove-worktree <絶対パス>`（main の worktree と、未コミットの変更がある worktree は消さずに止まる。消えるまで最大30秒待つ）
4. ローカルブランチ: Orca が一緒に消すことが多い。残っていたら、採用した PR のブランチは `finish.sh delete-branch <ブランチ>`、採らない PR のブランチは `finish.sh delete-branch <ブランチ> --remote-required`（リモートに残っているときだけ消す）。レビュー専用ブランチは手順2の SHA・PR への参照・未保存の変更が無いことを確かめたものだけを消す

最後に main を最新にする: `bash .claude/skills/finish-issue/scripts/finish.sh sync-main`

## 7. 記録を更新する
- `docs/next-issues.md` の「現在地」で、この Issue を完了にする（採用した PR と、採らなかった PR を書く）。「次の一手」も実態に合わせる
- `docs/issue-reports/issue-N.md` に、採用・不採用の理由、マージ結果、削除・保管した資源、未完了事項と改善候補を追記する。受け入れ条件の判定と PR・CI・レビューへのリンクを確かめ、レポートの状態を実態に合わせる。`docs/issue-reports/README.md` の一覧にもリンクを追加する
- レポートは完了処理とふりかえりの材料を記録するもの。改善候補は対応状態と戻す先を記し、未実装のものを完了としない
- 変更した記録をまとめて main にコミットして push する。コミットメッセージは `docs: record #N completion`

## 8. 人間に報告する
- 保存した Issue レポートへのリンク
- やったこと: マージした PR、閉じた Issue と PR、消したもの、残したもの
- できなかったこと（あれば）と、その理由
- ふりかえり（⑧）の材料: dual-implement の報告や PR のレビューで出た、仕様の発見・エージェントの傾向・別 Issue にする候補を箇条書きで。どこに戻すか（spec.md / CLAUDE.md・スキル / 新しい Issue）の案も添える
