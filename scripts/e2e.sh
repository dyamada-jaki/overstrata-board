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

cleanup() {
  result=$?
  trap - EXIT INT TERM
  compose logs --no-color > "$E2E_ARTIFACT_DIR/app.log" 2>&1 || true
  if ! compose down --volumes --rmi local > "$E2E_ARTIFACT_DIR/cleanup.log" 2>&1; then
    cat "$E2E_ARTIFACT_DIR/cleanup.log"
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
  compose run --rm --no-deps e2e npm run test:e2e -- "$@"
else
  E2E_BASE_URL="http://$(compose port app 80)"
  export E2E_BASE_URL
  node node_modules/@playwright/test/cli.js test "$@"
fi
