# Issue #29 対応レポート

## 1. 概要

- Issue: [#29 同じ行の別マスへの選択切り替えを回帰テストで守る](https://github.com/dyamada-jaki/overstrata-board/issues/29)
- 期間: 2026-10-18 19:46〜20:38 JST ごろ
- 状態: **完了**。[PR #30](https://github.com/dyamada-jaki/overstrata-board/pull/30)（Codex）を採用してマージ、[PR #31](https://github.com/dyamada-jaki/overstrata-board/pull/31)（Claude Code）は不採用でクローズ。PO は受け入れ（1回目）と判断した
- 仕様: [spec.md 2.1 盤面](../spec.md#21-盤面)、[testing.md](../testing.md) 1・2・7章、[#25 のレポート](issue-25.md)
- 実装・自動検証: 両 PR とも確認済み（下記5章）。main 取り込み: 済み（`77f0353`）。人間の実機確認: Issue で要求されていない（表示・操作を変えないテスト補強）。#8 から #9 へ持ち越した実機確認は従来どおり別に追う。区切り1: 未達のまま（#9 が残る）

## 2. 目的と範囲

#25 の相互レビューで見つかった不足を補う。`Board.tsx:32` の判定から列（x）の比較を落とすと、同じ行の別のマスを押したときに切り替わらず解除されるが、#25 後の Vitest 67件はすべて通っていた。Stryker では対応する変異が CompileError になり、計測できない。この誤りを、画面の入口から確かめる回帰テストで検出できるようにする。アプリの振る舞いは変えない。

スコープ外: 操作仕様・見た目・ルールの変更、#9 のキャラ操作、ミューテーション基盤や Stryker 設定の変更、依存の追加、E2E への重複追加、#19 のほかの改善候補。

## 3. 計画と人間の判断

| 項目 | Claude Code | Codex |
|---|---|---|
| 計画の受信 | 19:48:32 JST | 19:48:39 JST |
| 変更ファイル | `src/App.test.tsx` のみ（1件追加） | 同じ |
| テスト | `(3, 4)` → `(4, 4)`。元のマスが `aria-pressed=false`、選択中は `(4, 4)` だけ。検出するのは最後の assertion と予測 | 同じ |
| 手で誤りを入れる確認 | `Board.tsx:32` を `current?.y === position.y ? null : position` に変える。worktree の外（scratchpad）に `git archive` で展開。誤りなしの対照と、誤りを入れた版の `tsc` も確認する | 同じ式。worktree 内の Git 管理外の `mutation-artifacts/manual-{before,after}` に展開 |
| ミューテーション | base `3289c06` でも必ず測り、#25 後の 78/4/8/0/29 と比べる | 必要に応じて base でも測る。ファイル・位置・mutator・replacement で照合 |
| 画面確認 | Orca のブラウザでは行わない（本体の差分0行）。既存 E2E は再実行 | 同じ |
| 確認したいこと | なし | なし |

- コーディネーターの所見: スコープ外への踏み込みや受け入れ条件の抜けはない。期待は spec 2.1 から決まる。テストの層は RTL の結合テストで、モックは使わない。正しい本体への補強なので形式的な Red は作らず、手で誤りを入れたコピーで検出を確かめる（testing.md 1・7章）。CompileError は検出件数に数えない。Codex の作業コピーの置き場所 `mutation-artifacts/` は、`.gitignore`・`eslint.config.js`・`stryker.config.mjs` のすべてで除外されている。品質レビューは #8・#9 の試行対象ではないので行わない。
- 人間の判断（2026-10-18 20:08 JST に返信）: **両案とも承認**。品質レビューはなし。Codex には、作業コピーの名前を `test:mutation` の実行記録（`run-*`）と分け、`git status` と `git diff` で追跡中のファイルに影響がないことを確かめるよう添えた。

## 4. 担当と資源

Run: `run_749a32a97138`（19:46:51 JST に作成）。コーディネーターの端末は `term_792de00a-9fc2-44db-84e1-7245dcabb35c`。

| 役割 | dispatch | 起動記録（requested / effective） | 対象 | 時刻（JST） |
|---|---|---|---|---|
| 実装（Claude Code） | `ctx_07248e16a706` | model・effort とも `null` / `null`（既定継承、実行値は未確認） | worktree `issue-29-claude`、ブランチ `dyamada-jaki/issue-29-claude`、ポート 5181 | 19:47〜20:14:12 |
| 実装（Codex） | `ctx_78ad1756464b` | model・effort とも `null` / `null`（既定継承、実行値は未確認） | worktree `issue-29-codex`、ブランチ `dyamada-jaki/issue-29-codex`、ポート 5182 | 19:47〜20:15:23 |
| 相互レビュー（Claude Code → PR #30） | `ctx_0eff58a876f4` | opus・high / opus・high | `60c249c`、worktree `issue-29-codex` | 20:16:04〜20:23:52 |
| 相互レビュー（Codex → PR #31） | `ctx_4cbd4dc706d0` | gpt-6.1-sol・high / gpt-6.1-sol・high | `8053963`、worktree `issue-29-claude` | 20:16:10ごろ〜20:20:23 |

- worktree: `/Users/jaki/orca/workspaces/overstrata-board/issue-29-claude`、`/Users/jaki/orca/workspaces/overstrata-board/issue-29-codex`（finish-issue で片付ける）。品質レビュー用の worktree はない
- Git 管理外の記録: 両 worktree の `mutation-artifacts/run-*`・`reports/mutation/`・`e2e-artifacts/run-*`。Codex の worktree には、さらに `mutation-artifacts/{manual-before,manual-after,ci-mutation}` と照合記録、検証レポート `mutation-artifacts/issue-29-verification.md` がある。Codex のレビュー担当の作業記録は `/tmp/issue-29-codex-review/`。Claude Code のレビュー担当の作業コピーは worktree の外の一時ディレクトリ（パスはレビューコメントに記載なし）
- Docker: 各自の E2E 実行で作ったコンテナ・ネットワーク・イメージは、終了時に削除したと両レビュー担当が報告している。開発サーバーは誰も起動していない
- ワーカー4件は、いずれも worker_done を受け取ったあと release 済み

## 5. 検証・レビュー・推薦

### 実装の比較

**テストのコードは両 PR で同一**（変更後の blob `9facc98` まで一致。テスト名・assertion も同じ）。違いは PR 本文の記録だけ。

| | PR #30（Codex） | PR #31（Claude Code） |
|---|---|---|
| head | `60c249cbf1b29282e4c122791674e4df989647e1` | `805396312d097cf2e6fe8ee6db15c8173978e1c4` |
| 手で誤りを入れた検出 | 追加前 67件成功 → 追加後 1 failed / 67 passed（`App.test.tsx:71`）。再現用のスクリプトを本文に掲載 | 同じ結果。誤りを入れた版で `tsc` が通ること（型エラーではない）も記録 |
| ミューテーションの照合 | base・head の119件を照合。**CI の artifact をダウンロードしてローカル結果と119件一致を確認** | base・head の119件を照合。CI はジョブの成功だけを記載 |
| CompileError の説明 | ID 27（列の比較 → `true`）が CompileError であることを正しく説明 | ID 26〜29 が CompileError であることは正しい。ただし ID 30 を「対になる条件（列 x）の変異」と書いており不正確（下記） |
| CI | [run 39122233807](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39122233807) の4ジョブすべて成功 | [run 39122250758](https://github.com/dyamada-jaki/overstrata-board/actions/runs/39122250758) の4ジョブすべて成功 |

### ミューテーション（両 PR 共通の結果）

- 対象は `stryker.config.mjs` の全5ファイル。StrykerJS 10.0.0 / Vitest 5.0.3、ホストは macOS・Node v24.14.0
- #25 追加後・今回の base `3289c06`・今回の追加後（両 PR）のどれも: Killed 78 / Timeout 4 / Survived 8 / NoCoverage 0 / CompileError 29 / RuntimeError・Ignored・Pending 0（計119）。スコア 91.11%（Killed のみ 86.67%）。base と追加後で状態が変わった変異は0件。**#25 追加後から悪化なし**
- 今回の誤りに対応する `Board.tsx:32:15` の変異（ID 26〜29）と、`aria-pressed` 側の `30:27`（ID 16〜19）は CompileError で計測されない。追加テストは killedBy に現れない。今回の誤りの検出は、手で誤りを入れた記録だけを根拠にしている
- 残る Survived 8件は #19 で分類済みの既存のもの（style 4件 → #26、React key・正規表現2件・巨大整数 → #19 の保留）

### 相互レビュー

| レビュー | 対象 SHA | 結論 | 指摘 |
|---|---|---|---|
| [Claude Code → PR #30](https://github.com/dyamada-jaki/overstrata-board/pull/30#issuecomment-6249324281) | `60c249c` | 受け入れ条件5つをすべて満たす。4つのチェック・Docker E2E 4件・ミューテーションを再実行して成功。CI の artifact も照合（差0件）。手で誤りを入れた検出を worktree の外のコピーで再現 | 好み1件 |
| [Codex → PR #31](https://github.com/dyamada-jaki/overstrata-board/pull/31#issuecomment-6249282760) | `8053963` | 受け入れ条件5つをすべて満たす。4つのチェック・Docker E2E 4件・ミューテーションを再実行して成功。手で誤りを入れた検出を `/tmp` のコピーで再現 | 推奨1件 |

- Claude Code のレビュー担当は、表示側の対になる条件も確かめた。`aria-pressed` の列の比較を落とす誤り（`selected?.y === position.y`、Stryker では ID 17 で CompileError）を手で入れると、型チェックは通り、Vitest は 5 failed / 63 passed になった。表示側の穴は既存テストで塞がっている
- 両レビューとも、レビュー中に `origin/main` が `02d8f14`（README だけの変更）へ進んだことに触れている。両 PR の差分とは重ならず、2026-10-18 20:25 JST ごろに両 PR とも `MERGEABLE` / `CLEAN` を確認した

### コーディネーターによる指摘の確認

| 指摘 | 判定 | 扱い |
|---|---|---|
| 推奨（PR #31）: 「対になる条件（列 x）の変異 ID 30」は不正確。ID 30 は行 y の比較を `true` にして列 x だけの判定を残す変異 | **確認できた**。PR #31 の worktree の `mutation-artifacts/run-20261018T110930-Nhe5Rf/mutation/mutation.json` で、ID 30 は `Board.tsx:32:44` の `ConditionalExpression → true`（`current.y === position.y` を置換）、Killed・killedBy `["3"]`（#25 の同じ列のテスト）だった。コードやテストへの影響はない | PR #31 は推薦しないので直さない。このレポートで正しい式を残す |
| 好み（PR #30）: 本文の再現用スクリプトの出力名（`repro-*`）と、実際の記録名（`manual-*`）の対応が書かれていない | 確認できた。結果には影響しない | 採用を止める理由にしない。スクリプトは同じ手順の再掲で、実際の記録は `manual-{before,after}` と `manual-*-test.log` |

### 推薦

**PR #30 を推薦する。** コードは同一なので、振る舞いはどちらを採っても変わらない。違いは記録だけ。

- PR #30 は CI の artifact をダウンロードしてローカル結果と119件一致を確かめており、CompileError の変異 ID の説明にも誤りがない
- PR #31 は、手で入れた誤りと照合するときに参照される変異 ID 30 の説明が不正確（確認済みの推奨指摘）

## 6. PO の受け入れ確認

- 開発チームの推薦: [PR #30 のコメント](https://github.com/dyamada-jaki/overstrata-board/pull/30#issuecomment-6249363542)（20:26 JST ごろ）
- PO（Codex、端末 `term_d13ebefa…`）に `$accept-review 30 run_749a32a97138` を送った（20:27:45 JST）。handoff は 20:28:36 JST に届いた
- 判定: [**受け入れ（1回目）**](https://github.com/dyamada-jaki/overstrata-board/pull/30#issuecomment-6249371377)。対象 head は `60c249c`、差し戻しは0回。PO は受け入れ条件・仕様・スコープ・振る舞いを、PR 本文・相互レビュー・推薦の記録と、同じ head の CI 4ジョブの成功で照合した。コードレビューやテストの再実行は行っていない
- PO が挙げた事項: 採用する PR の最終判断は人間が行う。新たな実機確認は不要。#8 から #9 へ持ち越した実機確認は従来どおり別に追う。spec.md・Issue に戻す候補はない。二重実装の追加価値の観察は #9 のふりかえりの材料にする
- PO の確認の後も、PR #30 の head は `60c249c` のまま（20:29 JST ごろに再取得して確認）

## 7. 前回の改善を試した結果

| 改善 | 結果 |
|---|---|
| #25 ふりかえり A（testing.md 7章に、CompileError の変異が見えない穴になりうることを追記） | **効果を確認できた**。両実装とも CompileError を検出件数に数えず、手で誤りを入れた記録と分けて PR に残した。両レビュー担当とも対になる条件を自分で確かめ、手で入れた誤りを再現した。Claude Code のレビュー担当は、表示側の対の条件まで確かめた |
| SHA を固定した前後比較 | 効果を確認できた。両実装・両レビューとも base `3289c06` と各 head で119件を照合した |
| ブラウザの入力が届かないときの手順（#18） | 未確認。画面確認を省いたので、試す場面がなかった |

## 8. 採用・マージ・後片付け（2026-10-18 JST）

- 人間の判断: PR #30 を採用（推薦どおり）。マージ・クローズ・後片付けの実行内容も承認
- マージ: PR #30 を squash でマージ（20:38:25 JST、head `60c249c` の一致を条件に実行）。main のコミットは `77f0353`。Issue #29 は自動で閉じた（20:38:26 JST）。マージ直前に CI 4ジョブの成功を再確認した
- PR #31 をクローズ（20:38:37 JST）。理由「テストのコードは PR #30 と同一で、PR 本文の変異 ID 30 の説明が不正確だったため（今回は PR #30 を採用）」。リモートブランチ `dyamada-jaki/issue-29-claude`（`8053963`）は残した
- 削除した資源: worktree `issue-29-claude`（`finish.sh remove-worktree`）。worktree `issue-29-codex` は、削除コマンドの時点で Git・Orca の一覧と実パスのどれにも無く、既に消えていた（PR #30 のマージでブランチを消した後。原因は未確認）。両方とも削除前に未コミットの変更・push していないコミットが無いことを確認済み。ローカルブランチは両方とも残っていない。採用した PR のリモートブランチはマージ時に削除。Docker プロジェクト `issue-29-claude`・`issue-29-codex` はコンテナ・ボリューム・ネットワークとも0件（`finish.sh docker-down` の後に再確認）。Orca のワーカーは4件とも release 済みで、reclaimable は0件
- 両 worktree の Git 管理外の記録（`mutation-artifacts/`・`e2e-artifacts/`・`reports/`）は worktree と一緒に消えた。必要な内容は PR 本文・レビューコメント・このレポートに残っている
- main CI: マージ後の `77f0353` と、その後の `b449f2c` の CI は成功

## 9. 学びと次の作業

- **小さなテスト補強での二重実装の追加価値**（#25 ふりかえり C の観察。next-issues.md でコーディネーターの担当とされた記録）: 2つの実装はテストのコードが完全に同一（テスト名まで一致）で、違いは PR 本文の記録の詳しさと正確さだけだった。相互レビューでは、それぞれ記録上の指摘が1件（推奨・好み）見つかったが、どちらもコードには影響しない。#25 に続いて2回目の同じ傾向。これは #9 のふりかえりで担当構成を再検討するときの材料の1つで、ここでは結論にしない
- spec.md との食い違いや仕様の抜けは見つかっていない

### ふりかえり（2026-10-18 JST）

- 続けること: 手で誤りを入れた検出の記録、SHA を固定した前後比較、相互レビュー担当による独立した再現。#25 の改善 A（testing.md 7章の CompileError の追記）は両実装・両レビューで効果を確認できた（7章）
- 分かったこと: 小さなテスト補強の二重実装は、#25 に続いてテストのコードが同一になった。差は記録の正確さだけで、相互レビューが記録の誤り（PR #31 の変異 ID 30 の説明）を拾った

### 改善案の採否

| 案 | 人間の判断 | 反映先・状態 | 再検討の条件 |
|---|---|---|---|
| A: dual-implement 手順4に、2つ目の計画を待つ方法を書く（1つ目の計画は返信も ack もせず、読むだけの `check --all` を繰り返して2つ目を待ち、人間の承認後に返信して届いた順に ack する。今回のコーディネーターはこの方法で待った） | **保留**（試験的に動かしているものが多いため） | 未反映 | 試験運用が落ち着いたとき、または次の dual-implement で同じ待ち方に迷ったとき。判断するのは利用者 |
| B: 小さなテスト補強は単独実装にする（#25 の案 C の続き） | **保留**（同上） | 未反映。観察を続ける | #9 のふりかえりで担当構成と一緒に再検討する。#26 でも同じ傾向が出るかを記録する |

- 実機確認: 本 Issue では不要。#8 から #9 へ持ち越した確認は、#9 のレビューで利用者が行う（区切り1は未達）

## 10. PO への申し送り

| 日付 | 内容 | 根拠 | 状態 |
|---|---|---|---|
| 2026-10-18 | next-issues.md の「現在地」への反映: #29 完了。PR #30（Codex）を採用し main `77f0353` へ取り込み、main CI 成功。PR #31（Claude Code）は不採用でクローズ（リモートブランチは保持）。実装・自動検証は確認済み。新たな実機確認は不要。区切り1は未達のまま（#9 が残る）。#8 から持ち越した実機確認は #9 のレビューで利用者が行う | 1・5・6・8章 | 申し送り |
| 2026-10-18 | 「持ち越しと次回の効果確認」の #25 の行: testing.md 7章の CompileError の追記は #29 で効果を確認できた。同じ行の補強は完了。小さなテスト補強での二重実装の追加価値は2回目も記録の違いにとどまった（案 B は保留。#9 のふりかえりで再検討） | 7・9章 | 申し送り |
| 2026-10-18 | spec.md の発見・後続 Issue の案: なし | 5・6章 | — |
