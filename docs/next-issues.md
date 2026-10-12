# 次に切る Issue の下書き

[docs/workflow.md](workflow.md) ステップ2の形式で書いた下書き。**GitHub に登録したら、この節をこのファイルから消す**（二重管理にしないため）。

- 最終更新: 2026-10-13
- リポジトリは PRIVATE。それでも Issue・PR に秘匿情報は書かない（→ [spec.md 3.0](spec.md)）

## 現在地

| 項目 | 状態 |
|---|---|
| workflow の準備1〜4 | 完了（設計の席・spec.md 初版・エージェント向けファイル・main へコミット） |
| 次の一手 | コーディネーターで `/dual-implement 7` を実行する。盤面の表示も、#7 と並行できる独立した Issue として切り出せる（spec.md 4章） |
| 登録済み Issue | [#1 開発の土台を作る（雛形・コンテナ・CI）](https://github.com/dyamada-jaki/overstrata-board/issues/1) — 完了（PR #2 を採用、PR #3 は不採用）<br>[#4 開発環境の小さな改善（CI の権限・公開範囲・型の版）](https://github.com/dyamada-jaki/overstrata-board/issues/4) — 完了（[PR #5](https://github.com/dyamada-jaki/overstrata-board/pull/5) を採用、[PR #6](https://github.com/dyamada-jaki/overstrata-board/pull/6) は不採用）<br>[#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7) — 未着手（元の下書き Issue B） |
| 実装 | 雛形・コンテナ・CI ができた（#1）。開発環境の改善も完了（#4）。盤面・キャラはまだ |

Issue は一度に最大3本まで。次は盤面の表示と距離・移動範囲の計算（#7）を並行して進められる。その両方が完了したら、キャラの表示と移動を切る（→ [spec.md 4章](spec.md)）。
