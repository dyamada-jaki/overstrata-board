# 次に切る Issue の下書き

[docs/workflow.md](workflow.md) ステップ2の形式で書いた下書き。**GitHub に登録したら、この節をこのファイルから消す**（二重管理にしないため）。

- 最終更新: 2026-10-15
- リポジトリは PRIVATE。それでも Issue・PR に秘匿情報は書かない（→ [spec.md 3.0](spec.md)）

## 現在地

| 項目 | 状態 |
|---|---|
| workflow の準備1〜4 | 完了（設計の席・spec.md 初版・エージェント向けファイル・main へコミット） |
| 設計 | 合意した完成形と4つの区切りを spec.md に反映し、main にコミット済み。区切り1に必要な Issue はすべて登録済み。依存先が未完了のものも着手条件付きで先行登録する方針を spec.md・workflow.md に記録 |
| 次の一手 | #12（座標・盤面・装備の型の整理）は着手可能。#8・#9 のマスとキャラのタップ操作の具体案も利用者と確定し、spec.md 2.1・2.3 と両 Issue に反映する（現在は spec.md 5章で確認中）。操作仕様の確定後に #8（盤面表示）、その完了後に #9（キャラ表示・移動）へ進む。#12 はタップ仕様の未決事項に依存せず、実装は1本ずつ進める |
| 登録済み Issue | [#1 開発の土台を作る（雛形・コンテナ・CI）](https://github.com/dyamada-jaki/overstrata-board/issues/1) — 完了（PR #2 を採用、PR #3 は不採用）<br>[#4 開発環境の小さな改善（CI の権限・公開範囲・型の版）](https://github.com/dyamada-jaki/overstrata-board/issues/4) — 完了（[PR #5](https://github.com/dyamada-jaki/overstrata-board/pull/5) を採用、[PR #6](https://github.com/dyamada-jaki/overstrata-board/pull/6) は不採用）<br>[#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7) — 完了（[PR #11](https://github.com/dyamada-jaki/overstrata-board/pull/11) を採用、[PR #10](https://github.com/dyamada-jaki/overstrata-board/pull/10) は不採用）<br>[#8 10×10の盤面を表示し、マスを選べるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/8) — OPEN・着手条件待ち（操作仕様を確認中）<br>[#9 サンプルキャラ4体を表示し、移動範囲を確認して動かせるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/9) — OPEN・着手条件待ち（2026-10-14に先行登録）<br>[#12 座標・盤面・装備の型を整理する](https://github.com/dyamada-jaki/overstrata-board/issues/12) — OPEN・着手可能（#7 の相互レビューから分離した改善。2026-10-15に登録） |
| 実装 | 雛形・コンテナ・CI ができた（#1）。開発環境の改善も完了（#4）。距離・装備別の移動力・移動範囲の計算も完了（#7）。盤面・キャラはまだ |
| 対応レポート | [Issue #7 のレポート](issue-reports/issue-7.md)に計画・承認・検証・採用判断・後片付けと改善の反映先を保存。以後は [保存方法](issue-reports/README.md)に従い、1 Issue につき1ファイルを残す |

区切り1の残る機能は #8・#9 の2本で追う。#12 は型の整理を行う独立した改善で、ゲームのルールや画面の仕様を増やさない。サンプル4体の名前・装備・初期配置は spec.md 2.2で確定済み。Issue の登録完了と区切りの達成は別。残る2本の実装・エージェントによる幅375pxのブラウザ等での確認・人間によるレビュー時のスマホ実機での一連の操作確認が済んだら区切り1を達成とする。後の区切りは仕様のロードマップに置く。

未登録の下書きはなし。各 Issue の本文は GitHub で管理する。
