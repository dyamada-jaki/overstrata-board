# Issue #7 対応レポート — 距離と移動範囲を計算する

- 状態: **完了（マージ・後片付け済み）**
- 対象期間: 2026-10-13〜2026-10-15（日時は日本時間・JST）
- レポート作成・最終更新: 2026-10-15
- Issue: [#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7)
- 採用: [PR #11 / Codex](https://github.com/dyamada-jaki/overstrata-board/pull/11)
- 不採用: [PR #10 / Claude Code](https://github.com/dyamada-jaki/overstrata-board/pull/10)
- 後続の改善: [Issue #12 座標・盤面・装備の型を整理する](https://github.com/dyamada-jaki/overstrata-board/issues/12)（登録済み・未実装）

## 1. 今回できたこと

距離、装備別の移動力、移動範囲の一覧を計算する純粋関数とテストを用意した。両実装とも受け入れ条件6項目を満たし、相互レビューで必須修正はなかった。移動範囲の期待一覧・境界・入力の非破壊を明示するテストを評価し、利用者が Codex の PR #11 を採用した。

これは区切り1「1台で盤面と移動が動く」の計算部分である。盤面表示の #8、キャラ表示・移動の #9 が残っており、区切り1全体は未達成。

## 2. 仕様・範囲・着手条件

参照した仕様は [実装開始時の spec.md](https://github.com/dyamada-jaki/overstrata-board/blob/8f56fc9b789c539034fccf55a6ece621df89dcc3/docs/spec.md) の 2.3・3.1・3.2。現在の仕様は [spec.md](../spec.md) を参照する。

- 距離は、横と縦の差の絶対値から `max(dx, dy) + floor(min(dx, dy) / 2)` で求める。
- 基本移動力は5。装備補正は軽装0・中装−1・重装−2で、結果は5・4・3。
- 移動範囲は、移動力以内かつ盤面内のマスから、他キャラの位置と現在地を除いた一覧。
- 数値は仮の値なので、基本値と補正値を1か所に集約する。
- アプリはルールを補助として見せる。今回の範囲一覧を、移動操作を禁止する判定として使うことは扱わない。

前提の #1 と PR #2 は完了・マージ済みだった。#8・#9 に残っていたタップ操作の未決事項は、画面を含まない #7 の着手を妨げなかった。

スコープ外は、画面表示、座標ラベル変換、実際の移動先の可否、タップ操作、他キャラの通り抜け判定、地形・障害物。不正入力の新しいルールも追加せず、正常な整数座標と正の整数の盤面サイズを扱う方針で進めた。

## 3. 進行と人間の判断

| 日時（JST） | 段階 | 実施・判断 |
|---|---|---|
| 10月13日 01:17 | Issue 登録 | 距離と移動範囲の計算を、画面から独立した #7 として登録 |
| 10月14日 23:49 | 着手 | 前提と仕様を確認し、Orca で Claude Code と Codex の実装ワーカーを別々の worktree に起動 |
| 10月14日 23:51〜23:53 | 計画 | 両者から受け入れ条件・ファイル・テスト・確認事項を含む計画を受領し、コーディネーターが比較 |
| 10月15日 00:18 | 計画承認 | 利用者の「両方に承認を送って」に従って、両ワーカーへ承認を送信 |
| 10月15日 00:19〜00:20 | 実装・PR 作成 | Claude Code が #10、Codex が #11 を作成 |
| 10月15日 00:23 | 相互レビュー | Codex が #10、Claude Code が #11 をレビューし、結果を各 PR にコメント |
| 10月15日 | 採用判断 | コーディネーターが差分・CI・レビューを確認して #11 を推奨。利用者が finish-issue で PR #11 を指定 |
| 10月15日 11:37 | マージ | 削除対象と閉じる理由を示し、利用者の「実行して」を受けて #11 を squash マージ。#7 と #10 をクローズ |
| 10月15日 11:40 | 完了記録 | worktree・ローカルブランチ・Docker ボリュームを片付け、next-issues.md の更新を main に push |
| 10月15日 | 改善と記録の整備 | 利用者の依頼により、本レポートと保存手順を作成。型の改善を #12 として登録 |

Issue・PR・レビュー・マージの日時は GitHub の記録、着手・計画・承認は当セッションの会話と Orca の記録による。実行の識別子は `run_416ace83a743`。所要時間をモデルの速さの比較には使っていない。

### 計画で確認したこと

Claude Code は、他キャラの位置を `Position[]` で受け取ること、移動力の定数を `src/data/` に置くこと、不正入力の扱いを確認事項に挙げた。位置の配列と定数の置き場所は既存方針に合っており、入力については今回扱う正常な座標・寸法に範囲をそろえた。Codex から追加の確認事項はなかった。

両案を利用者に提示してから承認を返した。承認待ちで ask が時間切れになった際も、同じ質問を再開して待ち、承認前に実装を始めなかった。

## 4. 2つの実装の比較

| 観点 | Claude Code / PR #10 | Codex / PR #11 |
|---|---|---|
| ファイル構成 | 型・距離・移動・定数とテストに分割。追加6ファイル | 計算と型を movement.ts にまとめ、定数とテストを分離。追加3ファイル |
| 距離 | `distance(from, to)` | `getDistance(from, to)` |
| 装備別の移動力 | `movementForArmor(armor)` | `getMovement(armor)` |
| 範囲一覧 | `reachablePositions({ from, movement, occupied, board })` | `getMovementRange(origin, movement, otherPositions, boardSize)` |
| 定数 | 基本値と装備補正を src/data/movement.ts に集約 | 同左 |
| 共通する検証 | 距離の6例、逆方向、装備3種類、距離境界、盤面の端、長方形、占有・現在地の除外、移動力0、サンプル C8→D3 | 同左 |
| 特徴的な検証 | 占有位置の一覧に現在地が混ざっても結果が同じになること | 小さな盤面で期待一覧を明記、4辺・4隅、他キャラの向こう側も範囲に含むこと、入力の非破壊 |

採用した実装は [movement.ts](https://github.com/dyamada-jaki/overstrata-board/blob/47d56fbc47ad28999053fea5ad8928b685093fe9/src/domain/movement.ts)、[定数](https://github.com/dyamada-jaki/overstrata-board/blob/47d56fbc47ad28999053fea5ad8928b685093fe9/src/data/movement.ts)、[テスト](https://github.com/dyamada-jaki/overstrata-board/blob/47d56fbc47ad28999053fea5ad8928b685093fe9/src/domain/movement.test.ts)で確認できる。ここでは後続変更の影響を受けないよう、レビュー時のコミットにリンクしている。

## 5. 受け入れ条件と検証結果

| # | 受け入れ条件 | PR #10 | PR #11 |
|---|---|---|---|
| 1 | 仕様表の距離6例を満たすテスト | 満たす。6例を検証 | 満たす。6例を検証 |
| 2 | 逆方向でも同じ距離になるテスト | 満たす。始点終点の交換・方向反転 | 満たす。始点終点の交換・方向反転 |
| 3 | 軽装5・中装4・重装3のテスト | 満たす。3種類を検証 | 満たす。3種類を検証 |
| 4 | 基本値と補正値を1か所で変更できる | 満たす。data の定数を参照 | 満たす。data の定数を参照 |
| 5 | 位置・移動力・他キャラ・盤面サイズから一覧を得られる | 満たす。純粋関数を実装 | 満たす。純粋関数を実装 |
| 6 | 盤面外・他キャラ・現在地の除外テスト | 満たす。端・長方形・占有などを検証 | 満たす。4辺・4隅・長方形・占有などを検証 |

以下は #7 の実装・レビュー時点の記録。test / typecheck / lint / build の4項目は、両 PR で成功している。

| 確認の主体 | PR #10 | PR #11 |
|---|---|---|
| 作成者の報告 | 専用 Docker Compose 環境とホストで4項目成功。全37テスト | 専用 Docker Compose 環境で4項目成功。全42テスト（追加37テスト） |
| 相互レビューでの再確認 | Codex がホストの Node 24 で4項目を再実行し成功。作成者の Docker 操作履歴までは独立に再確認していない | Claude Code が専用の Docker Compose 環境・Node 24 で4項目を再実行し成功 |
| コーディネーターの確認 | 実際の差分、レビュー内容、対象コミットの CI 成功を確認 | 同左 |
| GitHub CI | [テスト等・本番イメージの2ジョブ成功](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38588340500) | [テスト等・本番イメージの2ジョブ成功](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38588489723) |
| 画面・スマホ実機 | 画面を含まないため対象外 | 同左 |

検証の根拠は [#10 の PR 本文](https://github.com/dyamada-jaki/overstrata-board/pull/10)、[#11 の PR 本文](https://github.com/dyamada-jaki/overstrata-board/pull/11)と、次節のレビューコメントに残っている。

## 6. 相互レビューと採用理由

- [Codex → PR #10 のレビュー](https://github.com/dyamada-jaki/overstrata-board/pull/10#issuecomment-6171837494): 受け入れ条件はすべて満たす。必須・推奨・好みの指摘は0件。
- [Claude Code → PR #11 のレビュー](https://github.com/dyamada-jaki/overstrata-board/pull/11#issuecomment-6171832849): 受け入れ条件はすべて満たす。必須・推奨は0件、好みは次の2件。

| PR #11 への提案 | コーディネーターの確認 | 扱い |
|---|---|---|
| Armor を補正値の表のキーから推論しているため、装備の種類を明示した型にする | 実際に `keyof typeof movementRules.armorModifiers` で定義されていることを確認。現状の3種類は仕様と一致 | マージを妨げない任意の改善。後続 #12 で扱う |
| Position・BoardSize を計算モジュールから分け、他の機能でも参照しやすくする | 両型が movement.ts 内にあることを確認。#8・#9 で共用する際の整理として妥当 | 同上 |

両実装とも採用可能だった。コーディネーターは、範囲一覧の欠落・混入、盤面の境界、通り道を制限しない現在の仕様、入力の非破壊を明示的に確認できる点から #11 を推奨した。比較の軸は、テストが保証している振る舞いだった。

利用者が #11 を選択し、削除対象の確認後にマージを承認した。#10 には [不採用理由のコメント](https://github.com/dyamada-jaki/overstrata-board/pull/10#issuecomment-6183127442)を残した。今回、仕様の穴や両者に共通する機能上の欠落は見つからなかった。

## 7. マージと後片付け

- PR #11 を squash マージ: [560e489](https://github.com/dyamada-jaki/overstrata-board/commit/560e4890d27c6eaea884fefcf9769b29c2c3b33e)。
- `Closes #7` により Issue #7 が閉じたことを確認。PR #10 は不採用理由を添えてクローズ。
- マージ前に、削除対象に未コミット変更・未 push コミットがないことを確認。Docker ボリュームは依存パッケージ用の内容であることを確認した。
- 2つの worktree（issue-7-claude / issue-7-codex）、対応するローカルブランチ、専用の node_modules ボリューム2つを削除。
- 実装・レビュー計4ワーカーは完了を受け取ってから解放。対象コンテナ・ボリュームと未解放ワーカーの残存がないことを確認。
- 採用側のリモートブランチは削除。不採用側の `dyamada-jaki/issue-7-claude` と Docker イメージは保管。
- main にマージ結果を取り込み、[next-issues.md の更新 a75fa99](https://github.com/dyamada-jaki/overstrata-board/commit/a75fa995053126658bd144decfbbb3a6d1e97faf)を push。完了時の作業ツリーはクリーンだった。

未完了の後片付けはない。コードの型整理は #7 の未完了事項ではなく、後続の改善として登録している。

## 8. 学び・改善の反映先・次の作業

| 材料・改善 | 反映先 | 本レポート作成時の状態 |
|---|---|---|
| 一覧を返す計算で、小さい例の期待一覧・境界・入力の非破壊を検討する | [implement-issue スキル](../../.agents/skills/implement-issue/SKILL.md)のテスト計画。Claude Code 用も同期 | 参考観点として反映済み。必要な観点は関数の性質に合わせて選ぶ |
| 計画や採用理由を会話だけに残さず、1 Issue につき1ファイルで保存する | [保存方法](README.md)、[workflow.md](../workflow.md)、dual-implement・finish-issue の記録手順 | 反映済み。以後は同じ Issue のレポートを更新する |
| 装備型の明示、座標・盤面型の共用 | [Issue #12](https://github.com/dyamada-jaki/overstrata-board/issues/12) | 登録済み・未実装。ゲームのルールと計算結果を変えない |
| マス選択とキャラ選択の切り替え・再タップなどの未決仕様 | [作成時の spec.md 5章](https://github.com/dyamada-jaki/overstrata-board/blob/3e1fa6be6a81c760ea4825bbe2a5305be3cb118a/docs/spec.md)、[#8](https://github.com/dyamada-jaki/overstrata-board/issues/8)、[#9](https://github.com/dyamada-jaki/overstrata-board/issues/9) | 利用者との確定待ち。決定後に spec.md 2.1・2.3 と両 Issue に反映する |

今回観察した違いは、Claude Code が型と計算を分けた構成、Codex が期待一覧と境界を具体的に確認するテストを選んだこと。1回の結果をモデル全般の性質とせず、今後の実装計画・レビューで使える具体例として残す。

運用上は、`gh issue view N --comments` だけでは本文が出ない場面があったため、本文とコメントを JSON で取得する手順を implement-issue・dual-implement に反映した。また `orca` の入口のリンクが使えず、当セッションではアプリ内の CLI を直接呼び出して進めた。システム側のリンクは変更していない。

次に着手できる改善は #12。区切り1の残る機能は #8・#9 の2本で、タップ仕様を確定してから #8、続いて #9 を進める。過去の #1・#4 の対応レポートは今回作成していない。

追記（2026-10-15）: 利用者がマス・キャラの選択、再タップでの解除、別キャラへの選択切り替え、枠と移動範囲の表示、余白タップの挙動を承認した。[spec.md 2.1・2.3](../spec.md) と #8・#9 の受け入れ条件に反映し、上表のタップ仕様の未決事項は解消した。#8 は着手可能、#9 は #8 の完了・main への取り込み待ちとなった。アプリの実装はこれから行う。

追記（2026-10-15・座標表記）: 30×30を見据え、利用者が1始まりの `(横, 縦)` 表示を承認した。spec.md・エージェント向けガイド・#8・#9 に反映。内部座標とサンプル配置は維持する。本レポートの `C8→D3` は実装時点の表記で、新表記では `(3, 8)→(4, 3)` に対応し、距離は同じ5となる。

## 9. レポート・手順更新の確認

2026-10-15 のレポート作成と手順更新では、相対リンクの参照先、Claude Code 用と Codex 用の3組のスキルの一致、差分の書式を確認した。アプリのコードは変更していない。

skill-creator 付属の標準検証器は、既存の frontmatter 項目 `argument-hint` に対応しておらず終了コード1になる。変更前の3スキルでも同じ結果で、frontmatter は今回変更していない。YAML の読み取りと両用ファイルの一致は別途確認し、標準検証器が全面的に成功したとは扱わない。
