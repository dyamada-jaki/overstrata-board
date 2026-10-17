# 次に切る Issue の下書き

[docs/workflow.md](workflow.md) ステップ2の形式で書いた下書き。**GitHub に登録したら、この節をこのファイルから消す**（二重管理にしないため）。

- 最終更新: 2026-10-17
- リポジトリは PRIVATE。それでも Issue・PR に秘匿情報は書かない（→ [spec.md 3.0](spec.md)）

## 現在地

| 項目 | 状態 |
|---|---|
| workflow の準備1〜4 | 完了（設計の席・spec.md 初版・エージェント向けファイル・main へコミット） |
| 設計 | 合意した完成形と4つの区切りを spec.md に反映し、main にコミット済み。区切り1に必要な Issue はすべて登録済み。依存先が未完了のものも着手条件付きで先行登録する方針を spec.md・workflow.md に記録 |
| 次の一手 | #8はPR #17をmainへ取り込み、後片付けまで完了。次は#18（選択操作・座標ラベルの回帰テスト補強）を実装し、続いて#9（キャラ表示・移動）へ進む。2026-10-17に利用者が順序を承認。#16の状態管理と盤面表示の責務分担は#9の計画で検討する。#12（座標・盤面・装備の型の整理）は引き続き着手可能な独立した改善。実装は1本ずつ進める |
| 登録済み Issue | [#1 開発の土台を作る（雛形・コンテナ・CI）](https://github.com/dyamada-jaki/overstrata-board/issues/1) — 完了（PR #2 を採用、PR #3 は不採用）<br>[#4 開発環境の小さな改善（CI の権限・公開範囲・型の版）](https://github.com/dyamada-jaki/overstrata-board/issues/4) — 完了（[PR #5](https://github.com/dyamada-jaki/overstrata-board/pull/5) を採用、[PR #6](https://github.com/dyamada-jaki/overstrata-board/pull/6) は不採用）<br>[#7 距離と移動範囲を計算する](https://github.com/dyamada-jaki/overstrata-board/issues/7) — 完了（[PR #11](https://github.com/dyamada-jaki/overstrata-board/pull/11) を採用、[PR #10](https://github.com/dyamada-jaki/overstrata-board/pull/10) は不採用）<br>[#8 10×10の盤面を表示し、マスを選べるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/8) — 完了（PR #17を採用、PR #16は不採用。2026-10-17にマージ・後片付け完了。スマホ実機は未確認）<br>[#9 サンプルキャラ4体を表示し、移動範囲を確認して動かせるようにする](https://github.com/dyamada-jaki/overstrata-board/issues/9) — OPEN・#18の完了・mainへの取り込み待ち（#8は完了。状態管理と盤面表示の責務を計画で検討。キャラ操作E2Eも追加）<br>[#18 盤面の選択操作と座標ラベルの回帰テストを補強する](https://github.com/dyamada-jaki/overstrata-board/issues/18) — OPEN・着手可能（PR #17をmainに取り込み済み）。#9より先に実施<br>[#12 座標・盤面・装備の型を整理する](https://github.com/dyamada-jaki/overstrata-board/issues/12) — OPEN・着手可能（#7 の相互レビューから分離した改善。2026-10-15に登録）<br>[#13 Playwright の E2E 実行環境と CI を整える](https://github.com/dyamada-jaki/overstrata-board/issues/13) — 完了（[PR #14](https://github.com/dyamada-jaki/overstrata-board/pull/14) を採用、[PR #15](https://github.com/dyamada-jaki/overstrata-board/pull/15) は不採用。2026-10-16 にマージ・後片付け完了） |
| 実装 | 雛形・コンテナ・CI（#1）、開発環境の改善（#4）、距離・装備別の移動力・移動範囲の計算（#7）、Playwright の E2E 実行環境と CI（#13）が完了。盤面（#8）もPR #17でmainに取り込み済み。#18のテスト補強・#9のキャラは未着手 |
| テスト・レビュー | [testing.md](testing.md) に共通方針を整理。機能追加・振る舞いの変更はテスト先行を必須とし、関数ごとの細かなサイクルは任意。画面操作の結合テストを中心にし、複雑な計算などは直接テストを追加する。振る舞いを変えない整理は変更前後のテスト成功で確認し、モックは必要な境界だけに使う。#13 で Chromium の375px・1280pxの起動確認と Docker／ホストの実行入口を導入し、main push の CI 成功も確認済み。#8・#9 は機能と操作 E2E を同じ PR で実装する。両 Issue では相互レビューに加えて独立した品質レビューも試す |
| 対応レポート | [Issue #7](issue-reports/issue-7.md)・[Issue #13](issue-reports/issue-13.md)に完了までの記録を保存。[Issue #8](issue-reports/issue-8.md)には採用理由・レビュー・マージ・後片付け・実機未確認の扱い・#18と#9への引き継ぎ・3本のスキルへの改善の反映を保存。finish-issueはふりかえりの共有と必要な改善の反映まで担当する。[保存方法](issue-reports/README.md)に従い、1 Issue につき1ファイルを残す |

区切り1の残る機能は#9で追う。盤面表示（#8）はmainに取り込み済み。#9に入る前に#18で既存の操作・表示の回帰テストを補強する。自動 E2E の土台は #13 で導入済み。#12 は型の整理を行う独立した改善で、ゲームのルールや画面の仕様を増やさない。サンプル4体の名前・装備・初期配置は spec.md 2.2で確定済み。Issue の登録完了と区切りの達成は別。残る機能の実装と自動テスト・エージェントによる幅375pxのブラウザ等での確認・人間によるレビュー時のスマホ実機での一連の操作確認が済んだら区切り1を達成とする。後の区切りは仕様のロードマップに置く。

未登録の下書きはなし。各 Issue の本文は GitHub で管理する。
