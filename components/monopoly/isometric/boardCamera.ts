/**
 * 開局第三人稱預設：類似略俯視一角，棋盤占畫面中下方、近側格較大、遠端往地平收斂。
 * MapViewControls 的 targetY 須與此一致。
 */
export const INITIAL_ORBIT_CAMERA = {
  position: [14.2, 9.1, 16.8] as [number, number, number],
  fov: 50,
  /** 與 MapViewControls TARGET_Y 相同 */
  targetY: 0.42,
} as const
