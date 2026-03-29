'use client'

import { Billboard, Html } from '@react-three/drei'
import type { BoardCellDef } from '@/lib/monopoly/types'
import { getTileDisplayInfo } from '@/lib/monopoly/tileDisplay'
import { cellStripColor } from './cellColors'
import { useOrthoHtmlDistanceFactor } from './useOrthoHtmlDistanceFactor'

type Props = {
  cell: BoardCellDef
  /** 標籤錨點在格子上方的局部 y */
  y?: number
  /** 由父層 hover 控制；未顯示時不掛載 Html */
  visible: boolean
  /** 同色組湊齊：租金加倍 */
  isFullSet?: boolean
  /** 滑鼠移入說明卡（避免從格子移到文字時閃爍） */
  onCardPointerEnter?: () => void
  onCardPointerLeave?: () => void
}

export function TileFaceLabel({
  cell,
  y = 0.58,
  visible,
  isFullSet = false,
  onCardPointerEnter,
  onCardPointerLeave,
}: Props) {
  const distanceFactor = useOrthoHtmlDistanceFactor()
  const { emoji, primary, secondary } = getTileDisplayInfo(cell)
  const accent = cellStripColor(cell)

  if (!visible) return null

  return (
    <Billboard follow position={[0, y, 0]} lockX={false} lockY={false} lockZ={false}>
      <Html center distanceFactor={distanceFactor} occlude={false} pointerEvents="auto">
        <div
          className="flex max-w-[156px] flex-col gap-1 rounded-xl border border-white/25 px-2.5 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-md"
          onMouseEnter={onCardPointerEnter}
          onMouseLeave={onCardPointerLeave}
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(248,250,252,0.18) 100%)`,
            borderLeftWidth: 3,
            borderLeftColor: accent,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 10px rgba(15,23,42,0.06)`,
          }}
        >
          <div className="flex items-start gap-1">
            <span
              className="shrink-0 text-[14px] leading-none opacity-90 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
              aria-hidden
            >
              {emoji}
            </span>
            <p className="line-clamp-2 min-h-[1.5em] text-left text-[11px] font-extrabold leading-tight tracking-tight text-slate-800 drop-shadow-[0_0.5px_1.5px_rgba(255,255,255,0.85)]">
              {primary}
            </p>
          </div>
          {secondary ? (
            <p className="border-t border-white/20 pt-1 text-[9.5px] font-semibold leading-snug tracking-wide text-slate-700/95 drop-shadow-[0_0.5px_1px_rgba(255,255,255,0.8)]">
              {secondary}
            </p>
          ) : null}
          {isFullSet && (
            <p className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-amber-950 shadow-[0_3px_10px_rgba(245,158,11,0.25)]">
              租金加倍
            </p>
          )}
        </div>
      </Html>
    </Billboard>
  )
}
