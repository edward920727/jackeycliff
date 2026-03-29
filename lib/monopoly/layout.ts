/** 棋盤視覺座標：11 列 × 11 行外圈，中央 9×9 為空洞（與 BOARD 索引順時針對應） */
export function boardGrid(): (number | null)[][] {
  const g: (number | null)[][] = []
  g.push([30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20])
  for (let r = 1; r <= 9; r++) {
    const left = 30 + r
    const right = 10 + (10 - r)
    g.push([left, ...Array(9).fill(null), right])
  }
  g.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  return g
}
