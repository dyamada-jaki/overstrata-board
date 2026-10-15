#!/bin/sh
# ホストに Node やブラウザを入れずに、Docker だけで E2E を実行する。
# この checkout から本番用イメージ（e2e-web）と E2E 用イメージ（e2e）をビルドし、
# e2e コンテナの中で npm run test:e2e を実行する。引数は Playwright にそのまま渡す。
# 終了時（成功・失敗・中断）に、この実行が作成した e2e・e2e-web のコンテナ（と、新しく作られたネットワーク）だけを片付ける。
# レポート閲覧用の e2e コンテナなど、実行前からあるコンテナには触れない。
set -eu
cd "$(dirname "$0")/.."

project=$(docker compose config | sed -n 's/^name: *//p' | head -n 1)
# この実行の e2e コンテナの名前（Compose が名前を付けない run の「<プロジェクト>-e2e-run-…」とは別の形にする）
runner="${project}-e2e-test-$$"
# e2e-web は depends_on で起動される Compose のサービスコンテナ（one-off ではないもの）
web_filter="--filter label=com.docker.compose.project=${project} --filter label=com.docker.compose.service=e2e-web --filter label=com.docker.compose.oneoff=False"

# e2e-web が実行前からあると、depends_on がそれを使い回してしまう。この checkout からビルドしたものを
# 確実に使うため、また他の実行のものを消さないため、使わず・消さずに止める
existing_web=$(docker ps --all --quiet $web_filter)
if [ -n "$existing_web" ]; then
  echo "このプロジェクト（${project}）の e2e-web コンテナが既にあります。別の実行中か、強制終了で残ったものです。" >&2
  echo "確かめてから消してください: docker ps -a $web_filter" >&2
  exit 1
fi

# このプロジェクトの既定ネットワークが実行前に無ければ、実行後に消す（元からあったものは残す）
network="${project}_default"
network_existed=0
docker network inspect "$network" >/dev/null 2>&1 && network_existed=1

cleanup() {
  # 中断時は run --rm の削除が終わる前に抜けることがあるので、名前で指定して消す
  docker rm --force "$runner" >/dev/null 2>&1 || true
  # 実行前に e2e-web が無いことを確かめたので、いまある e2e-web はこの実行が起動したもの
  docker ps --all --quiet $web_filter | xargs docker rm --force >/dev/null 2>&1 || true
  if [ "$network_existed" -eq 0 ]; then
    docker network rm "$network" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p e2e-results
docker compose --profile e2e build e2e-web e2e
docker compose --profile e2e run --rm --name "$runner" e2e npm run test:e2e -- "$@"
