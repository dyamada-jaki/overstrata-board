# syntax=docker/dockerfile:1

# ---- 依存パッケージ ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund \
 && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.package-lock.sha

# ---- 開発: docker compose up で使う ----
FROM deps AS dev
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
EXPOSE 5173
ENTRYPOINT ["dev-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---- ビルド ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- 本番: ビルド済みファイルを nginx で配信する ----
FROM nginx:1.29-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# ---- E2E: Playwright（Chromium）でテストを実行する ----
# Alpine は Playwright の対応 OS ではないので、Debian 系の Node 24 を使う。
# ブラウザの版は package-lock.json の @playwright/test の版から決まる
FROM node:24-bookworm-slim AS e2e
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund \
 && npx playwright install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/*
COPY . .
CMD ["npm", "run", "test:e2e"]
