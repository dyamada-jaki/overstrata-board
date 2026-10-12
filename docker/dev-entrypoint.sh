#!/bin/sh
# package-lock.json が変わっていたら、コンテナ側の node_modules を入れ直す
set -e
hash_file=node_modules/.package-lock.sha
current=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ ! -f "$hash_file" ] || [ "$(cat "$hash_file")" != "$current" ]; then
  echo "package-lock.json の変更を検出したので npm ci を実行します"
  npm ci --no-audit --no-fund
  echo "$current" > "$hash_file"
fi
exec "$@"
