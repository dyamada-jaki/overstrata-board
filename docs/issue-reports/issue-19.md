# Issue #19 対応レポート

## 1. 概要

- Issue: [#19 StrykerJSでミューテーションテストを導入する](https://github.com/dyamada-jaki/overstrata-board/issues/19)
- 日付: 2026-10-17〜18（JST）。
- 状態: **PR #24を採用し、mainへのマージ・main CI 4項目・対象資源の後片付けが完了。Issue #19と不採用PR #23はクローズ済み**。承認された事前検査の改善は取り込み・再確認済み、[#25](https://github.com/dyamada-jaki/overstrata-board/issues/25)と、ふりかえり後に登録を承認された[#26](https://github.com/dyamada-jaki/overstrata-board/issues/26)は登録済み・未実装。採用・完了処理は8章、ふりかえりは9章。
- 仕様・方針: [spec.md](../spec.md)、[testing.md](../testing.md)、[workflow.md](../workflow.md)。
- 共通開始コミット: `25feb64b52d592d264adb3dd35215cf67d3c2f54`。
- 並行試行Run: `run_fb3062e32a56`。作成16:10:22 JST。もう一方の記録は[Issue #18](issue-18.md)。

## 2. 目的と範囲

既存のVitest・React Testing Libraryを使うStrykerJSの実行入口・CI・レポートを導入する。#18のテスト補強や既存テスト不足の網羅的な修正は含めない。

実機確認は#8から#9へ持ち越した項目として追う。本Issueの自動検証に成功しても実機確認済み・区切り1達成とはしない。

## 3. 計画と人間の判断

利用者が「並行して実装をする、ということのテストも兼ねて、18と19をdual-implementで並行開発」と指示した。通常の1Issueずつの運用に対する今回の例外として、両IssueでClaude CodeとCodexを1担当ずつ起動した。今回の指示は並行着手の承認であり、各担当の具体的な実装計画の承認は別に記録する。

- 実装・初回相互レビューは並行する。独立した品質レビューは今回は対象外（#8・#9の試行方針を維持）。
- 取り込みは#18 → #19、その後#9。マージ・後片付け・mainの共通記録更新はコーディネーターが直列で行う。
- #19の初回測定は#18反映前の対象SHAで記録する。#18のmain取り込み後、#19の両候補に最新mainを反映し、通常チェック・ミューテーション・影響範囲のレビューを更新する。統合確認の実施記録は7章。
- #18の担当範囲を#19に独自実装しない。見つかった不足は対応先を分ける。
- 具体的な計画・確認事項・承認回答は本書の6章に記録した。

## 4. 担当と資源

| 担当 | Task / Dispatch | worktree・ブランチ | 開発ポート / Docker project |
|---|---|---|---|
| Claude Code | `task_dc9f40868b99` / `ctx_8b6972d5f0ee` | `/Users/jaki/orca/workspaces/overstrata-board/issue-19-claude` / `dyamada-jaki/issue-19-claude` | 5191 / `issue-19-claude` |
| Codex | `task_be6df9f8f585` / `ctx_f68b53863137` | `/Users/jaki/orca/workspaces/overstrata-board/issue-19-codex` / `dyamada-jaki/issue-19-codex` | 5192 / `issue-19-codex` |

起動前に5181・5182・5191・5192が空いていることを確認し、起動中のDockerコンテナはなかった。全4担当について、別worktreeが共通開始コミットから作られ、起動receiptの `state=ready` と `input_accepted` を確認した。これは実装完了の証拠ではない。

実装時のモデル・effortは明示指定せず既定継承。各receiptの `launch.requested.model/effort` と `launch.effective.model/effort` はすべて `null`。これだけでは具体的な実行値は未確認であり、別の実行観測が得られた場合は出所とともに追記する。

別途の観測: 2026-10-17 16:17:59 JSTのOrca worker-list（agent_status由来のprojection.provider）でCodexのmodelがgpt-6.1-solと表示された。Claudeのmodelはnull、両者のeffortはこの観測では未確認。launch.effectiveのnullとは区別して記録する。

## 5. 初回の検証・レビュー・一次判断（#18反映前）

本章は初回レビュー時点の記録。ここで未実施・未修正とした事項のうち、承認された統合・改善の現在の状態は7章に記す。

| 担当 | PR / 対象SHA | 現時点の検証 |
|---|---|---|
| Codex | [PR #23](https://github.com/dyamada-jaki/overstrata-board/pull/23) / `cf4b3a8b2950e6f01b7175a439bb03d36c38749a` | 通常4チェック・E2E・ホスト/Dockerの全対象測定を報告。コーディネーターも同じheadのCI 4ジョブSUCCESS、worktree HEAD一致・未コミット変更なしを確認 |
| Claude Code | [PR #24](https://github.com/dyamada-jaki/overstrata-board/pull/24) / `cc8ae2044d8031bf4d5449a18f55ecd13d12f5b4` | 同じく通常4チェック・E2E・ホスト/Dockerの全対象測定を報告。コーディネーターも同じheadのCI 4ジョブSUCCESS、worktree HEAD一致・未コミット変更なしを確認 |

Codexのworker_doneは17:09:10 JSTの `msg_a0999653b94a`。Task `task_be6df9f8f585` / Dispatch `ctx_f68b53863137`・送信元・outcome=succeeded・completed状態と照合してreleaseし、archive capturedを確認した。相互レビューは両実装完了後に開始する。

Claude Codeのworker_doneは17:16:03 JSTの `msg_e192a640db06`。Task `task_dc9f40868b99` / Dispatch `ctx_8b6972d5f0ee`を同様に照合・releaseし、archive capturedを確認した。コーディネーターは両案の実行入口・互換処理・集計ガード・設定・CI・文書の実コードも読んだ。実装担当の完了後、両worktreeのHEAD・PR head・cleanを再確認して次のレビューを起動した。

### 相互レビュー

| 対象 | 担当 / Task / Dispatch | 開始（JST） | requested / effective |
|---|---|---|---|
| PR #23 / `cf4b3a8b2950e6f01b7175a439bb03d36c38749a` | Claude Code / `task_e345f6d47d49` / `ctx_b48f491fd248` | 17:16:57 | 両方 `opus` / `high` |
| PR #24 / `cc8ae2044d8031bf4d5449a18f55ecd13d12f5b4` | Codex / `task_62e717b21ecd` / `ctx_9f05959b1bc9` | 17:17:13 | 両方 `gpt-6.1-sol` / `high` |

各実装worktreeで新しいセッションとして実行。対象SHAを固定し、5対象の実測、失敗の伝播、互換処理の範囲、全Survivedの分類、CIと生成物、通常チェック・E2Eを確認する。独立した品質レビューは今回の対象外。

PR #24の[Codex相互レビュー](https://github.com/dyamada-jaki/overstrata-board/pull/24#issuecomment-6231709481)を受領。レビュー担当は10受け入れ条件を満たす判定、必須0・推奨1・好み0。ホスト/Dockerの全対象、通常チェック・E2E 4件、CIを再確認し、119変異の内訳が実装者と一致。実配布パッケージへの修正・再適用、各種のCLI失敗も独立したコピーで確認している。17:24:57のworker_done `msg_e1b72fc6c516` を照合してreleaseし、archive capturedを確認。mainでのCI実行はまだ確認できないため、コーディネーターの最終判定では両案とも同じ持ち越しとして扱う。

**コーディネーターが確認できた推奨1件（PR #24）:** `README.md:209`とPR本文の「版や内容が違えば何も書き換えずに失敗する」という説明は、後ろのファイルで内容不一致になる場合には正しくない。`scripts/stryker-compat.mjs:104`からのループはファイルごとに検査・書込みを行うため、3つ目で停止する前に先の2つが適用済みになる。隔離再現のexit 1と変更記録も照合した。偽成功や追跡ソースの変更はなく、再適用は冪等なため必須には引き上げない。採用時には説明を実態に合わせるか、全ファイルを検査してから書き込む改善を推奨する。まだ修正はしていない。

PR #24のレビュー計時は17:17:48から実行検証終了17:22:57.638 JSTまで（事前読解は含まない）。ホスト57.299秒、Docker62.112秒、E2E13.615秒。全時間差を性能差や並行効果とはしない。既存の正式測定出力は保存後に復元し、自分のコンテナ・ネットワーク・E2E資源を片付け、既存image/volume/worktree/branchを保持したとの報告。終了時のHEAD/PR head一致・cleanも確認済み。

PR #23の[Claude Code相互レビュー](https://github.com/dyamada-jaki/overstrata-board/pull/23#issuecomment-6231812442)は、9条件を満たし、条件8のmain実行だけ未確認と判定。必須0・推奨2・好み1。自分のホスト55.35秒・Docker61.47秒・E2E 4件12.78秒、通常チェック・同じheadのCI 4ジョブが成功。119変異の位置・置換・状態が、実装者のホスト/Docker・CI・レビュー担当のホスト/Dockerの5レポート間ですべて一致した。未修正のrunnerで実テスト0件のSurvivedを再現し、ガードが拒否することも実JSONで確認した。

同レビューは17:17:06〜17:35:55 JST。17:36:08のworker_done `msg_9f630235ca8b` をTask `task_e345f6d47d49` / Dispatch `ctx_b48f491fd248`・送信元・outcome=succeeded・completed状態と照合し、release・archive capturedを確認。通常テスト失敗、dry runだけの失敗、runner異常、対象欠落、SIGINTを隔離コピーで再現し、非ゼロ終了と生成物を確認した。質問待ち・資源競合は報告されていない。

**コーディネーターが確認できた推奨2件（PR #23）:**

1. `scripts/mutation-report.mjs`は、全変異がNoCoverage・RuntimeError・Ignoredでも集計を成功として返す。現在の基準値はこれらが0件で測定結果に影響しないが、将来の測定不調を見逃す余地がある。コードとレビューの合成入力結果（全RuntimeError・全Ignored）を照合した。実際のcoverage障害は再現していないため、発生済みの障害としては扱わない。PR #24には、Killed・Timeout・Survivedが1件もない結果を拒否するガードがある。
2. `scripts/mutation.mjs`のrun.jsonはHEADと対象5ソースのハッシュを残すが、テスト・設定などの未コミット変更を記録しない。一時設定の実物 `run-OOIGy9/run.json` と `config.json` も照合した。今回はPR本文が故障検証と正式測定を区別しているので、基準値の誤認はない。dirtyフラグ・変更ファイル一覧などが改善候補。PR #24はGitが使える場合に未コミット変更ありをログへ出すが、Docker内でGitが使えない場合の識別まで自動化してはいない。

好み1件は、互換処理の戻り値appliedフラグをNodeテストで直接確かめる案。修正内容と冪等性はテスト済みで、実CLIでもフラグを確認しているため、採用判断を左右する修正にはしない。

### 受け入れ条件の最終判定（#18反映前）

○は現在の対象SHAで確認済み、△はマージ後の実行待ち。根拠は両レビューとコーディネーターによる実コード・生成物・CIの照合。

| 条件 | PR #23 | PR #24 |
|---|---|---|
| 1 Node 24・既存基盤を維持し、採用版・互換性・lockを説明 | ○ Stryker 10.0.0固定、既存版の変更なし | ○ 同左 |
| 2 ホスト/Docker共通入口、通常テスト・初期実行成功後に変異 | ○ 両環境と失敗時の停止を実CLIで確認 | ○ 同左 |
| 3 5対象・除外理由、実行時定数を含み型などを除外 | ○ 全5ファイル、型側に変異なし | ○ 同左 |
| 4 実物の既存テストを利用、内部公開・モック置換なし、E2E維持 | ○ src・既存テスト変更なし | ○ 同左 |
| 5 HTML/JSONと実行情報・基準値、空・欠落を成功にしない | ○ 実行別の構造化記録が充実 | ○ 状態別要約とJob Summaryも生成 |
| 6 全Survived/NoCoverageの分類と引き継ぎ、状態を分ける | ○ 全9件の分類・根拠あり | ○ 全9件の分類・根拠あり。解釈差は下記で整理 |
| 7 意味のある検出例と異常時の非ゼロ、故障変更の撤去 | ○ 独立再現・失敗CIのartifactも確認 | ○ 独立したCLI再現とCI設定を確認 |
| 8 PR/mainの独立CI、成功/失敗artifact、閾値なし | △ PR成功、失敗CIのartifact確認済み。main実行待ち | △ PR成功、失敗ログ保存をローカルと設定で確認。main実行待ち |
| 9 追跡ソース・他worktreeを守り、生成物を隔離、片付けを説明 | ○ 前後のソースハッシュ・realpath照合あり | ○ 実行後clean、生成物の除外と保存を確認 |
| 10 文書と実態、通常チェック・E2E・既存CI維持 | ○ 成功。記録の改善を2件推奨 | ○ 成功。互換処理の説明1件を修正推奨 |

画面の機能や仕様は変更していないため、新たなOrca画面操作は本Issueの確認対象にしていない。両案で既存の375px・1280pxのE2E 4件は再実行済み。人間の実機確認と区切り1の達成はこれに含めない。

### 一次判断と採用前後の残作業

**PR #24を推奨する。** ミューテーション基盤では、測定できていない結果を正常な基準値と取り違えないことと、検出・タイムアウト・未検出・型エラーを日常的に読み分けやすいことを重視した。#24は全変異が未検証の結果も拒否し、Killedのみの割合とTimeout込みの割合を端末・保存ファイル・GitHub Job Summaryで分けて表示する。両案の今回の実測は一致しており、指摘件数やモデル名で選んだものではない。

PR #23の長所は、互換処理の全3ファイルを検査してから書くこと、作業場所の外へ向く依存のrealpathを拒否すること、実行別のSHA・ソースハッシュ・版・設定・各段階の結果をJSONで残すこと。#24への改善候補として残すが、現時点で取り込みは指示・実施していない。

採用時にはまず#24の「何も書き換えずに失敗」という説明を修正するか、#23の全件検査後に書き込む方式を取り入れることを推奨する。これは相互レビュー上の必須指摘ではなく、現在の成功した基準値を無効にするものでもない。取り込み判断と修正は未実施。

統合手順は承認済み計画どおり、#18のPR #22をmainへ取り込んだ後、#19の両候補に最新mainを反映する。通常チェック・全対象のミューテーション・対象E2E・CIと影響部分のレビューを更新してから最終採用を決める。mainへのマージ後は、条件8のmain CIとartifactを確認する。今回の119変異・90%は#18反映前の基準値として保存し、統合後の値へ書き換えて履歴を失わない。

### 仕様・テストの不足と後続候補

| 観点 | コーディネーターの整理・対応先 |
|---|---|
| 同じ列の別の行のマスへ選択を切り替える操作 | 既存テストの意味のある不足。変異では切替が解除に変わる。現在のアプリのバグではない。spec 2.1は明確なので仕様追加は不要。App入口の振る舞いテストを足す小さな後続Issue候補。#22で追加した同じ列・行の**ラベル**の操作とは別 |
| 列・行のstyle変更4変異 | 実ブラウザでの等価性や、E2Eが検出するかの確認待ち。見た目の責務はE2Eという方針を保ち、スコアを上げるためだけに内部styleのRTL assertionを要求しない。両案の分類差を解消済みとはしない |
| React keyの変異 | 固定順序・固定長の現状では表示・操作の差を確認していない。今後リストが動的になる場合に再評価 |
| 正規表現のアンカー2変異 | 後段の正規表記との完全一致で同じ制約になるため、両案とも等価と評価 |
| 座標変換の巨大整数の変異 | 差が出る範囲は現在の最大30・自由入力なしの盤面の範囲外。現在の仕様を広げて対応しない |
| Stryker互換処理の撤去 | 上流更新時に未修正で代表変異が実テストに検出され、型側を変異せず全対象を測定できることを再確認する。変異数の固定は条件にしない |

以上は候補の記録であり、新しいGitHub Issueはまだ作成していない。採用した改善はfinish-issueのふりかえりで対応先・担当・確認時点を決める。

### Claude Code案の初回測定（#18反映前、相互レビュー前）

119変異の状態別件数はCodex案と同じ。全Survivedの分類は検証不足1件・判断待ち1件・等価3件・対象外4件で、Codex案とはstyle・key・巨大整数の扱いが異なる。数値の一致だけで分類の正しさは認定せず、仕様と検証する層に照らしてレビューする。テスト不足として共通に挙がった同列・別行のマスへの切替は後続候補で、#18へ独自追加していない。

ホスト入口56秒、Docker入口62秒（イメージ準備12秒は別）との報告。通常テスト・Strykerの初期実行・ツールエラー・空対象/変異0件・互換処理を外した場合・版不一致などをworktree外のコピーで確認。通常4チェックとE2E 4件、[CI 4ジョブ](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39016330024)が成功。証拠は `/tmp/issue-19-claude-logs/`。再測定用のworktree・ブランチ、開発イメージ・node_modulesボリュームは保持し、自分のコンテナとネットワークは片付けたとの報告。

### Codex案の初回測定（#18反映前、相互レビュー前）

ホスト・開発Docker・CIで119変異、Killed 77 / Timeout 4 / Survived 9 / CompileError 29、NoCoverage・RuntimeError・Ignored・Pendingは0と報告。Strykerスコア90%にはTimeout 4を含むため、assertion等による検出77件と分けて扱う。5ファイルがレポートにあり、実行時定数も対象になった。詳細の変異ID・位置・検出テスト・全Survived分類はPR本文へ保存した。

意味のある検証不足3件（横方向のstyle 2件、同列・別行のマスへの切替1件）、等価2件、対象外2件、判断待ち2件との初回分類。相互レビュー担当はこの分類に同意したが、コーディネーターはstyleを検証する層の判断を上の表へ別途残した。既存の画面操作やテストは修正していない。

初期実行失敗・通常テスト失敗・ツールエラー・対象なし/変異0件の非ゼロ伝播を実CLIで確認。初期実行の故障確認では、途中のchecker初期化エラー2回を期待した失敗の証拠に含めず、通常テスト成功後にdry runで失敗する条件を改めて確認した。CIも一時的なrunner異常の[失敗run](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39015933242)で失敗ログartifactを確認し、設定を復元した[最終run](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39015989984)で4ジョブ成功。最終treeに故障設定を残していない。

時間: 承認受領後の実装開始16:54:42、完了記録17:08:35 JST。ホスト入口54.669秒、Docker入口62.180秒、CI入口157.140秒。Dockerコマンド全体76.25秒には初回イメージ準備を含む。実行環境・対象範囲をそろえた速度比較ではなく、観測値として残す。

証拠: `/tmp/issue-19-codex-evidence/`。残る資源はworktree・ブランチ、node_modules・出力・.env、`issue-19-codex_node_modules`、開発イメージ、`issue-19-codex_default`ネットワーク。レビュー後のコーディネーターの実在確認でも、コンテナは0件で、このネットワーク・両案のnode_modulesボリューム・開発イメージが残っていた。統合再測定のため保持し、finish-issueで所有を再確認して片付ける。

相互レビューの証拠: `/tmp/issue-19-review-pr-23-claude/`、`/tmp/issue-19-review-pr-24-codex/`。終了時に両PRのheadがレビュー対象と一致し、CI各4ジョブSUCCESS、各worktreeのHEAD一致・未コミット変更なしをコーディネーターも確認した。初回実装・レビューの10担当はrelease済みで、その時点のreclaimableは0件、未処理の通知は0件。mainのレポート・索引更新は未コミットで、finish-issueの記録更新まで保持する。

## 6. 並行運用と改善の効果確認

- #8から引き継ぐ観点: 実測と計算値の区別、利用可能なOrcaの実行ファイルとviewport指定、起動設定と観測値の区別、完了時の実在資源の照合。
- 今回試す観点: 4担当の所有範囲の分離、承認のIssue別管理、開始・終了・待ちと理由の記録、共有資源の競合、main追従と再検証の手戻り。
- 手順の反映と効果確認を分け、実際に試した場面と証拠から評価する。未計測の速度向上や費用を推定しない。
- 初回レビュー時点では起動・互換性調査・計画修正・人間の承認・実装・相互レビューまで確認した。統合・完了処理と効果確認の結果は7〜9章へ追記した。資源の競合は観測されていないが、並行しただけで速度や品質が改善したとは断定しない。

運用記録の一時保存先: `/private/tmp/overstrata-dual1819-AZ7nmy`（Task指示・起動receipt等）。継続記録は本書とGitHubのIssue・PR・CIに残す。

### 計画段階の互換性の発見（2026-10-17）

Claude Codeがworktree外の一時環境でStryker 10.0.0とVitest 5の動作を調査し、テストの絞り込みで実際にはテストが走らず、変異がSurvivedになる兆候を見つけた。コーディネーターも[上流のIssue #6210](https://github.com/stryker-mutator/stryker-js/issues/6210)がOPENで同種の報告があることを確認した。宣言上の対応バージョンだけでは実動作の互換性を認定しない。

Codexの初回計画（質問 `msg_23c16b512222`、16:14:55 JST）は、受け入れ条件への対応を提示したが、この問題への具体策はまだ含んでいなかった。16:20:48 JSTにコーディネーターが実装承認を出さず、隔離した一時環境での調査と計画の再提示を依頼した（回答 `msg_b7bc69213b12`）。これは計画修正であり、実装後のレビュー指摘ではない。

両担当へ、通常設定と回避策の実測・根拠・変更範囲・保守と解除の条件を計画に含めるよう依頼した。既存基盤のダウングレードはIssueのスコープ外を維持する。回避方法の採用や正規worktreeへの実装はまだ承認していない。

### Codexの修正版計画（16:24:31 JST）

質問 `msg_2235791fb408` として受領。旧質問への回答は調査依頼であり、新しい計画への実装承認ではない。Claude Code案との比較・人間への提示はこれから行う。

- Strykerのcore・Vitest runner・TypeScript checkerを10.0.0で固定し、既存Node 24・Vitest 5等は維持する。
- `npm run test:mutation`を共通入口にして通常テスト、Strykerの初期実行、5ファイルの変異検証を順に行う。ホスト・開発用Docker・独立したCI jobで実行し、HTML・JSON・ログ・対象SHA等を残す。
- 対象は `src/domain/movement.ts`・`src/data/movement.ts`・`src/domain/board.ts`・`src/data/board.ts`・`src/components/Board.tsx`。既存アプリや既存テストには手を加えず、#18の独立したテスト補強を取り込まない。
- `scripts/stryker-compat.mjs`で自worktreeの依存配布ファイルだけに暫定修正を適用する案。テスト名を収集する2か所を一致させ、`as const`の型側だけを除外するようinstrumenterを修正する。既知の版・修正前後のSHA256を照合し、未知の内容では失敗させる。冪等性・npm ci後の再適用・上流修正版での削除条件を検証する。
- 実行入口で変異ゼロ、対象ファイルの欠落、coveredByがあるのに実行テスト数0のSurvivedを正常値として扱わない。ツール障害・初期実行失敗も非ゼロとし、実CLIと最小限の入口テストで確かめる。
- 全Survived/NoCoverageとエラー等を分類し、KilledとTimeoutを分ける。スコア閾値、外部送信、増分キャッシュは導入しない。既存チェック・E2E・本番イメージ・PRのCIも確認する。
- 主な変更予定は依存・lock、Stryker設定、実行と互換性のスクリプト、対応する最小限のNodeテスト、CI・除外設定、README・testing.md・両ガイド。アプリ・既存テスト・spec・コーディネーターの管理記録は変更しない。

一時環境の限定調査に関する担当者の報告（正式な全対象の基準値ではない）:

| 調査 | 観測 |
|---|---|
| 距離関数の同じ7変異を通常設定で実行 | CompileError 1、Survived 6。6件はcoveredByがあっても実行テスト数0 |
| related無効化・coverageAnalysis off | 同じ異常が残った。宣言上の設定変更だけでは回避できなかった |
| テスト名収集の2か所を修正 | CompileError 1、Killed 6。検出テストと実際の失敗を確認 |
| `as const`の処理を修正して定数を実行 | Killed 2、CompileError 3。movement定数がレポートに現れ、medium/heavyの符号変更を既存テストで検出 |

ログは `/tmp/issue-19-codex-evidence`、隔離環境は `/tmp/issue-19-codex-compat`。本表は担当者の実験報告であり、導入後のホスト・Docker・CI検証や相互レビューとは区別する。数値リテラルを任意の値へすべて変異できるわけではないため、定数の全誤りを検出可能とはしない。

コーディネーターも[上流 #6208](https://github.com/stryker-mutator/stryker-js/issues/6208)・[#6227](https://github.com/stryker-mutator/stryker-js/issues/6227)の実行式まで除外される問題と、テスト名修正の[PR #6214](https://github.com/stryker-mutator/stryker-js/pull/6214)が未マージであることを確認した（16:25 JST）。16:25:49 JSTにClaude Codeへこの環境事実を共有した（`msg_b5633ea99c24`）。互換性修正のためだけにアプリを書き換えず、対象の測定漏れも成功に含めないことを比較時の確認点とする。

### Claude Codeの初回計画と修正依頼（16:33〜16:34 JST）

質問 `msg_a7037a40ac00` を16:33:56 JSTに受領。受け入れ条件ごとの計画、runnerの実測、通常設定・別ランナー・checker有無の比較を提示した。別ランナーでは検出テスト名を追えず、checkerなしでは型不正の変異がKilledへ混ざるため、Vitest runnerとTypeScript checkerを使う理由が示された。依存を増やさず実行時にrunnerへ互換修正を適用する案を推奨していた。

一方、`src/data/movement.ts`を「既知の未計測」として欠落ガードの例外にする案は、定数を含む初期対象全体を実行するAC3・AC5を満たさない。16:34:44 JST、コーディネーターは実装を承認せず修正を依頼した（回答 `msg_bd23bcc446a0`）。アプリの型表現の変更で回避する案も今回は採らず、instrumenterの限定的な互換修正と実測を計画へ組み込めるか確認するよう伝えた。標準演算子が任意の数値変換をしない限界と、実行コード全体が対象から欠落する不具合は区別する。

その他の確認事項は既存スコープから解決した。App・mainの除外理由、PR/mainの独立CI jobは妥当。同じ列の別マスへ切り替える操作の未検出は独立した後続Issue候補として引き継ぎ、承認済み#18の範囲や#19のアプリテストを追加変更しない。新しいaskで修正版を受け取り、Codex案と比較してから利用者へ提示する。

### 修正版2案の比較と承認対象

Claude Codeの修正版を16:36:54 JSTに質問 `msg_cc1acb9afc44` として受領。隔離環境でinstrumenterの限定修正を実測し、アプリを変えずにmovement定数から4変異を生成した。補正値の符号反転2件を既存テストで検出し、残り2件は型不正のCompileError。全対象の試行結果は119変異（Killed 77、Timeout 4、Survived 9、NoCoverage 0、CompileError 29）、52秒との報告。これは計画段階の測定で、正式導入後の基準値ではない。初回案の「既知の未計測」の例外は撤回した。

共通する実装計画は次のとおり。

- Stryker core・Vitest runner・TypeScript checker 10.0.0を固定して追加し、既存Node/Vitest等は維持する。
- `npm run test:mutation`で通常テスト成功後、互換処理・Strykerの初期実行・5ファイル全体の変異検証を行う。既存の実物を組み合わせたRTL/domainテストを利用する。
- 互換処理は自worktreeの依存配布JSの3ファイルだけに適用する。テスト名収集の2か所と、型側だけを除外するinstrumenterの1か所。適用済み・未適用を照合し、未知の版や内容は非ゼロで止め、npm ci後も同じ入口で再現する。
- HTML・JSON・ログ、対象SHA・版・環境・実行時間を保存する。対象の欠落・変異ゼロ・テスト未実行の異常結果・ツール障害を成功にしない。Survived/NoCoverageを全件分類し、Killed・Timeout・型不正等を分ける。
- ホスト・Docker・独立CI jobで確認し、通常4チェック・既存E2E・本番イメージも検証する。スコア閾値や外部送信は導入しない。
- 新しいガード・互換処理の振る舞いはテストを先行させ、実CLIでも失敗の伝播と検出例を確認する。アプリ・既存テスト・spec・#18の担当範囲は変更しない。
- 編集は依存・lock・Stryker設定・最小限の実行/互換/結果確認スクリプトとそのテスト・CI・除外設定・README/testing/両ガイド。相互レビューを行い、独立した品質レビューは今回は追加しない。

| 主な違い | Claude Code | Codex |
|---|---|---|
| 互換処理の照合 | 対象版と正確な置換前後の文字列を照合 | 対象版と各配布ファイルの修正前後SHA256を照合 |
| レポート構成 | 固定の出力場所と結果集計モジュール | 実行別ディレクトリと実行情報を保存する入口 |
| Strykerの並列度 | 2 | 1 |
| 主な試験 | ガードと互換処理のNodeテスト、実CLIによる正常・異常確認 | 同じ保証を入口の最小限のテストと実CLIで確認 |

コーディネーターの所見: 修正後は双方とも受け入れ条件を満たす方向になっている。限定的な依存パッチが必要となる保守上の負担はあるため、上流修正後の削除手順を実装・レビューの対象にする。アプリや既存のテスト基盤を変えて問題を回避しない。

承認対象には次の補足条件を含める。新しい仕様の追加ではなく、受け入れ条件の証拠と互換処理の適用範囲を明確にするもの。

1. 互換処理は実際のVitest 5と対象Stryker版を照合し、自worktree内の依存だけに適用する。
2. 上流更新時に変異数が固定であることは要求しない。型側を変異させていないことを実際の変異位置・内容で確認し、全対象と実行テスト・代表的な検出結果を再確認して削除する。
3. 固定の出力場所を使う場合も、ホスト・Docker等の正式測定の証拠を次の実行で失わないよう保存する。通常テスト・互換処理・ガードを含む実行失敗のログをCI artifactから確認できるようにする。

今回の人間への確認は、この2案と補足条件で実装を開始する承認。#18の承認は別に記録済みで、#19へ自動適用しない。

### 計画承認（16:54:35 JST）

2026-10-17、利用者が「19 承認します」と回答。両修正版計画と上記条件を承認したものとして、16:54:35 JSTにCodexの質問 `msg_2235791fb408` へ回答 `msg_6a8c3a101e4d`、Claude Codeの質問 `msg_cc1acb9afc44` へ回答 `msg_f395a0d4af33` を送った。双方がansweredになったことを確認。#18反映前の初回測定であること、統合後に再測定すること、既存テストの不足は今回修正せず別の改善候補として引き継ぐことも伝えた。

承認は実装・検証・PR作成・相互レビューの開始に対するもの。マージの判断は別途行う。Claude Codeの16:55:15 JSTのheartbeatはimplementing、CodexもOrca上でworkingに移行した。

修正版の質問送信から承認回答までの経過は、Codexが16:24:31→16:54:35（30分4秒）、Claude Codeが16:36:54→16:54:35（17分41秒）。これは計画の比較・人間の確認を含む待ちであり、実装の所要時間に加算してモデルの速度比較には使わない。Claude Codeは16:46:54のaskタイムアウト後、同じ質問をresumeして待ち、承認前には実装を始めなかった。


## 7. #18統合と改善の取り込み（2026-10-18 JST）

### 利用者の承認と対象

利用者が「1,2,3 全て提案の通り進めてOK」と回答し、次の3点を承認した。

1. 両案に#18反映済みmainを取り込み、通常チェック・全対象ミューテーション・E2E・CI・相互レビューを更新する。
2. #24を採用候補とし、#23の「全対象ファイルを検査してから互換処理を適用する」方式を取り込む。
3. 同列・別行のマス選択切り替えのテスト不足を小さな後続Issueにする。

この承認範囲の再確認は行わず着手した。取り込み元mainは `e5fdf03fba203af8a6bf78e51e1720fcd9fb5651`（#18のマージ `0266edb6c8b2a9cf452581823630f402e6ccfce8` を含む）。開始時にorigin/mainと一致し、両候補のHEADは5章の初回レビュー対象と一致、未コミット変更なし。前回の10ワーカーが完了・release済みであることも確認した。

### 担当と分担

既存のRunとworktreeを引き継ぎ、新しい担当セッションを起動した。初回と同様に独立した品質レビューは追加しない。

| 担当 | Task / Dispatch | 作業 |
|---|---|---|
| Claude Code | `task_8492bb03cd72` / `ctx_7d0a1aa3dbb2` | PR #24へのmain統合、事前検査のテスト先行での取り込み、再測定・PR更新 |
| Codex | `task_44042c18e189` / `ctx_51213279c1b2` | PR #23へのmain統合、再測定・PR更新。未承認の推奨改善は追加しない |

両者の起動receiptは `state=ready`・`input_accepted`、requested/effectiveのmodel/effortはすべてnullで、既定継承・実行値未確認。別途worker-listのprovider観測ではCodexは `gpt-6.1-sol`、Claudeはnull、effortは未確認。設定や署名から値を補完していない。

各担当へ、#18反映前の正式測定をworktree外に保存してから作業し、同じ最終treeで検証することを指示した。#24の新しい保証は、後ろの対象が未知内容でも先行ファイルを変更せず停止すること。一般的な書込み時のI/O障害まで原子的に戻せるとは扱わない。選択操作のテスト不足は#19で独自修正しない。

### 後続Issue

[#25 同じ列の別マスへの選択切り替えを回帰テストで守る](https://github.com/dyamada-jaki/overstrata-board/issues/25)を登録した。spec.md 2.1とtesting.mdに基づき、表示座標 `(3, 4)` → `(3, 5)` の切り替えで、押したマスだけが選択されることを画面の入口から実物で確認する。代表的な誤りの検出も記録する。現行の振る舞いを変えず、#19のmain取り込み後に着手する。#9への新たな依存は追加しない。

コーディネーターは既存の#9・#12・#20とmainのテストを確認し、#18のラベル操作の補強とは異なる範囲として登録した。担当2名へ#25への参照をPR本文に残すよう伝えた。登録済み・未実装であり、テスト不足が解消したとは扱わない。

今回の起動・Task指示等の証拠: `/var/folders/tt/57j6hk3j7jq5x_l8rssjw31h0000gn/T/overstrata-issue19-integration-qk8u87mm`。

### 統合と修正の結果

| 候補 | 最終head | 実装担当による確認 |
|---|---|---|
| [PR #23](https://github.com/dyamada-jaki/overstrata-board/pull/23) | `fcbd19eb868833ad7fd0f360508fdad52a4e4288` | mainを競合なく統合。通常4チェック、Vitest 66件・Node 13件、Docker E2E 4件、ホスト/Dockerの全5対象測定が成功。[CI 4ジョブ成功](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39043590510) |
| [PR #24](https://github.com/dyamada-jaki/overstrata-board/pull/24) | `de66f319ce24d6976b55b70a9db86893e1b46d2b` | mainを競合なく統合し、事前検査方式・回帰テスト・READMEを更新。通常4チェック、Vitest 66件・Node 27件、Docker E2E 4件、ホスト/Dockerの全5対象測定が成功。[CI 4ジョブ成功](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39043595352) |

PR #24は、[テスト追加 `5d360d2`](https://github.com/dyamada-jaki/overstrata-board/commit/5d360d2) → [修正 `de66f31`](https://github.com/dyamada-jaki/overstrata-board/commit/de66f31)の順。末尾の互換処理対象が未知内容の場合に「先行ファイルが既に変更されている」ため失敗するRedを記録し、期待を弱めずに成功へ変えた。新たなテストは、未知内容、版違い、初回適用と再適用、適用済みと未適用の混在を扱う。

コーディネーターも履歴・差分・Redログを確認した。変更は全対象の読取り・検査を終えてから書込みへ進む構成である。実配布依存の隔離コピーを使った担当者の記録では、正常適用・再適用が成功し、末尾の未知内容では直接実行と `npm run test:mutation` の両方が非ゼロで終了、全3対象のSHA256は前後で一致していた。最初のハッシュ確認で起きたシェルの引数分割エラーは証拠に使わず、配列で再実行した結果を確認した。

実装担当の完了は、PR #23が00:10:35 JSTの `msg_cf189d049ae5`、PR #24が00:13:59 JSTの `msg_fc111e05d513`。それぞれTask・Dispatch・送信元・outcome=succeededを照合してreleaseし、archive capturedを確認。レビュー開始前に両PR headとworktree HEADの一致・clean・取り込み元mainが祖先であることを確認した。

### #18統合後の測定

| 状態 | PR #23 ホスト / Docker | PR #24 ホスト / Docker |
|---|---|---|
| 全変異 | 119 / 119 | 119 / 119 |
| Killed | 77 / 77 | 77 / 77 |
| Timeout | 4 / 4 | 4 / 4 |
| Survived | 9 / 9 | 9 / 9 |
| CompileError | 29 / 29 | 29 / 29 |
| NoCoverage・RuntimeError・Ignored・Pending | すべて0 | すべて0 |
| 実行時間 | 54.84秒 / 62.79秒 | 58秒 / 61秒（秒単位の記録） |

コーディネーターは上記4つの実JSONを読み、5対象のソースが取り込み元mainと同一であり、全119件の位置・置換・状態が4レポート間で一致することを確認した。Survived 9件はすべて `testsCompleted > 0`。照合結果は起動証拠ディレクトリの `coordinator-mutation-comparison.json` に保存した。

初回結果と状態別件数は変わらず、CompileErrorを除く90件に対してKilledのみが85.56%、Timeout込みが90%。#18で通常テストは64件から66件へ増えたが、新たにKilledになる変異はなかった。これは今回生成された変異についての観測であり、#18の操作・表示テスト全体の価値やE2Eの検出力を否定する結果ではない。styleなどの変異をE2Eが検出するかは未実測のまま残す。

実装側の証拠は次に保存した。初回測定も別ディレクトリへ保存し、統合後の結果で上書きしていない。

- PR #23: `/Users/jaki/orca/issue-19-evidence/codex-post18-20261018/`（`before/`、`after/`、`report.md`、CI artifact等）。
- PR #24: `/Users/jaki/orca/evidence/issue-19-claude/post-18-merge/`（`INDEX.md`、Red・隔離コピー検証・通常チェック・全対象測定・E2E・CI）。初回は隣の `pre-18-merge/`。

### 最新headの相互レビュー

実装担当の終了後、両worktreeで新しいレビューセッションを起動した。ソース・設定・テストの編集は禁止し、上記の最終headを固定して確認する。独立した品質レビューは追加していない。

| 対象 | 担当 / Task / Dispatch | requested / effective |
|---|---|---|
| PR #23 / `fcbd19eb868833ad7fd0f360508fdad52a4e4288` | Claude Code / `task_27b614873a63` / `ctx_7971686c5ae8` | 両方 `opus` / `high` |
| PR #24 / `de66f319ce24d6976b55b70a9db86893e1b46d2b` | Codex / `task_0255c4ab50cb` / `ctx_bf0131c7d6c8` | 両方 `gpt-6.1-sol` / `high` |

[PR #24のCodex再レビュー](https://github.com/dyamada-jaki/overstrata-board/pull/24#issuecomment-6235666959)は00:15:13〜00:21:46.503 JST。必須指摘なし。条件1〜7・9〜10を満たし、条件8のmainマージ後CIだけ実行待ち。推奨として残る同列別マスの検証不足は、今回承認された#25に引き継がれている。新しい追加修正要求はない。

同担当は通常4チェック（Vitest 66件、Node 27件）、ホスト55.60秒・Docker61.63秒の全5対象測定、Docker E2E 4件12.95秒を再実行。履歴コピーで `5d360d2` の1件失敗から `de66f31` の全21件成功へ変わり、テストが修正されていないことを確認した。実配布依存の独立コピーでも、最後だけ未知内容・版不一致で終了1かつ全3対象がバイト不変、通常適用・再適用・混在は成功した。コーディネーターもそのログ・コミット差分を読み、レビューのホスト/Docker/CIの実JSONを解析して119件の位置・置換・状態の一致を確認した。

レビュー証拠は `/tmp/pr24-codex-post18-review/`。GitHub APIから取得したコメント本文と保存された `review.md` の一致も照合した。00:22:01 JSTの `worker_done`（`msg_793465ce76ea`）をTask・Dispatch・送信元・outcome=succeededと照合してreleaseし、archive capturedを確認。既存の正式出力と.envは維持・復元、自作のコンテナ・ネットワーク・E2E資源は残さず、既存image/volume/worktree/branchは保持したとの報告。終了時のHEAD・PR head一致とcleanも報告されている。

[PR #23のClaude Code再レビュー](https://github.com/dyamada-jaki/overstrata-board/pull/23#issuecomment-6235748580)は00:15:02〜00:26:58 JST。必須指摘なし、新たな推奨なし、好み1件。条件1〜7・9〜10を満たし、条件8のmainマージ後CIは実行待ち。マージのtreeが自動統合の結果と一致し、初回からPR独自のコード・設定・依存に変更がないことを確認した。

同担当は通常4チェック（Vitest 66件、Node 13件）、ホスト55.25秒・Docker61.20秒の全対象測定、Docker E2E 4件13.02秒を再実行し、最新headのCI 4ジョブ成功とmutation artifactを照合した。初回の基盤テストも履歴コピーで7件失敗→7件成功を確認したが、変更していない初回の故障実演は網羅的に再実行していない。証拠は `/Users/jaki/orca/issue-19-evidence/claude-review-post18-20261018/`。コーディネーターもレビューのホスト/Docker/CIの実JSONを解析し、119件の位置・置換・状態の一致を確認した。

好み1件は、PR #23の基盤テストがworktreeの実依存をコピーするため、ローカルですでに互換処理を実行済みなら「適用済み」の経路だけを通り、未適用からの変換をその回では確かめないというもの。コーディネーターも `installation()` のコピー元と `digest === patch.after` の分岐を確認した。CIでは `npm ci` 直後の未適用ファイルで検証しており、今回の採用を妨げる問題・新しい修正要求にはしない。初回の全件未検証結果のガードとdirty記録の推奨2件も、コードを変更していないため未対応のまま。再レビューの新規指摘件数が減ったことを解消の証拠にしない。

00:27:17 JSTの `worker_done`（`msg_8949504274b5`）をTask・Dispatch・送信元・outcome=succeededと照合してreleaseし、archive capturedを確認した。正式出力228ファイルのハッシュは実行前後で一致し、自作のコンテナ・ネットワーク・E2E資源は片付け、既存image/volume/worktree/branch/.envを保持したとの報告。レビュー本文の具体的なモデル名の自己申告では起動記録を補完せず、表のrequested/effectiveの `opus` を記録値とする。実行環境一覧中の `docker-compose.yml` は実ファイル名と異なり、追跡されている設定は `compose.yaml` と `compose.e2e.yaml` である。

### 統合完了時の判断・残作業

**PR #24の推奨を維持する。** 未検証の結果を正常な基準値と扱わないガード、KilledとTimeoutを分ける表示に加え、#23の長所だった全件事前検査を取り込み、テスト先行と実依存のコピーで再確認できた。これは二重実装の比較から取り込んだ具体的な改善であり、今回実施していない独立した品質レビューの成果とは数えない。

| 承認された提案 | 結果 |
|---|---|
| 1 両案への#18統合・再測定・再レビュー | 完了。両案で通常4チェック・全対象測定・E2E・最新PR CI・相互レビューが完了 |
| 2 #24への全件事前検査の取り込み | 修正・再確認済み。最終head `de66f31` の必須指摘なし |
| 3 同列別マスの切替テストを小さなIssueへ | #25登録済み・未実装。#19のmain取り込み後に着手可能、#9への新しい依存は追加しない |

現在の受け入れ条件判定は両案とも1〜7・9〜10が確認済み、8はPR側のCI・artifactまで確認済みでmainマージ後の実行待ち。採用・マージはまだ行っていない。次は採用PRを決めてfinish-issueへ進み、マージしたmainの4ジョブとartifactを確認する。#25の実装、style変異の実ブラウザでの検出、巨大整数の仕様判断は未解消。これらや実行記録・realpath等の追加改善は、ふりかえりで具体案を共有し、利用者の判断を受けてから反映する。並行報告・Run分離の検討は利用者の希望により引き続き保留。

#18の2テストがcoverageに加わったこと、同列別マスの不足が残ることを統合後の実測でも確認できた。統合の競合・質問による停止・資源競合は報告されていない。00:22:01に#24のレビュー完了を受領し、00:27:17に#23の完了を受領するまでの5分16秒は両レビューがそろうまでの待ち。担当の性質や確認範囲が違うため、モデルの速度差・並行化の短縮効果や費用を推定しない。

### 最終照合と資源

コーディネーターはレビュー受領後に、両worktreeのHEADとPR headが上記対象SHAに一致、未コミット変更なし、取り込み元mainが祖先、両PRのCI 4ジョブがSUCCESS、OPEN・mergeStateStatus=CLEANであることを再確認した。main/origin/mainは `e5fdf03` のまま。レビュー対象SHAはその後変更しておらず、mainへのマージも行っていない。

Run内の14担当はすべてsucceeded・release済み、今回の4担当のarchive capturedと、`worker-list --terminal-state reclaimable` が0件であることを確認した。Dockerでも両 `issue-19-*` projectのコンテナ・ネットワークは0件。次の資源は採用判断とfinish-issueまで保持する。

- worktree・ブランチ・.env: 4章の両候補を維持（ポート5191/5192）。レビュー専用worktreeは新設していない。
- volume: `issue-19-claude_node_modules`、`issue-19-codex_node_modules`。
- image: `issue-19-claude-app:latest`（`8ac5312cf5f4`）、`issue-19-codex-app:latest`（`18114c5387e4`）。
- 正式測定・レビュー・CIの証拠: 本章に記した各保存先を維持。GitHubのPR本文・レビューコメントにも結果を残した。

最終のPR/CI・worker-list・Docker一覧は起動証拠ディレクトリの `pr23-final.json`・`pr24-final.json`・`workers-final.json`・`workers-reclaimable.json`・`resources-final.json` に保存した。本レポート・一覧・next-issues.mdはmainの作業場所へ保存し、dual-implementの保存手順どおり、コミット・pushはfinish-issueの記録更新で行う。

## 8. 採用・マージ・後片付け（2026-10-18 JST）

### 利用者の判断とマージ

利用者が「OKです。24 を採用して進めましょう。」と回答した。採用・マージ・不採用PRのクローズ・対象資源の後片付け・記録保存へ進める承認として、[finish-issue](../../.claude/skills/finish-issue/SKILL.md)を実行した。追加のふりかえり改善への包括的な承認とは扱わない。

マージ直前に、PR #24のheadが再レビュー済みの `de66f319ce24d6976b55b70a9db86893e1b46d2b` と一致し、CI 4項目の成功・MERGEABLE・CLEANを確認。両worktreeもHEAD・リモートの一致、未コミット変更・未pushコミットなしを照合し、正式出力をworktree外へ保存した。

- 00:36:42、補助スクリプトのhead固定・squashで[PR #24](https://github.com/dyamada-jaki/overstrata-board/pull/24)をマージ。mainのコミットは [`c0340f8e58461ea9ae3596260a4be0a6dad5a09f`](https://github.com/dyamada-jaki/overstrata-board/commit/c0340f8e58461ea9ae3596260a4be0a6dad5a09f)。
- 00:36:44、[Issue #19](https://github.com/dyamada-jaki/overstrata-board/issues/19)の自動クローズを確認。
- 00:37:03、[PR #23](https://github.com/dyamada-jaki/overstrata-board/pull/23)を理由付きでクローズ。未検証結果を拒否するガードと結果表示を評価し、#23の事前検査の長所を取り込んだ#24を採用した旨を記した。#23のリモートブランチは保持。
- ローカルmainをfast-forwardし、main/origin/mainがマージコミットで一致することを確認。マージのtree `9560ffea761cdd306cef11f3f070a1defeb91c65` は、採用したレビュー対象のtreeと完全一致。

### mainでの最終確認

[main pushのCI run 39045810273](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39045810273)は、対象SHA `c0340f8` で4ジョブすべて成功した。PR CIの成功を代用せず、マージ後の実行と保存されたレポートを確認したため、持ち越していた受け入れ条件8も完了。Issue #19の10条件はすべて確認済みとなった。

| 確認 | main CIの結果 |
|---|---|
| test / typecheck / lint / build | 全成功。Vitest 66件、Node 27件 |
| Chromium E2E | 375px・1280pxで4件成功。HTMLレポート内の結果もexpected 4、unexpected/flaky/skipped 0 |
| 本番用イメージ | ビルド成功 |
| 全対象ミューテーション | 5対象、119変異。Killed 77 / Timeout 4 / Survived 9 / CompileError 29、その他0 |
| artifact | `mutation-39045810273-1` と `e2e-39045810273-1` を取得。mutationのHTML/JSON・run.log・stryker.log・summary.md、E2EのHTML・スクリーンショット・実行ログを確認 |

コーディネーターはmain CIのmutation JSONを読み、5対象のsourceがマージしたmainと一致し、全119件の位置・置換・状態が採用PRの最終CIと同じであることを照合した。全Survivedで実テスト実行数が正であることも確認。Killedのみ85.56%、Timeout込み90%の区別を維持する。

取得時の補足: 全artifactの一括ダウンロードはDockerのbuild recordをzipとして展開できず失敗したため、必要なmutation/E2Eを名前指定で取得した。CIの失敗ではない。E2Eの隠しファイル `.last-run.json` はartifactに含まれなかったため、成功判定はCIログとHTMLに埋め込まれた結果JSONを実際に読んで確認した。仮定に基づく確認スクリプトの失敗を製品テストの失敗や成功の証拠に混ぜていない。

### 削除・保持した資源

| 対象 | 結果 |
|---|---|
| 採用側worktree・ローカルブランチ | マージ後、Orca・Gitの両一覧、実パス、ローカル参照から既に消えていた。削除コマンドは重ねて実行しなかった |
| 不採用側worktree・ローカルブランチ | `finish.sh remove-worktree` で削除。ローカルブランチも同時に削除されたことを確認 |
| リモートブランチ | `dyamada-jaki/issue-19-claude` は削除済み。`dyamada-jaki/issue-19-codex` は `fcbd19e` で保持 |
| Dockerの専用資源 | `issue-19-claude`・`issue-19-codex` のnode_modules volumeを各1つ削除。両projectのコンテナ・volume・networkは再列挙で0件 |
| ワーカー | Runの14担当は既にrelease済み。reclaimable 0件を再確認し、人間のターミナルは操作していない |
| 保持したimage | 開発キャッシュの `issue-19-claude-app:latest`（`8ac5312cf5f4`）・`issue-19-codex-app:latest`（`18114c5387e4`）は保持。補助スクリプトの削除対象には含まれない |
| main・記録 | main worktreeを保持。正式出力・比較・レビュー・CIの証拠はworktree外に保管 |

削除前に採用側46ファイル・不採用側228ファイルの正式出力を追加保存し、各ファイルのSHA256が元と一致することを確認した。後片付け後に、Git・Orcaで当リポジトリのworktreeがmainだけ、両作業パスとローカルブランチが不在、mainと不採用リモートが保持されていることを照合した。

完了処理の証拠: `/Users/jaki/orca/issue-19-evidence/finish-pr24-20261018-f5t1qiiz/`。`formal-before-cleanup/`、PR/Issue状態、削除前後の一覧、`main-ci.json`・`main-ci.log`・`main-ci-artifact-verification.json`、`main-mutation/`・`main-e2e/`を保存した。アプリの画面やゲーム仕様を変更するIssueではないため、今回新しい実機確認は要求していない。#8から#9への実機持ち越しと、区切り1未達は継続する。

## 9. ふりかえりと改善の採否

### 今回確認できたこと

- **テスト先行と実物での再確認は役立った。** 全件事前検査の修正前テストが、先行ファイルを書き換えてしまう振る舞いを検出し、修正後に成功した。実装担当と別のレビュー担当が、実依存のコピーでも故障時の内容不変を再確認できた。一例からTDD一般の効果量を推定するものではない。
- **二重実装の比較を、具体的な改善へつなげられた。** #24の集計ガード・表示に、#23の全件事前検査方式を取り込んだ。今回の成果は実装比較と相互レビューによるもので、独立した品質レビューは実施していない。#9の試行後に担当構成を評価する方針は維持する。
- **ミューテーションは通常テストが通る中の不足を見つけた。** 同列別行への切り替えの不足を#25へ引き継げた。一方、#18の補強を入れてもスコアは変わらず、テストの価値をスコアだけで判断できないことも実測で確認した。
- **並行作業と統合を分けて確認できた。** worktree・ポート・Docker projectを分けた範囲で資源競合は観測されず、#18→#19の統合とmain CIまで通った。両候補へのmain統合・再測定・再レビューは追加で必要だった。費用・速度の短縮効果は測っていないため断定しない。

### 前回の改善を試した結果

| 引き継いだ改善 | 今回の観測・次の確認 |
|---|---|
| 壊れ方の具体例、テスト先行、古典派の検証 | 全件事前検査のRed→Greenと実配布依存で効果を確認。#9でも状態遷移と範囲外移動の誤りを、実物を通すテストで実装・レビュー担当が確認する |
| SHAを固定したレビューと修正後の再確認 | #18統合後の両headで再レビューし、#24の最終headとmainのtree一致を確認。古いレビュー・初回測定だけで採用しなかった |
| 起動記録と実行モデルの観測を区別 | 実装のnullとレビューの明示値、別途のprovider観測を区別できた。自己申告の具体モデル名は起動receiptの補完に使わない |
| 資源の再列挙と削除済みworktreeの扱い | 採用側の自動削除を3つの情報源で確認し、重複削除を省略。完了後にmainと不採用リモート、対象資源0件を再確認した |
| ふりかえりの改善は共有後に承認を得る | 承認済みの3点は反映・再確認済み。今回の追加案も返答までは未登録で保持し、2026-10-18の利用者承認後に#26へ登録した。実装・効果確認は未実施 |
| ブラウザ入力後の状態確認の補足 | 本Issueは基盤のみで対象場面なし。E2E成功をこの補足の効果に数えず、#9のブラウザ操作で継続確認する |

### 改善候補と状態

| 改善 | 状態・反映先・次に確認する担当と時点 |
|---|---|
| 全件事前検査 | 利用者承認によりPR #24へ反映・再確認・main取り込み済み。依存更新時は実装・レビュー担当が適用/拒否/再適用を確認する |
| 同列別行の切替テスト | #25登録済み・未実装。#19完了で着手条件は満たした。#25の実装・レビュー担当が画面入口のテストと該当変異の検出を確認する。#9への新しい依存は追加しない |
| styleの4変異を既存E2Eが検出するか確認 | **採用・[#26](https://github.com/dyamada-jaki/overstrata-board/issues/26)へ登録済み・未実装**。2026-10-18に利用者が登録を承認。実装担当が既存E2Eでの検出を測定し、PRレビューで担当者が対象SHAと各変異の結果を照合する |
| スキルの追加修正 | 現時点では追加不要と判断。今回の不足は既存のSHA確認・再レビュー・資源照合・承認手順で扱えた。同じ指示を重ねる変更はしない |
| realpath保護・実行記録の構造化など | 比較で得た候補として保持。今回の測定を無効にする障害はなく、追加実装は未承認。依存の共有方法や更新運用を変える計画で必要性を再検討する案とし、採用済みとは扱わない |
| 巨大整数・動的key | 上限30・自由入力なし・固定盤面の現仕様を広げない。自由入力や動的追加/並べ替えを設計する時点の検討材料として残す |
| 並行報告・Run分離 | 利用者の希望で保留を維持。今回の完了処理では変更しない |

2026-10-18に利用者が「Issueを登録しましょう」と承認したため、00:53:49 JSTに[#26 盤面レイアウトを壊す代表例を既存E2Eが検出できるか確認する](https://github.com/dyamada-jaki/overstrata-board/issues/26)を登録し、本文の一致とOPEN状態を確認した。既存E2Eで検出できれば重複テストは追加せず、仕様違反を検出できない場合だけ補強する。#25とは独立し、#9の新しい着手条件にはしない。今回は登録までで、実装・検証・効果確認は未実施。

受け入れ条件とスコープ外の正本はGitHubの#26本文で管理する。承認前の提案 `style-e2e-followup-proposal.md` を履歴として保持し、登録本文 `style-e2e-issue-body.md` と照合結果 `style-e2e-issue-26.json` を8章の完了処理の証拠ディレクトリに保存した。

次の機能開発は#9。#8からの実機確認は利用者が#9のレビュー時に行い、担当コーディネーターが端末・対象SHA・操作・結果を記録する。サンプルキャラの表示・移動と一連の実機操作が未完了なので、区切り1は未達のまま。
