---
name: dual-implement
description: GitHub Issue を1本、Claude Code と Codex の両方に実装させ、相互レビューと対象 Issue の独立した品質レビューを経て、結果と一次判断を人間に見せる（workflow.md の③〜⑥）。Claude Code では「/dual-implement 4」、Codex では「$dual-implement 4」のように Issue 番号を渡して使う。Orca のターミナルから実行する。
argument-hint: <Issue番号>
disable-model-invocation: true
---

# Issue を Claude Code と Codex で並行して実装し、相互レビューする

あなたは**コーディネーター**。自分ではコードを書かない。Orca のワーカーに実装とレビューをさせ、人間との窓口になる。
流れの背景は `docs/workflow.md`（③着手〜⑥レビュー、ステップ6の「2つのエージェントで作らせて比べる」）にある。

- 以下の `N` は、人間が渡した Issue 番号（Claude Code では $ARGUMENTS）。渡されていなければ聞く
- このスキルの本体は `.claude/skills/dual-implement/`。Codex 用の `.agents/skills/dual-implement` はこのフォルダへのシンボリックリンクなので、直すのはここだけでよい。どちらがコーディネーターでも、ワーカーは Claude Code と Codex の1つずつ
- プロジェクト固有の値（リポジトリ・確認コマンド・ポート・画面確認の幅など）は、CLAUDE.md（Codex では AGENTS.md）の「開発設定」から読む。このスキルには直接書かない
- 人間が呼んだときだけ使う（Claude Code は `disable-model-invocation`、Codex は `agents/openai.yaml` で自動の呼び出しを止めている）
- `orca` コマンドは Orca のターミナルの中で使う。最初に `orca skills get orchestration` を読み、そこに書かれた安全のルール（完了の証拠がないワーカーを止めない・二重に起動しない、など）に従う
- 以降の `orca` は、スキルを読むために使えた同じ実行ファイルを使う。PATH 上の同名コマンドが使えるとは仮定しない
- **マージ（⑦）はしない。** 人間が判断する
- 人間に聞く場面は2回だけ: 手順4（計画承認）と手順7（最終報告）。それ以外は止まらずに進める
- 待つときは `orca orchestration check --wait --timeout-ms 60000` を繰り返す。時間切れは失敗ではない。進捗を伝えながら待ち続ける

## モデルの指定
- **実装ワーカー**: `--model` を付けない。各ツールの既定を使う（Claude Code は既定の Opus 5.5・effort medium、Codex は `~/.codex/config.toml` の `gpt-6.1-sol`・high）。既定はスキルではなく各ツールの設定で管理する
- **レビュー（相互・品質）**: Claude Code は `--model opus --effort high`、Codex は `--model gpt-6.1-sol --effort high` を付ける（両社とも、ロジックを追うレビューは high を勧めている）
- 人間が別のモデルや effort を指定したら、それに従う。Codex の `ultra` は使わない（自動で仕事を分けるため、コストが読めない）
- `worker-start --json` の `launch.requested` と `launch.effective` を、ワーカーごとにそのまま控える。モデルと effort は項目ごとに確認し、effective が `null` や欠落なら「実行値は未確認」と記録する。明示指定せず既定を使った場合は「既定継承」と併記するが、設定値やコミットの署名で実行値を補完しない。別途実行値を観測できた場合は出所とともに区別して残し、エイリアスは具体的なモデル名へ推測で展開しない。明示的な要求と確認できた effective が食い違う場合は知らせる

## 1. 事前確認
- `gh issue view N --json title,body,comments` で目的・受け入れ条件・スコープ外を読む
- Issue に「前提」「依存」「着手条件」として書かれた Issue や PR がすべて閉じている／マージ済みか確かめる。まだなら止めて人間に伝える
- 着手条件に「確認中」「未決」の仕様が残っていないか確かめる。残っていれば、ワーカーを起動せずに止めて人間に伝える（設計の席で決めてから回す）
- Issue が画面を含むかを見ておく（受け入れ条件に画面での確認や「レビュー時の実機確認」があるか）。手順4・7で使う
- `git pull` で main を最新にする。`docs/spec.md` の、Issue がリンクしている箇所を読む
- `docs/testing.md` を読み、E2E の導入状況と品質レビューの適用を確認する。#8・#9 は試行として品質レビューを追加し、それ以外は人間から明示的な指定がある場合に追加する。手順4の計画提示でもこの分担を伝える
- `docs/next-issues.md` と前回・依存Issueのレポートから、今回試す改善と持ち越した確認を拾う。両計画で壊れ方の具体例・検出方法と、前回の改善の効果を確認する場面が示されているか確かめる
- `orca status --json` でランタイムが動いていることを確かめる

## 2. Run を作る
```
orca orchestration run-create --objective "Issue #N を Claude Code と Codex で並行実装し、レビューと比較を行う" --json
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

それぞれの `worker-start --json` の結果から、dispatch ID と worktree の絶対パス（`path`）を控えておく（手順6で使う）。見つからなければ `orca worktree list --json` で `issue-N-claude` / `issue-N-codex` を探す。

`worker-start` が 0 以外で終わったら、起動し直さない。結果の `failedStage` と `recovery` を読み、`orca skills get orchestration --reference references/recovery-and-cleanup.md` に従う。

### 実装用の指示（`--spec` に入れる。<…> は埋める）
```
対象: GitHub Issue #N（リポジトリは CLAUDE.md（AGENTS.md）の「開発設定」）。この worktree の中だけで作業する。
やること: <.claude または .agents>/skills/implement-issue/SKILL.md の5手順と docs/testing.md に従って Issue #N を実装し、PR を作る。ただし次の点だけ手順を置き換える。
- 最初に、worktree の直下に .env を作る（コミットしない）: HOST_PORT=<ポート> と COMPOSE_PROJECT_NAME=issue-N-<claude|codex>
- 手順3の計画は、人間に直接聞かず、指示文の先頭に付いている ask コマンド（orca orchestration ask）で、計画の全文を質問として送る。返事が来るまで実装を始めない。返事に修正の指示があれば従う。ask が時間切れになったら、同じ message ID で --resume して待ち続ける（勝手に進めない）
- 手順5の PR のタイトルの先頭に「[<Claude Code|Codex>]」を付ける。PR 本文の先頭に「作成: <Claude Code|Codex>」と書く
守ること: CLAUDE.md（AGENTS.md）の「守ること」。Issue のスコープ外はやらない。main に直接 push しない。
画面を含む Issue では、implement-issue の手順4に従って Orca のブラウザで「開発設定」の画面確認の幅（スマホ幅と PC 幅）を確かめ、手順5の形で PR に書く。開発サーバーは自分の .env のポートで起動し、確認が終わったら止める。スマホ実機での確認はしない（レビュー時に人間が行う）。
完了の条件: PR ができていて、「開発設定」の確認コマンドと、導入済みで対象となる E2E がすべて通っている。画面を含む場合は、画面確認の結果（または確かめられなかった理由）が PR にある。worker_done の要約に PR の URL と head の SHA を書く。
```
- ポートは CLAUDE.md（AGENTS.md）の「開発設定」の「実装（Claude Code）」「実装（Codex）」を使う（main の開発サーバーのポートとぶつけない）

## 4. 計画を人間に見せて承認をもらう（④ 関所）
- `check --wait --types question,worker_done,escalation` で、2つのワーカーから計画（question）が届くのを待つ
- **2つとも届いてから**、人間に並べて見せる。片方が計画を出す前に failed / escalation で終わったら、届いた1つだけを見せて、その旨を書く。見せ方:
  - それぞれの計画の要約（受け入れ条件ごとの満たし方・作る/変えるファイル・テスト）
  - 2つの計画の主な違い
  - 各ワーカーの「確認したいこと」
  - コーディネーターとしての所見: スコープ外に踏み込んでいないか、受け入れ条件の抜け、spec.md との食い違い。期待結果が仕様から決まり、テストの層・モックを使う理由・E2E の扱いが明確か。機能追加・振る舞いの変更ではテストを実装より先に書く順番になっているか。対象外・例外は `docs/testing.md` 1章に沿った検証方法があるか。画面を含む Issue では、画面の確認方法が計画にあるか
  - 相互レビューに加えて品質レビューを行うかどうか
- 人間の答えを、それぞれの質問に `orca orchestration reply --id <message_id> --body "<答え>" --json` で返す。返したら、そのバッチを `--ack` する
  - 両者の計画・確認事項と人間の回答を、手順7のレポートに残せるよう控える
- 人間が「仕様の穴なので止める」と言ったら、ワーカーに中止を伝えて、手順7の形で状況だけ報告して終わる

## 5. 実装の完了を待つ
- 2つの `worker_done` が届くまで待つ。途中で質問が来たら、自分で答えられる実装上の選択なら答える。仕様を決めることになる質問なら人間に聞く（workflow.md「迷ったときの判断基準」）
- `worker_done` の `outcome` が `failed` なら、相互レビューには進まず、手順7で状況を報告する
- 完了したワーカーは `orca orchestration worker-release --dispatch <dispatch_id> --json` で片付ける
- 2つの PR の番号は、`worker_done` の要約にある URL から取る。なければ `gh pr list --json number,headRefName,title` で、ブランチ名（issue-N-claude / issue-N-codex を含む）かタイトルの「[Claude Code]」「[Codex]」で見分ける

## 6. 対象コミットをそろえてレビューする

### 6.1 レビューの準備

- PR ごとに `gh pr view <番号> --json number,headRefName,headRefOid,url` で対象 SHA を記録する。実装 worktree の `git rev-parse HEAD` と一致し、`git status --short` が空であることを確かめる。違う場合は原因を調べ、安全にそろえてから始める。未保存の変更を消してそろえない
- レビュー中は実装を変更しない。相互レビューと品質レビューには同じ SHA を渡す。各ワーカーの dispatch ID、役割、PR、対象 SHA、開始・終了時刻、worktree のパスとブランチを控え、レポートと後片付けに使う

### 6.2 相互レビュー

**相手の** worktree に、レビュー用のワーカーを起動する。Claude Code が Codex の PR を、Codex が Claude Code の PR をレビューする。

```
orca orchestration worker-start --spec "<下のレビュー用の指示>" --task-title "#N レビュー（Claude Code → Codex の PR）" \
  --worktree path:<issue-N-codex の worktree の絶対パス> --agent claude --model opus --effort high --json
orca orchestration worker-start --spec "<下のレビュー用の指示>" --task-title "#N レビュー（Codex → Claude Code の PR）" \
  --worktree path:<issue-N-claude の worktree の絶対パス> --agent codex --model gpt-6.1-sol --effort high --json
```

### 相互レビュー用の指示（`--spec` に入れる）
```
対象: PR #<番号>（リポジトリは CLAUDE.md（AGENTS.md）の「開発設定」）。Issue #N、head SHA <SHA>。
やること: docs/testing.md の相互レビューを行う。ソース・設定・テストは編集しない・コミットしない・push しない。HEAD が指定 SHA と一致し、未コミットの変更がないことを確認してから始める。他者のレビュー結論を読む前に自分の結果をまとめる。
見ること:
- Issue #N の受け入れ条件を1つずつ満たしているか（gh issue view N）
- docs/spec.md と CLAUDE.md（AGENTS.md）の「守ること」に反していないか
- PR の説明・差分に加え、実コードとテスト、関連する呼び出し元・依存先・既存テストを読んで影響を確かめる
- テストファースト: `docs/testing.md` 1章に従い、機能追加・振る舞いの変更ではテストのコミットが実装より前にあるか（`gh pr view <番号> --json commits` や git log で確かめる）、対象の振る舞いによる実装前の失敗の記録が PR にあるか、先に書いたテストが後から弱められていないかを確認する。対象外・例外では理由と検証結果を読み、振る舞いを変えない整理には変更前後の成功を求める
- バグ、壊れやすい作り、スコープ外の変更、不要な依存の追加
- PR 本文の「確認したいこと」が正直に書かれているか
- 画面を含む場合: PR に書かれた環境・画面幅・操作・結果が具体的か。implement-issue の手順4に従い、自分でも「開発設定」の画面確認の幅（スマホ幅と PC 幅）で変更に関係する主要操作を確かめる。DOM テストだけで画面確認済みとしない。ブラウザのタブは自分で開いたものだけを使う
検証: 「開発設定」の確認コマンドと、導入済みで対象となる E2E を指定 SHA で再実行する。.env はすでにある。既存のコンテナは止めず、自分で起動したものだけを片付ける。環境上できない項目は理由と未確認範囲を記し、CI・実装者の報告・自分の再確認を区別する。
出力: レビュー結果を gh pr comment <番号> --body-file <ファイル> で PR にコメントする。ファイルは worktree の外（/tmp など）に書く。先頭に「相互レビュー: <Claude Code|Codex>」と対象 SHA を書く。中身は次の形:
- 受け入れ条件ごとの判定（満たす / 満たさない / 確かめられない）と根拠
- 読んだ周辺コードの範囲と検証結果。自分で実行したこと、他者の証拠、未確認の範囲を分ける
- 指摘の一覧。1件ごとに: 重さ（必須 / 推奨 / 好み）、ファイル:行、発生条件・影響、仕様やコードなどの根拠、修正案。推測は未確認と書く
- 総評（2〜3行）
完了の条件: コメントが PR に付いている。終了時に HEAD・PR の head・作業場所の未コミット変更を再確認し、変化があればコーディネーターへ知らせる。worker_done の要約に対象 SHA とコメントの URL を書く。
```

### 6.3 独立した品質レビュー（適用する Issue のみ）

PR ごとに新しいセッションと専用 worktree を作り、空き枠の範囲で相互レビューと並行して進める。CLI の安全上同時に起動できない場合は順に実行する。実装者と同じエージェントでもセッションは引き継がない。相互レビューとは別の観点を渡す。

```
orca orchestration worker-start --spec "<下の品質レビュー用の指示>" --task-title "#N 品質レビュー（PR #<P>）" \
  --worktree new-top-level --repo path:<このリポジトリの絶対パス> --base-branch <対象 PR の headRefName> \
  --name issue-N-quality-pr-P --setup skip --agent <claude|codex> --model <opus|gpt-6.1-sol> --effort high --json
```

- Claude Code の実装 PR は新しい Claude Code セッション、Codex の実装 PR は新しい Codex セッションで品質レビューする。既存の相互レビューは相手側のエージェントが担当する
- `--base-branch` は手順6.1で対象 SHA と一致を確認した実装ブランチを使う。新しい worktree の HEAD も対象 SHA と照合する。起動後のパスと新しいローカルブランチ名を必ず控える。このブランチは push しない
- 静的な確認から始めるため、自動セットアップは `--setup skip` で省く。実行環境が必要になった場合だけ、品質担当が自身の作業場所に用意する
- 品質担当は原則として静的な確認を担う。実行が必要な場合は自分の作業場所だけを使い、Docker が必要なら `.env` に専用のポート（CLAUDE.md（AGENTS.md）の「開発設定」の「品質レビュー」）と `COMPOSE_PROJECT_NAME=issue-N-quality-pr-P` を指定する。ポートの空きを確認し、使用中なら未使用の番号を選んで記録する

### 品質レビュー用の指示（`--spec` に入れる）
```
対象: PR #<番号>（リポジトリは CLAUDE.md（AGENTS.md）の「開発設定」）。Issue #N、head SHA <SHA>。この品質レビュー専用 worktree だけを使う。
やること: docs/testing.md の品質レビューを行う。Issue と spec.md を読んでから、差分、実コード・テスト、関連する呼び出し元と依存先を確認する。HEAD が指定 SHA と一致し、未コミットの変更がないことを確認してから始める。実装セッションの結論や他者のレビューには頼らず、他のレビューコメントを読む前に自分の結果をまとめる。
重点: 責務の分け方、状態の重複・同期、依存の向き、型と境界、過剰な抽象化、変更のしやすさ。テストは実物を組み合わせているか、仕様から期待値が決まり、もっともらしい誤りを検出できるか、モックや snapshot で実際の結合を隠していないかを見る。
制約: ソース・設定・テストは編集せず、コミット・push しない。相互レビューのコマンド実行を一律に重複させる必要はない。実行が必要なら専用 worktree を使い、Docker は指定された専用のポート <ポート> とプロジェクト名 <プロジェクト名> で起動する（未追跡の .env だけは作ってよい）。他の worktree・コンテナ・ブラウザのタブを操作しない。具体的な影響のない好みや推測上の将来要件を理由に、修正を必須にしない。
出力: gh pr comment <番号> --body-file <worktree 外の一時ファイル> で結果を投稿する。先頭に「品質レビュー: <Claude Code|Codex>」と対象 SHA を書く。読んだコードの範囲、自分で実行した確認と未確認の範囲、指摘の一覧、総評を残す。各指摘には重さ（必須 / 推奨 / 好み）、ファイル:行、条件・具体的な影響、根拠、修正案を付ける。問題が見つからなければその旨を書く。受け入れ条件の判定表の作り直しは不要。
完了の条件: コメントが PR に付いている。自分で起動したコンテナを止め、HEAD・PR の head・未コミット変更を再確認する。変化があればコーディネーターへ知らせる。worker_done に対象 SHA、コメント URL、使用したポートと Docker プロジェクト名（使った場合）を書く。
```

適用したすべてのレビューの `worker_done` を待ち、手順5と同じように完了したワーカーを片付ける。失敗・未完了のレビューは完了扱いにせず、理由と残作業を報告に残す。品質レビューの worktree は手順7の確認と finish-issue の後片付けまで残す。

## 7. まとめて一次判断し、人間に報告する
レビューの指摘をそのまま信じない。コーディネーター自身が裏を取ってから報告する。
- `gh pr view <番号> --comments` で両 PR の相互レビューと、適用した品質レビューを読む
- `gh pr checks <番号>` で CI の結果を見る
- 指摘ごとに差分と関連するコード・仕様で確かめ、「確認できた / 誤り / 判断できない」を付ける。重複をまとめ、今回の必須修正と独立した改善の候補を分ける
- `headRefOid` を再取得し、レビュー対象と一致するか確かめる。修正された場合は、必要な担当者に更新差分と影響範囲を再確認させ、最新 SHA の結果を残す。古いレビューだけで採用可能としない。未解消の必須指摘や未完了の確認は最終報告に明記する

コーディネーターが `docs/issue-reports/README.md` の保存方法に従い、main の作業場所で `docs/issue-reports/issue-N.md` を作成・更新する。計画・承認・両実装・検証・レビュー・一次判断を1ファイルにまとめる。レビュー完了後は「採用待ち」、失敗や中止時はその状態と残作業を記す。ワーカーにはこのファイルを編集させず、コミット・push は finish-issue の記録更新で行う。会話での報告にもレポートへのリンクを添える。

品質レビューを行った場合は、相互レビューと区別してコメント・対象 SHA・独自に見つかった有効な指摘・誤検出と除外理由・所要時間を残す。同時実行した各担当の時間と、全体の終了までに増えた待ち時間を区別し、測れなかったものは「記録なし」とする。レビュー専用 worktree・ローカルブランチ・Docker 資源の一覧も記録する。

`docs/testing.md` 5章の評価方法に従い、二重実装の比較から採った改善と品質レビューの独自指摘を分け、採用先・修正と再確認・残件・誤検出による手戻りを残す。#9では#8と#18の結果も引き継ぎ、finish-issueで担当構成を評価できる材料をそろえる。

報告の形（日本語）:
1. **概要**: 2つの PR の番号・URL・CI の結果。各ワーカー（実装・レビュー）のモデルと effort の起動記録、別途観測できた実行値、未確認の項目を「モデルの指定」の区別で報告する
2. **受け入れ条件の表**: 行が受け入れ条件、列が2つの PR。○ / × / ？ と一言。画面での確認は「エージェントが Orca のブラウザで確認済み / 未確認（理由）」を分けて書く
   - 人間の実機確認と区切り全体の達成は別に示す。持ち越した項目は担当・確認時点・記録先を示し、未確認を合格に含めない
3. **確認できた指摘**: PR ごとに、重さ順。誤りだった指摘は「除外した理由」と一緒に短く
4. **spec.md との関係**: 仕様の抜けや食い違いが見つかったら、spec.md に戻す候補として書く
5. **一次判断**: どちらを採るかの推奨と理由。採る PR をマージ前に直すべき点（あれば）。別 Issue にする改善点の候補
6. **人間にやってほしいこと**:
   - 画面を含む Issue では、Issue の「レビュー時の実機確認」の項目をそのまま並べ、スマホ実機での確かめ方を添える（どの worktree で `docker compose up` し、スマホでどの URL（Mac の LAN の IP とポート）を開くか）。結果は PR にコメントで残すよう頼む
   - `/finish-issue <採る PR 番号>` で、マージ・後片付け・ふりかえりの結果と改善案の共有、人間が承認した改善の反映まで行えること（採らない理由を一言添える）

最後に `orca orchestration worker-list --run <run_id> --terminal-state reclaimable --json` が空であることを確かめてから終える。
