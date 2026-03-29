'use client'

import { getCardDef } from '@/lib/muffin-time/cards'

function handFanBase(index: number, total: number): { angleDeg: number; arcY: number } {
  if (total <= 0) return { angleDeg: 0, arcY: 0 }
  if (total === 1) return { angleDeg: 0, arcY: 0 }
  const t = index / (total - 1)
  const angleDeg = -14 + t * 28
  const arcY = Math.pow(Math.abs(angleDeg) / 14, 2) * 5
  return { angleDeg, arcY }
}

export type HandOfCardsProps = {
  cardIds: string[]
  hoveredIndex: number | null
  onHoverIndex: (i: number | null) => void
  highlight?: boolean
}

/**
 * 底部扇形手牌：固定較高 z-index，避免被 PlayZone／桌面層遮住。
 * 容器 min-h 預留扇形向上展開空間，勿設 max-h 以免裁切。
 */
export function HandOfCards({ cardIds, hoveredIndex, onHoverIndex, highlight }: HandOfCardsProps) {
  return (
    <div
      className={[
        'relative z-50 flex w-full max-w-[min(96vw,52rem)] touch-manipulation justify-center overflow-visible px-1',
        'min-h-[210px] items-end pb-1 pt-2 sm:min-h-[240px]',
        highlight ? 'rounded-xl ring-2 ring-amber-400/35 shadow-[0_0_20px_rgba(251,191,36,0.22)]' : '',
      ].join(' ')}
      onMouseLeave={() => onHoverIndex(null)}
      onPointerLeave={() => onHoverIndex(null)}
    >
      {cardIds.map((cid, idx) => {
        const def = getCardDef(cid)
        const { angleDeg, arcY } = handFanBase(idx, cardIds.length)
        const isHovered = hoveredIndex === idx
        const isDimmed = hoveredIndex !== null && !isHovered
        const zBase = idx + 1
        const transform = isHovered
          ? 'rotate(0deg) translateY(-18px) scale(1.1)'
          : `rotate(${angleDeg}deg) translateY(${arcY}px) scale(1)`

        return (
          <div
            key={`${cid}-${idx}`}
            className={[
              'relative origin-bottom cursor-default select-none rounded-xl border border-amber-700/90 bg-gradient-to-b from-amber-900/95 to-amber-950 shadow-lg',
              'flex min-h-[min(14vw,5.5rem)] w-[min(16vw,5rem)] max-w-[6.5rem] flex-col justify-between px-1.5 py-1.5 sm:min-h-[min(12vh,5.25rem)] sm:w-[min(14vw,5rem)]',
              'transition-[transform,opacity,filter] duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0',
              idx === 0 ? '' : '-ml-[6.25vw] sm:-ml-[2.65rem]',
              /* 小螢幕避免 blur（GPU）；僅 md+ 用輕 blur 區分焦點 */
              isDimmed ? 'md:brightness-[0.55] md:opacity-65 md:blur-[0.5px]' : '',
            ].join(' ')}
            style={{ zIndex: isHovered ? 100 : zBase, transform }}
            onMouseEnter={() => onHoverIndex(idx)}
            onPointerDown={() => onHoverIndex(idx)}
            onClick={() => onHoverIndex(hoveredIndex === idx ? null : idx)}
          >
            <div className="line-clamp-2 text-[10px] font-semibold leading-tight text-amber-50 sm:text-[11px]">
              {def?.name ?? cid}
            </div>
            <div className="line-clamp-2 text-[8px] leading-snug text-amber-300/85 sm:text-[9px]">{def?.desc}</div>
            <div className="text-[7px] uppercase tracking-wider text-amber-600/80">
              {def?.kind === 'action' ? '行' : def?.kind === 'trap' ? '陷' : def?.kind === 'counter' ? '反' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
