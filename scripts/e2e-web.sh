#!/bin/sh
# ホストモードの E2E 用に、この checkout から本番用イメージをビルドして 127.0.0.1:E2E_HOST_PORT で配信する。
# playwright.config.ts の webServer から起動され、テスト後に SIGTERM で止められる。
# 止められたとき（成功・失敗・中断）は、このスクリプトが起動したコンテナだけを削除する。
set -eu
cd "$(dirname "$0")/.."
: "${E2E_HOST_PORT:?E2E_HOST_PORT が必要です}"

# Compose のプロジェクト名（.env の COMPOSE_PROJECT_NAME、無ければディレクトリ名）からコンテナ名を決める
project=$(docker compose config | sed -n 's/^name: *//p' | head -n 1)
name="${project}-e2e-web-host"
# このプロジェクトの既定ネットワークが実行前に無ければ、実行後に消す（元からあったものは残す）
network="${project}_default"
network_existed=0
docker network inspect "$network" >/dev/null 2>&1 && network_existed=1

remove_container() {
  docker rm --force "$name" >/dev/null 2>&1 || true
}
cleanup() {
  remove_container
  if [ "$network_existed" -eq 0 ]; then
    docker network rm "$network" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

docker compose --profile e2e build e2e-web
# 前回の実行が強制終了されて残ったコンテナがあれば消す（同じプロジェクトの同じ名前のものだけ）
remove_container
docker compose --profile e2e run --detach --rm --no-deps --name "$name" \
  -p "127.0.0.1:${E2E_HOST_PORT}:80" e2e-web >/dev/null
# ログを流しながら待つ。バックグラウンドで待つことで、シグナルを受けたらすぐ trap が動く
docker logs --follow "$name" &
wait $!
