/** 棋盤視覺座標：8 列 x 6 欄，與 BOARD 索引對應（順時針） */
export function boardGrid(): (number | null)[][] {
  const rows: (number | null)[][] = []
  rows.push([17, 16, 15, 14, 13, 12])
  for (let i = 0; i < 6; i++) {
    rows.push([18 + i, null, null, null, null, 11 - i])
  }
  rows.push([0, 1, 2, 3, 4, 5])
  return rows
}
