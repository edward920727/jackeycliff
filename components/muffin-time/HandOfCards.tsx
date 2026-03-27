'use client'

import { getCardDef } from '@/lib/muffin-time/cards'

function handFanBase(index: number, total: number): { angleDeg: number; arcY: number } {
  if (total <= 0) return { angleDeg: 0, arcY: 0 }
  if (total === 1) return { angleDeg: 0, arcY: 0 }
  const t = index / (total - 1)
  const angleDeg = -14 + t * 28
  const arcY = Math.pow(Math.abs(angleDeg) / 14, 2) * 4
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
        'relative z-50 flex w-full max-w-[min(96vw,52rem)] justify-center overflow-visible px-1',
        'min-h-[200px] items-end pb-1 pt-2',
        highlight ? 'rounded-xl ring-2 ring-amber-400/35 shadow-[0_0_20px_rgba(251,191,36,0.22)]' : '',
      ].join(' ')}
      onMouseLeave={() => onHoverIndex(null)}
    >
      {cardIds.map((cid, idx) => {
        const def = getCardDef(cid)
        const { angleDeg, arcY } = handFanBase(idx, cardIds.length)
        const isHovered = hoveredIndex === idx
        const isDimmed = hoveredIndex !== null && !isHovered
        const zBase = idx + 1
        const transform = isHovered
          ? 'rotate(0deg) translateY(-14px) scale(1.12)'
          : `rotate(${angleDeg}deg) translateY(${arcY}px) scale(1)`

        return (
          <div
            key={`${cid}-${idx}`}
            className={[
              'relative origin-bottom cursor-default select-none rounded-lg border border-amber-700/90 bg-gradient-to-b from-amber-900/95 to-amber-950 shadow-lg',
              'flex min-h-[min(10vh,4.25rem)] w-[min(12vw,4rem)] max-w-[5rem] flex-col justify-between px-1 py-1',
              'transition-[transform,filter,opacity] duration-200 ease-out',
              idx === 0 ? '' : '-ml-[5.5vw] sm:-ml-9',
              isDimmed ? 'blur-[0.5px] brightness-[0.55] opacity-65' : '',
            ].join(' ')}
            style={{ zIndex: isHovered ? 100 : zBase, transform }}
            onMouseEnter={() => onHoverIndex(idx)}
          >
            <div className="line-clamp-2 text-[9px] font-semibold leading-tight text-amber-50">{def?.name ?? cid}</div>
            <div className="line-clamp-2 text-[7px] leading-snug text-amber-300/85">{def?.desc}</div>
            <div className="text-[6px] uppercase tracking-wider text-amber-600/80">
              {def?.kind === 'action' ? '行' : def?.kind === 'trap' ? '陷' : def?.kind === 'counter' ? '反' : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
