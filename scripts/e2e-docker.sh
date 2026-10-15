#!/bin/sh
# ホストに Node やブラウザを入れずに、Docker だけで E2E を実行する。
# この checkout から本番用イメージ（e2e-web）と E2E 用イメージ（e2e）をビルドし、
# e2e コンテナの中で npm run test:e2e を実行する。引数は Playwright にそのまま渡す。
# 終了時（成功・失敗・中断）に、このスクリプトが起動した e2e・e2e-web のコンテナ（と、新しく作られたネットワーク）だけを片付ける。
set -eu
cd "$(dirname "$0")/.."

# このプロジェクトの既定ネットワークが実行前に無ければ、実行後に消す（元からあったものは残す）
project=$(docker compose config | sed -n 's/^name: *//p' | head -n 1)
network="${project}_default"
network_existed=0
docker network inspect "$network" >/dev/null 2>&1 && network_existed=1

cleanup() {
  # 中断時は run --rm の削除が終わる前に抜けることがあるので、このプロジェクトの e2e の一時コンテナも消す
  docker ps --all --quiet \
    --filter "label=com.docker.compose.project=${project}" \
    --filter "label=com.docker.compose.service=e2e" \
    --filter "label=com.docker.compose.oneoff=True" | xargs docker rm --force >/dev/null 2>&1 || true
  docker compose --profile e2e rm --stop --force e2e-web >/dev/null 2>&1 || true
  if [ "$network_existed" -eq 0 ]; then
    docker network rm "$network" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p e2e-results
docker compose --profile e2e build e2e-web e2e
docker compose --profile e2e run --rm e2e npm run test:e2e -- "$@"
