## 目的
開発の土台を作る。以降のIssueはすべてこの上に積む。

## やること
- Vite + React + TypeScript（strict）でプロジェクトを作成する
- Vitest と React Testing Library を導入する
- ESLint を導入する
- `package.json` に `dev` / `build` / `test` / `typecheck` / `lint` のスクリプトを用意する
- `src/domain/` `src/components/` `src/data/` のフォルダを作る
- GitHub Actions で、PR と main への push 時に `test` / `typecheck` / `lint` を実行する
- README に起動方法を書く

## 受け入れ条件
- [ ] `npm run dev` で画面に「Overstrata 戦闘ボード」と表示される
- [ ] `npm run test` / `npm run typecheck` / `npm run lint` / `npm run build` がすべて成功する
- [ ] `src/domain/` にサンプルの純粋関数とテストが1つある（動作確認用。後で消してよい）
- [ ] PRを作るとGitHub Actionsが走り、成功する

## スコープ外
- 盤面やキャラの表示（別Issue）
- デプロイ設定
- CSSフレームワークの導入（素のCSSで進める）

## メモ
- ルールは CLAUDE.md を参照
