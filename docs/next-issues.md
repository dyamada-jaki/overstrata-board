# 次に切る Issue の下書き

[docs/workflow.md](workflow.md) ステップ2の形式で書いた下書き。**GitHub に登録したら、この節をこのファイルから消す**（二重管理にしないため）。

- 最終更新: 2026-10-14
- リポジトリは PRIVATE。それでも Issue・PR に秘匿情報は書かない（→ [spec.md 3.0](spec.md)）

## 現在地

| 項目 | 状態 |
|---|---|
| workflow の準備1〜4 | 完了（設計の席・spec.md 初版・エージェント向けファイル・main へコミット） |
| 設計 | 合意した完成形と4つの区切りを spec.md に反映し、main にコミット済み。区切り1に必要な Issue はすべて登録済み。依存先が未完了のものも着手条件付きで先行登録する方針を spec.md・workflow.md に記録 |
| 次の一手 | #7（距離計算）と #8（盤面表示）を進める。両方の完了とサンプル情報の確定後に #9（キャラ表示・移動）へ着手する。実装は現在の `dual-implement` 運用に合わせ1本ずつ進める |
| 登録済み Issue | [#1 開発の土台を作る（雛形・コンテナ・CI）](https://github.com/dyamada-jaki/overstrata-board/issues/1) — 完了（PR #2 を採用、PR #3 は不採用）<br>[#4 開発環境の小さな改善（CI の権限・公開範囲・型の版）](https://github.com/dyamada-jaki/overstrata-board/issues/4) — 完了（[PR #5](https://github.com/dyamada-jaki/overstrata-board/pull/5) を採用、[PR #6](https://github.com/dyamada-jaki/overstrata-board/pull/6) は不採用）<br>[#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7) — OPEN（2026-10-14に確認）<br>[#8 10×10の盤面を表示し、マスを選べるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/8) — OPEN（2026-10-14に登録）<br>[#9 サンプルキャラ4体を表示し、移動範囲を確認して動かせるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/9) — OPEN・着手条件待ち（2026-10-14に先行登録） |
| 実装 | 雛形・コンテナ・CI ができた（#1）。開発環境の改善も完了（#4）。盤面・キャラはまだ |

区切り1の残作業は #7・#8・#9 の3本で追う。#9 の実装前に、サンプル4体の名前・装備・初期配置を人間が決め、spec.md 2.2へ反映する（→ [spec.md 4・5章](spec.md)）。Issue の登録完了と区切りの達成は別。3本の実装と、幅375pxの実機での一連の操作確認が済んだら区切り1を達成とする。後の区切りは仕様のロードマップに置く。

未登録の下書きはなし。各 Issue の本文は GitHub で管理する。
