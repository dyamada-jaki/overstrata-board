# 次に切る Issue の下書き

[docs/workflow.md](workflow.md) ステップ2の形式で書いた下書き。**GitHub に登録したら、この節をこのファイルから消す**（二重管理にしないため）。

- 最終更新: 2026-10-14
- リポジトリは PRIVATE。それでも Issue・PR に秘匿情報は書かない（→ [spec.md 3.0](spec.md)）

## 現在地

| 項目 | 状態 |
|---|---|
| workflow の準備1〜4 | 完了（設計の席・spec.md 初版・エージェント向けファイル・main へコミット） |
| 設計 | 合意した完成形と4つの区切りを spec.md に反映し、main にコミット済み。盤面表示の下書きは #8 として登録済み |
| 次の一手 | #7（距離計算）と #8（盤面表示）を進める。互いに依存しないが、実装は現在の `dual-implement` 運用に合わせ1本ずつ進める |
| 登録済み Issue | [#1 開発の土台を作る（雛形・コンテナ・CI）](https://github.com/dyamada-jaki/overstrata-board/issues/1) — 完了（PR #2 を採用、PR #3 は不採用）<br>[#4 開発環境の小さな改善（CI の権限・公開範囲・型の版）](https://github.com/dyamada-jaki/overstrata-board/issues/4) — 完了（[PR #5](https://github.com/dyamada-jaki/overstrata-board/pull/5) を採用、[PR #6](https://github.com/dyamada-jaki/overstrata-board/pull/6) は不採用）<br>[#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7) — OPEN（2026-10-14に確認）<br>[#8 10×10の盤面を表示し、マスを選べるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/8) — OPEN（2026-10-14に登録） |
| 実装 | 雛形・コンテナ・CI ができた（#1）。開発環境の改善も完了（#4）。盤面・キャラはまだ |

Issue は一度に最大3本まで。今は #7 と #8 の2本。その両方が完了し、サンプルの名前・装備・初期配置を決めたら、キャラの表示と移動を切る（→ [spec.md 4・5章](spec.md)）。後の区切りは仕様のロードマップに置き、まだ実装用 Issue を作らない。

未登録の下書きはなし。#8 の本文は GitHub で管理する。
