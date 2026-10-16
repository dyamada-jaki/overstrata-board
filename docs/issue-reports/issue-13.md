# Issue #13: Playwright の E2E 実行環境と CI を整える

## 概要

- Issue: [#13](https://github.com/dyamada-jaki/overstrata-board/issues/13)
- 実施日: 2026-10-15〜16（時刻は JST）
- 状態: **完了。PR #14 を採用して squash merge、Issue #13 と PR #15 をクローズ。後片付け済み**
- 比較完了時の照合: 2026-10-15 23:48 JST。両 PR の head と作業場所の HEAD が下記の更新後 SHA に一致し、両作業場所に未コミット変更なし。比較時点では両 PR とも OPEN
- 採用結果: 2026-10-16 13:13:15 JST、[PR #14](https://github.com/dyamada-jaki/overstrata-board/pull/14) を [8aba056](https://github.com/dyamada-jaki/overstrata-board/commit/8aba0566b5e375394a851b8e19d4bddebf7be0e1) として main に取り込んだ。main push の [CI](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38849495967) は全3 job 成功
- 比較対象: [PR #14（Codex）](https://github.com/dyamada-jaki/overstrata-board/pull/14)、[PR #15（Claude Code）](https://github.com/dyamada-jaki/overstrata-board/pull/15)
- 仕様・方針: [spec.md](../spec.md)、[testing.md](../testing.md)、[dual-implement](../../.agents/skills/dual-implement/SKILL.md)、[finish-issue](../../.agents/skills/finish-issue/SKILL.md)
- 開始時の main: `f0b2c802540e37af1b00dc8c6e70f48ebd32d023`

## 目的と範囲

現在の起動画面を実際の Chromium で確認できるようにし、Docker とホストの実行入口、CI、失敗時の調査材料を整える。375px と PC 幅で見出し「Overstrata 戦闘ボード」が表示され、未処理の JavaScript 例外がないことを確認する。アプリや応答をモックに置き換えない。

#1・#4 の完了を確認して着手した。盤面・キャラ・ゲームルールの変更は対象外。#13 を取り込んでから #8 → #9 の順で進み、それぞれの操作 E2E は各機能の PR に追加する。この Issue ではスマホ実機の使い勝手確認を必須にしない。

## 計画と人間の判断

2026-10-15 22:22:32 に Orca の Run を作り、main から別々の worktree に Claude Code と Codex を起動した。コーディネーターは実装コードを編集せず、計画の比較・承認伝達・レビューの確認・本レポートを担当した。

| 観点 | Claude Code の計画 | Codex の計画 |
|---|---|---|
| Playwright | 1.63.0 に完全固定 | 1.64.1 に完全固定 |
| アプリ配信 | 自分の checkout から既存の prod イメージをビルドし nginx で配信 | 同左 |
| ブラウザ実行 | Node 24 / Debian 12、既存 Dockerfile に e2e ターゲット | Node 24 / Debian 12、専用 Dockerfile |
| Compose | 既存ファイルの e2e profile | 専用 compose.e2e.yaml |
| 分離 | worktree ごとの project・ホストポート・結果出力 | 実行ごとの project・動的ポート・結果出力 |
| 画面幅 | 375×667 / 1280×800 | 375×667 / 1280×720 |
| 結果 | HTML・trace・画像・動画 | HTML・trace・画像・アプリ等のログ |

両計画とも、Vitest と Playwright の収集分離、追加 TS の型チェック・Lint、Docker-only とホスト経路、CI の成功・意図的失敗・復元、README/testing/両ガイドの更新を対象にした。

計画段階で Codex 案には、ホスト側の入口が専用スクリプトとなり、Issue の `npm run test:e2e` を直接使う流れと一致していない点を指摘した。起動・待機・検証・後片付けまで npm コマンドを入口にする修正条件を付けた。これは実装後の不具合とは別の計画上の修正として記録する。

人間から **「提案の通りでOK」** と承認を受け、22:45:30〜31 に双方へ伝達した。PC 幅1280px、CI は Docker、意図的な失敗コミットを PR に push してから復元する方針も承認した。固定版と PC 高さの違いは残して比較することとした。

Codex 実装ワーカーのモデルは、Orca の実行情報で **`gpt-6-astra`** と確認した。モデル・推論強度はコーディネーターが上書きせず、設定済みの既定値を継承した。Claude Code のモデル名は同じ実行情報では取得できず、推測で補わない。この1回の結果からモデル全般の優劣は判断しない。

独立した品質レビューは今回追加していない。[testing.md](../testing.md) の試行対象である #8・#9 に従い、今回は両者による相互レビューを実施した。

## 初回実装と検証

| 項目 | PR #14（Codex） | PR #15（Claude Code） |
|---|---|---|
| 初回レビュー対象 SHA | `5777ec0ed73c192d34dd0ab148798622e08b946f` | `f7f256f930fff67a4a2c30df8ab1d7ef1461784a` |
| 実装完了通知 | 22:59:26 | 23:03:52 |
| ホスト | macOS arm64 / Node v24.14.0 | 同左 |
| Docker | OrbStack / Docker Engine 29.4.0、Node v24.22.0 / Debian 12 | 同左 |
| Chromium | 156.0.8078.4 | 153.0.8010.12 |
| 既存チェック | 42テスト・型チェック・Lint・ビルド成功 | 同左 |
| ホスト / Docker E2E | 各2件成功 | 各2件成功 |
| 初回最終 CI | [38746810834](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38746810834)、全3 job 成功 | [38747364047](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38747364047)、全3 job 成功 |
| 意図的失敗の CI | [38746446737](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38746446737) | [38747054147](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38747054147) |

実装者は両経路・本番イメージ・クリーンなソースからの Docker 実行を確認し、見出しの期待値を一時変更した失敗検証と、その復元を PR に残した。両方とも E2E のみが失敗する CI と成果物の取得を確認し、復元後は全 job が成功した。失敗検証のコミットは証拠として PR 履歴に残っている。

Codex 側では実装中の Docker 接続失敗を trace から調査し、接続先名を `app` から `app.test` に変更した。これは実装者が検証中に発見・修正した事象であり、計画指摘や相互レビューの必須指摘とは分ける。

### 相互レビューによる再確認

- [Claude Code → PR #14](https://github.com/dyamada-jaki/overstrata-board/pull/14#issuecomment-6194159165): 23:05:48〜23:12:45。4チェック、ホスト E2E、クリーンなソースからの Docker E2E を再実行。CI の成功・失敗と artifact の存在を確認。CI artifact の中身と目視スクリーンショットは実装者の証拠を参照し、自身では再確認していないと明記した。
- [Codex → PR #15](https://github.com/dyamada-jaki/overstrata-board/pull/15#issuecomment-6194116450): 23:05:51〜23:10:59。4チェックとホスト・Docker E2E を再実行。CI 失敗時の artifact を取得・展開し、trace と意図的な見出し不一致を確認。クリーン clone、初回準備、中断確認の一部は実装者の証拠を参照した。

両者とも PR 本文だけでなく、変更コード・設定・テストと既存 Docker/Compose/CI/アプリ側の関連箇所を読んだ。開始・終了時の PR head と作業場所の HEAD を照合し、未コミット変更なしを確認した。

画面確認について、Codex 実装者は Orca のブラウザで 375px / 1280px の見出しと横スクロールなしを確認した。両相互レビューは実際の Chromium による E2E を再実行したが、別途の目視操作レビューは実施していない。画面の仕様変更がない本 Issue の最小確認として扱い、スマホ実機確認を済ませたことにはしない。

### 受け入れ条件（初回レビュー時点）

| # | 条件 | PR #14 | PR #15 |
|---|---|---|---|
| 1 | npm コマンド・lockfile・収集分離・型/Lint | ○ | ○ |
| 2 | 実アプリ・Chromium・両幅・見出し・例外・モックなし | ○ | ○ |
| 3 | クリーン checkout の Docker-only とホスト経路 | ○ | ○ |
| 4 | 自分の checkout・分離・待機・自分の資源だけ片付け | **× 中断時の残存** | **× 別途起動した閲覧コンテナの削除** |
| 5 | CI・失敗伝播・既存チェック・本番イメージ | ○ PR で確認、main push はマージ後 | 同左 |
| 6 | 失敗時の調査材料・Git 除外・失敗と復元の証拠 | ○ | ○ |
| 7 | README/testing/両ガイド | ○ 片付けの説明は指摘対象 | 同左 |
| 8 | PR の理由・環境・SHA・結果・実機との区別 | ○ | ○ |

コーディネーターも GitHub の各 job の成功、PR head と worktree HEAD の一致、対象コードを確認した。テストの全件をコーディネーターが重複実行したわけではない。CI が成功していても、条件4の問題は残っていた。

## 指摘の確認と修正

### PR #14: 中断時にネットワークと runner イメージが残る

- 重さ: **必須**。コーディネーターの判定: **確認できた**。
- 対象: [初回 scripts/e2e.sh](https://github.com/dyamada-jaki/overstrata-board/blob/5777ec0ed73c192d34dd0ab148798622e08b946f/scripts/e2e.sh#L28)。
- レビュー担当は Docker の one-off runner 起動直後にプロセスグループへ SIGINT を送り、4回中1回、network と runner image が残ることを再現した。cleanup.log に `Resource is still in use` が残り、runner は少し後に自動削除された。
- コードは runner の削除完了を待たず `compose down` を実行し、その終了コードだけを見ていた。レビューの証拠と削除順序・残存検査の欠如を照合した。コーディネーターは同じ再現を重複実行していない。
- 指摘の「失敗として報告されない」は限定して扱う。中断の終了コード130は既に非ゼロだった。問題は**片付けが未完了であることの検知と復旧案内**である。
- 端末でキーを押す実験ではなく、TTY なしのプロセスグループへの SIGINT による再現だったことも区別する。

### PR #15: 別途起動したレポート閲覧コンテナを削除する

- 重さ: **必須**。コーディネーターの判定: **確認できた**。
- 対象: [初回 scripts/e2e-docker.sh](https://github.com/dyamada-jaki/overstrata-board/blob/f7f256f930fff67a4a2c30df8ab1d7ef1461784a/scripts/e2e-docker.sh#L17)。
- README の閲覧コマンドで先にコンテナを起動し、HTTP 200 / Running=true を確認。その後の E2E は成功したが、閲覧コンテナが `no such object` となり接続できなくなることをレビュー担当が再現した。
- cleanup は project・service=e2e・oneoff=True のラベルで一括削除しており、閲覧用にも同じラベルが付く。コードと README の起動方法が再現結果に一致し、条件4の「自分が起動した資源だけ」に反すると確認した。

両方を元の実装担当へ修正依頼した。対象は承認済みの後片付けの保証であり、新しい機能・仕様は追加していない。

### 修正後の実装と確認

| 項目 | PR #14（Codex） | PR #15（Claude Code） |
|---|---|---|
| 更新後 SHA | `1880b7d3b2cff2df8d32b4ffd098e0a6bb85f2f6` | `2702902c2c0d7c9e53a48eb4421d639a084e92e6` |
| 修正完了通知 | 23:32:53 | 23:26:16 |
| 変更 | 実行固有の runner 名、起動要求の完了待ち、同期削除、既知の資源の残存検査と復旧案内。回帰テスト6件を追加 | runner の一括削除を実行固有名へ変更。既存の配信コンテナは削除・再利用せず拒否。ホスト側は起動成功をフラグで管理 |
| 最新 CI | [38751628845](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38751628845)、全3 job 成功 | [38750867439](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38750867439)、全3 job 成功 |
| 実装担当の確認 | 修正前6回中1回の残存を再現。修正後 Docker SIGINT 12回・ホスト中断2回、両経路の成功・意図的失敗・復元、他の資源の維持、42件＋回帰6件、型/Lint/build、クリーンな展開、prod build を確認 | 修正前の閲覧削除を再現。名前付き/名前なしの閲覧を開き、両経路の成功・失敗・中断で閲覧維持を確認。既存配信コンテナの拒否、42件・型/Lint/build・prod build を確認 |

PR #14 の回帰テストは `scripts/e2e-cleanup.test.mjs`。Docker CLI という外部境界だけを fake に置き換え、作成応答の遅延、削除失敗、問い合わせ失敗、成功扱いでも資源が残る場合を再現する。終了コード・資源の最終状態・復旧案内を検証し、`npm run test` と CI に含めた。実アプリ・HTTP 応答・domain のモックは追加しておらず、実際の Docker と Chromium の確認と併用している。

### PR #14 の再レビュー: 必須指摘は解消

[Claude Code による再確認](https://github.com/dyamada-jaki/overstrata-board/pull/14#issuecomment-6194851279)は `1880b7d` を対象に実施し、23:45:24 に完了した。必須指摘の残りはない。

- 自分で42件＋回帰6件、型チェック・Lint・ビルド、ホスト/Docker の E2E 各2件を再実行し成功。
- 旧不具合の条件で起動直後の SIGINT を7回、ログ追従中に2回、アプリ作成時に1回、ホストのテスト開始後に2回確認。すべて130で終了し、各実行の container/network/image は残らなかった。
- 一致しない grep による失敗は両経路で1となり、残存なし。確認前後の既存資源にも差分なし。
- 最新 CI の3 job 成功と、CI 内の42件＋6件・E2E 2件成功を確認。

コーディネーターも、固有名での runner 削除、削除完了の検査、`down` 後の残存検査、問い合わせ失敗時の非ゼロ終了と復旧案内をコードで照合した。初回の削除順序の問題と未検知が解消していることを、レビューの実行結果と合わせて確認した。

**推奨Aは残る**。起動用 subshell の `trap '' INT TERM` で起動要求が保護されるというコメントと fake の前提は、実際の Docker での観測と一致しない。レビューでは compose が SIGINT で `context canceled` / 130 となる一方、daemon 側で作られた runner は cleanup により削除され、残存しなかった。また、worktree 外のコピーで当該 trap だけを取り除いても回帰6件は通った。現行の削除順序と残存検知が後片付けを担っており、必須条件を妨げる再現はないため、記述と fake の異常ケースの改善を**推奨・確認できた**として残す。コーディネーターは挙動の観測とコードを照合したが、Docker 内部のシグナル実装そのものを別途調査したわけではない。

### PR #15 の再レビュー: 旧指摘は解消、起動途中の中断に新しい必須指摘

[Codex による再確認](https://github.com/dyamada-jaki/overstrata-board/pull/15#issuecomment-6194618850)は `2702902` を対象に実施し、23:34:26 に完了した。4チェック・ホスト/Docker E2E・最新 CI は成功。閲覧を起動したまま、成功・一致しない grep による失敗・テスト実行中の SIGINT を両経路で確認し、旧指摘の巻き添え削除が解消したことを確認した。

一方、コーディネーターが差分から、`started=1` が `compose run --detach` の正常復帰後にしか設定されない点を確認候補として伝えた。再レビュー担当が次を実際に再現した。

- 通常の `npm run test:e2e` を起動し、配信コンテナの Docker create イベント直後にプロセスグループへ SIGINT を送る。
- npm は130で終了するが、作成済みの `e2e-web-host` が **created / Running=false** のまま残る。
- 次の `npm run test:e2e` は、既存コンテナがあるとして1で終了する。手動削除が必要になる。

対象は [更新後 scripts/e2e-web.sh の23〜27・38〜40行](https://github.com/dyamada-jaki/overstrata-board/blob/2702902c2c0d7c9e53a48eb4421d639a084e92e6/scripts/e2e-web.sh#L23)。`started=0` のまま cleanup が走るため、自分が作成したコンテナを削除しない。コーディネーターはコード上の条件と担当の通常 npm 経由の再現を照合し、**必須・確認できた**と判定した。

この再現は1つの worktree で1回実行するだけで起き、SIGKILL や同時実行を必要としない。PR に明記された同一 worktree での同時開始競合とは区別する。旧指摘は解消済みだが、条件4はこの新しい不具合により未達のままである。PR #15 を採る場合は、起動途中でも自身の資源を特定・回収できる修正と、新 SHA での再確認が必要。

### 必須としなかった指摘

- PR #14 のネイティブ Linux での成果物の root 所有: **推奨・未確認**。macOS/OrbStack では再現しておらず、コーディネーターも判断できない。今回の必須修正に格上げせず、後続改善の候補に残す。
- PR #14 の tsconfig の配列整形: **好み**。具体的な機能・保守上の問題は示されておらず、採用を妨げる理由にしない。DOM 型の追加は E2E の型チェック対象拡大に伴う設定として扱い、これだけで不具合とはしない。

## 採用判断・完了処理

**PR #14（Codex、`1880b7d`）を推奨し、人間が採用を決定した。** 初回の必須指摘が解消され、最新 SHA の相互レビューで残る必須指摘がなく、CI と両実行経路も成功している。実行ごとに project・ポート・出力を自動で分ける構成は、このプロジェクトの複数 worktree 運用に適しており、過去の実行結果も上書きしない。

PR #15（Claude Code、`2702902`）は、起動中中断でコンテナが残り、次の実行を止める必須指摘が1件残るため、現時点での採用を推奨しない。この PR を採るなら、前述の修正と最新 SHA の再確認を先に行う必要がある。

### 受け入れ条件の最終比較

| # | 条件 | PR #14 / 1880b7d | PR #15 / 2702902 |
|---|---|---|---|
| 1 | 実行コマンド・lockfile・収集分離・型/Lint | ○。追加した回帰6件も npm test / CI 対象 | ○ |
| 2 | 実アプリ・Chromium・両幅・見出し・例外・モックなし | ○ | ○ |
| 3 | Docker-only とホスト経路・クリーンなソース | ○。最新 SHA のクリーン展開は実装者が確認 | ○。クリーン環境は初回検証と CI、両経路は最新 SHA で再確認 |
| 4 | 自分の checkout・分離・待機・自分の資源だけ片付け | **○。必須指摘解消** | **×。起動中中断の必須指摘が残る** |
| 5 | CI・失敗伝播・既存チェック・本番イメージ | ○。最新 PR CI 全3 job 成功 | ○。最新 PR CI 全3 job 成功 |
| 6 | 調査材料・Git 除外・意図的失敗と復元の証拠 | ○。旧 CI の失敗証拠と修正後ローカルの失敗確認を区別 | 同左 |
| 7 | README/testing/両ガイド | ○。推奨Aの記述改善は残る | ○。中断保証の不一致は条件4に計上 |
| 8 | PR の理由・環境・SHA・結果・実機との区別 | ○ | ○ |

比較時は main push のトリガーを両方とも設定で確認した。採用した PR #14 は、マージ後に実際の main push の CI も成功した（下記）。画面は375px・PC幅の実 Chromium による E2E で確認済み。スマホ実機、実端末でキーを押す Ctrl+C、ネイティブ Linux は未確認であり、確認済みに含めない。

ゲーム仕様の穴や、spec.md の変更が必要な事項は見つかっていない。残ったものは E2E 実行基盤の実装と検証方法に関する事項である。

2026-10-16、人間が `finish-issue スキルで PR 14` を指示し、PR #14 の採用を決定した。採らない理由は「PR #15 は起動途中の中断でコンテナが残る必須指摘が未解消」である。

### 完了処理の事前確認（2026-10-16）

- PR #14 は OPEN / MERGEABLE / CLEAN。head は再レビュー済みの `1880b7d3b2cff2df8d32b4ffd098e0a6bb85f2f6` のままで、最新 CI の全3 job が成功。必須指摘の解消と最新 SHA の再確認コメントを照合した。
- Issue #13 は OPEN。人間のスマホ実機レビューは、この Issue の本文で必須対象外と明記されている。
- 両 worktree の HEAD は記録と一致し、`git status --short` と `git log origin/<branch>..HEAD` は空。未保存・未 push の作業はない。main にある本レポートと一覧の未コミット変更は、コーディネーターが作った記録として保持する。
- 両 worktree のターミナルは0件。Run のワーカー8件は解放済みで、reclaimable は0件。
- 対象の container・volume・network は0件。残る専用イメージ3タグは、後述の ID と Compose project/service ラベルを照合した。
- 削除前に、両 worktree の E2E 記録、PR 本文とレビュー、Run の記録を `/Users/jaki/orca/archives/overstrata-board/issue-13/20261016-finish/` に保管した。Codex 側は704ファイル、Claude Code 側は2ファイルをそれぞれ tar.gz に収め、一覧と SHA-256 を `manifest.json` に残した。Claude Code の意図的失敗 CI の `e2e-results` artifact も別途取得し、34ファイルと trace ZIP 2件の整合性を確認した。全 artifact の一括取得は Docker build 用 artifact の展開で失敗したため、E2E artifact を名前で指定して取得し直した。

### マージと後片付けの結果（2026-10-16）

人間の「実行して」を受け、確認一覧どおりに実行した。マージ直前に PR head が `1880b7d` のままで CI が全成功であることを再確認し、`--match-head-commit` を付けて squash merge した。

| 対象 | 結果 |
|---|---|
| PR #14 | 13:13:15 に MERGED。main のコミットは `8aba0566b5e375394a851b8e19d4bddebf7be0e1` |
| Issue #13 | 13:13:17 に CLOSED。PR 本文の `Closes #13` により閉じた |
| PR #15 | 13:13:52 に CLOSED。[不採用理由のコメント](https://github.com/dyamada-jaki/overstrata-board/pull/15#issuecomment-6207923290)を残し、リモートブランチは保持 |
| main push の CI | [run 38849495967](https://github.com/dyamada-jaki/overstrata-board/actions/runs/38849495967)。上記 merge commit で既存4チェック・Chromium E2E・本番イメージの全3 job が成功 |
| worktree・ローカルブランチ | `issue-13-codex` と `issue-13-claude` を Orca から削除。対応する `dyamada-jaki/issue-13-codex`・`dyamada-jaki/issue-13-claude` のローカルブランチも削除された。Git と Orca の両方で main だけが残ることを確認 |
| リモートブランチ | 採用側 `dyamada-jaki/issue-13-codex` は削除。不採用側 `dyamada-jaki/issue-13-claude` は `2702902` のまま保持 |
| Docker | 両 project で `compose down -v --remove-orphans` を実行（残存資源なし）。専用イメージ3タグを ID・ラベル・利用中コンテナなしを照合して削除。13:15 の再確認で対象 container・volume・network・image は0件 |
| ワーカー端末 | 8件とも前段で解放済み。追加で閉じる端末はなく、人間の端末は操作していない |
| 保持したもの | main、検証記録のアーカイブ、不採用側リモートブランチ、共有ベースイメージ・ビルドキャッシュ・ホストのブラウザキャッシュ |

main は fast-forward で更新した。記録更新は `docs/next-issues.md`・本レポート・一覧の3ファイルで、main 上の `docs: record #13 completion` コミットにまとめた。実装コードの追加変更や、同じローカルテストの再実行は行わず、レビュー済み SHA と squash merge 後の tree の一致、新たな main push の CI で取り込み結果を確認した。

未完了のマージ・クローズ・後片付けはない。下記の改善候補2件は未実装・Issue 未登録であり、この完了処理では着手していない。ふりかえり（workflow の⑧）も実施していない。

## 実行資源と記録

Run: `run_4fc9df2a4dfd`。実装用の worktree を相互レビューと修正にも使用し、編集担当とレビュー担当が同時に使わないよう段階を分けた。

| 用途（削除済み） | 作業時のパス / ブランチ |
|---|---|
| PR #14 | `/Users/jaki/orca/workspaces/overstrata-board/issue-13-codex` / `dyamada-jaki/issue-13-codex` |
| PR #15 | `/Users/jaki/orca/workspaces/overstrata-board/issue-13-claude` / `dyamada-jaki/issue-13-claude` |

| 担当 | Dispatch | 状態 |
|---|---|---|
| Claude Code 初回実装 | `ctx_d08494008a18` | 完了・解放済み |
| Codex 初回実装 | `ctx_7caf46a2015d` | 完了・解放済み |
| Claude Code → PR #14 初回レビュー | `ctx_be8f44ff95f9` | 完了・解放済み |
| Codex → PR #15 初回レビュー | `ctx_bad6b280f877` | 完了・解放済み |
| Claude Code / PR #15 修正 | `ctx_c5e54c891030` | 完了・解放済み |
| Codex / PR #14 修正 | `ctx_0b57e83625fe` | 完了・解放済み |
| Codex → PR #15 再レビュー | `ctx_3964ac21e01e` | 完了・解放済み。必須1件が残る |
| Claude Code → PR #14 再レビュー | `ctx_f1bc8423dae0` | 完了・解放済み。必須の残りなし |

独立した品質レビューや専用 worktree は作っていない。品質レビューによる追加待ち時間は対象外。初回実装・レビューの時間には調査・環境準備・CI 待ちが含まれるため、モデルの純粋な速度比較には使わない。

2026-10-15 23:48 JST の Docker 照合では、本作業の名前に該当するコンテナ・ネットワークは残っていなかった。次のイメージタグは比較終了時には保持し、翌16日の finish-issue で ID と所有範囲を照合して削除した。共有のベースイメージやビルドキャッシュ、ホストのブラウザキャッシュは削除していない。

| 削除したイメージタグ | ID |
|---|---|
| `issue-13-claude-e2e:latest` | `ed79b4bf9995` |
| `issue-13-claude-app:latest` | `5454c2731372` |
| `issue-13-claude-e2e-web:latest` | `099ce5dca8a8` |

worktree 内の実行ログ・レポート・スクリーンショットは、削除前に上記アーカイブへ保管した。Codex 側には CI の成功・意図的失敗の取得済み artifact も含まれ、Claude Code の失敗 artifact は完了処理で追加取得した。GitHub 上の CI artifact の保持は14日である。CI・レビューへのリンクと重要な確認結果は本ファイルに残し、バイナリの検証記録は Git に含めていない。

## 学びと次の作業

- 計画での受け入れ条件との不一致、実装者自身が検証で見つけた問題、相互レビューで見つけた不具合を分けて記録した。
- 最小の画面 E2E だけでは、起動済みの別用途コンテナへの影響や中断時の競合を検出できなかった。相互レビューでは実装と周辺の起動・片付けの流れを読み、具体的な条件を再現した。
- 細かな TDD を必須にしない方針でも、不具合の修正では修正前の再現と修正後の確認を残す。
- 外部境界の fake は、実物では安定して起こせない異常条件の確認に使える。ただし、今回のシグナルのように実物との差もあり得る。fake の結果と実物で確認した結果を分け、前提の不一致は改善候補として残す。
- 改善候補は2件。PR #14 の推奨A（起動処理の説明と、compose が中断してから daemon 側で作成が終わるケースの fake）を実態に合わせること、ネイティブ Linux の成果物所有権と削除方法を実機で確認すること。どちらも **提案のみ・Issue 未登録**。戻す先は、E2E 基盤を対象とする後続 Issue（前者は scripts・README、後者は調査結果に応じて compose・Dockerfile・README）。tsconfig の整形は好みとして除外する。
- 仕様の発見として spec.md へ戻す事項はない。レビューで実物と fake の前提を照合する観点は、設計の席で testing.md・スキルへの追記を検討できるが、今回は変更していない。
- #13 は完了。次は #8 の盤面表示と操作 E2E、続いて #9 のキャラ操作に進む。区切り1全体はまだ未達。
