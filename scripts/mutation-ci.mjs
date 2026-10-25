// CI の全対象実行を省略できるか判定する入口（テスト先行の枠）。
export async function decideMutation() {
  return { run: true, reason: '全対象を実行' }
}
