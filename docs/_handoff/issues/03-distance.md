## 目的
移動範囲を表示するための、距離と移動力の計算を作る。**画面は作らない。純粋関数とテストだけ**。

## やること
`src/domain/` に以下を作る。

- `gridDistance(a: Position, b: Position): number`
  - 斜めは交互に 1→2 と数える。式は `max(dx, dy) + floor(min(dx, dy) / 2)`
- `movementOf(armor: 'light' | 'medium' | 'heavy'): number`
  - 基本5 + 補正（light ±0 / medium −1 / heavy −2）
- `reachableCells(from: Position, movement: number, occupied: Position[], boardSize): Position[]`
  - `from` からの距離が `movement` 以下で、盤面内で、`occupied` に含まれないマスを返す
  - `from` 自身は含めない

## 受け入れ条件
- [ ] `gridDistance` が以下をすべて満たすテストがある
  | from | to | 距離 |
  |---|---|---|
  | (0,0) | (3,0) | 3 |
  | (0,0) | (1,1) | 1 |
  | (0,0) | (2,2) | 3 |
  | (0,0) | (3,3) | 4 |
  | (0,0) | (4,4) | 6 |
  | (0,0) | (4,2) | 5 |
  | (4,2) | (0,0) | 5 |
- [ ] `movementOf` の3パターン（5 / 4 / 3）のテストがある
- [ ] `reachableCells` について、盤面の端・他キャラのいるマス・自分のマスが除外されるテストがある

## スコープ外
- 画面表示（#4）
- 他キャラを「すり抜けられるか」の判定（今は考えない。止まれないマスを除くだけ）
- 地形・障害物

## 依存
- #1 が完了していること（#2 とは**並行して進められる**）
