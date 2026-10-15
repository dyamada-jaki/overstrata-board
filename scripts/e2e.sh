#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

# runner 内では Docker を起動せず、インストール済みの Playwright だけを実行する。
if [ "${E2E_IN_CONTAINER:-0}" = 1 ]; then
  exec node node_modules/@playwright/test/cli.js test "$@"
fi

mode=host
if [ "${1:-}" = --docker ]; then
  mode=docker
  shift
fi

mkdir -p e2e-artifacts
E2E_ARTIFACT_DIR=$(mktemp -d "$(pwd)/e2e-artifacts/run-XXXXXXXX")
export E2E_ARTIFACT_DIR
project=$(basename "$E2E_ARTIFACT_DIR" | tr '[:upper:]' '[:lower:]')
project="overstrata-e2e-$project"
printf '%s\n' "$project" > "$E2E_ARTIFACT_DIR/project.txt"
printf 'E2E artifacts: %s\n' "$E2E_ARTIFACT_DIR"

compose() {
  docker compose -p "$project" -f compose.e2e.yaml "$@"
}

runner="$project-runner"
runner_start_pid=

# inspect の失敗だけでは「存在しない」と daemon 障害を区別できない。
# 既知の名前だけを問い合わせ、問い合わせ失敗も cleanup の失敗にする。
check_absent() {
  kind=$1
  name=$2
  case "$kind" in
    container) remaining=$(docker container ls -aq --filter "name=^/$name$") ;;
    network) remaining=$(docker network ls -q --filter "name=^$name$") ;;
    image) remaining=$(docker image ls -q "$name") ;;
  esac || return 1
  if [ -n "$remaining" ]; then
    printf '残存資源: %s %s (%s)\n' "$kind" "$name" "$remaining"
    return 1
  fi
}

cleanup() {
  result=$?
  trap - EXIT
  # 二度目の Ctrl+C で後片付けまで中断しない。
  trap '' INT TERM
  cleanup_failed=0
  # runner 作成 API の途中で中断されても、作成完了より先に削除しない。
  if [ -n "$runner_start_pid" ]; then
    wait "$runner_start_pid" || true
  fi
  compose logs --no-color > "$E2E_ARTIFACT_DIR/app.log" 2>&1 || true
  {
    if [ "$mode" = docker ]; then
      # --rm の非同期削除に任せず、固定名の runner を同期的に停止・削除する。
      docker rm -f "$runner" || true
      check_absent container "$runner" || cleanup_failed=1
    fi
    if [ "$cleanup_failed" = 0 ]; then
      compose down --volumes --rmi local || cleanup_failed=1
    fi
    # down が0を返しても、資源が残っていれば成功扱いにしない。
    check_absent container "$project-app-1" || cleanup_failed=1
    check_absent network "${project}_default" || cleanup_failed=1
    check_absent image "$project-app:latest" || cleanup_failed=1
    if [ "$mode" = docker ]; then
      check_absent image "$project-e2e:latest" || cleanup_failed=1
    fi
  } > "$E2E_ARTIFACT_DIR/cleanup.log" 2>&1
  if [ "$cleanup_failed" != 0 ]; then
    cat "$E2E_ARTIFACT_DIR/cleanup.log"
    printf '後片付けを確認できませんでした。Docker の稼働を確認し、次を実行してください:\n'
    printf 'export E2E_ARTIFACT_DIR="%s"\n' "$E2E_ARTIFACT_DIR"
    printf 'docker rm -f "%s" # 存在しない場合は続行\n' "$runner"
    printf 'docker compose -p "%s" -f compose.e2e.yaml down --volumes --rmi local\n' "$project"
    result=1
  fi
  printf 'E2E artifacts: %s (exit %s)\n' "$E2E_ARTIFACT_DIR" "$result"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# 毎回この checkout のイメージを作り、新しい project で開始する。
# 別の worktree や、起動済みの開発サーバーへ接続しない。
if [ "$mode" = docker ]; then
  compose build app e2e > "$E2E_ARTIFACT_DIR/build.log" 2>&1 || {
    cat "$E2E_ARTIFACT_DIR/build.log"
    exit 1
  }
else
  compose build app > "$E2E_ARTIFACT_DIR/build.log" 2>&1 || {
    cat "$E2E_ARTIFACT_DIR/build.log"
    exit 1
  }
fi
compose up -d --wait --wait-timeout 60 app

if [ "$mode" = docker ]; then
  # 起動要求はシグナルから保護し、cleanup が必ず完了を待てるようにする。
  (
    trap '' INT TERM
    compose run -d --name "$runner" --no-deps e2e npm run test:e2e -- "$@"
  ) > "$E2E_ARTIFACT_DIR/runner-id.txt" &
  runner_start_pid=$!
  wait "$runner_start_pid"
  runner_start_pid=
  docker logs --follow "$runner"
  runner_result=$(docker wait "$runner")
  exit "$runner_result"
else
  E2E_BASE_URL="http://$(compose port app 80)"
  export E2E_BASE_URL
  node node_modules/@playwright/test/cli.js test "$@"
fi
