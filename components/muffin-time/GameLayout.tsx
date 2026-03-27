'use client'

import type { ReactNode } from 'react'

/** 圓形頭像 + 名字 + 手牌數（WePlay 風） */
export function PlayerOrb({
  name,
  cardCount,
  isCurrentTurn,
  size = 'md',
}: {
  name: string
  cardCount: number
  isCurrentTurn: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const initial = name.trim().slice(0, 1) || '?'
  const dim =
    size === 'lg'
      ? 'h-14 w-14 text-xl'
      : size === 'sm'
        ? 'h-9 w-9 text-sm'
        : 'h-11 w-11 text-base'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={[
          'flex shrink-0 items-center justify-center rounded-full border-2 font-bold text-amber-50 shadow-inner transition-all duration-300',
          dim,
          isCurrentTurn
            ? 'border-amber-300/90 bg-amber-900/80 shadow-[0_0_20px_rgba(251,191,36,0.55)] ring-2 ring-amber-400/40'
            : 'border-amber-900/70 bg-gradient-to-b from-amber-950/90 to-black/50',
        ].join(' ')}
      >
        {initial}
      </div>
      <div className="max-w-[4.5rem] truncate text-center text-[9px] font-medium leading-tight text-amber-100/95">
        {name}
      </div>
      <div className="flex items-center gap-0.5 text-[8px] tabular-nums text-amber-300/90">
        <span className="text-[10px] opacity-90" aria-hidden>
          🎴
        </span>
        <span>{cardCount}</span>
      </div>
    </div>
  )
}

type GameLayoutProps = {
  header: ReactNode
  playZone: ReactNode
  avatarLeft?: ReactNode
  avatarTop?: ReactNode
  avatarRight?: ReactNode
  topExtra?: ReactNode
  logPanel: ReactNode
  floatingActions: ReactNode
}

/**
 * 主桌版面（不含底部手牌區）。
 * 手牌請在頁面層用 fixed + z-50 另掛，避免被 overflow 裁切。
 */
export function GameLayout({
  header,
  playZone,
  avatarLeft,
  avatarTop,
  avatarRight,
  topExtra,
  logPanel,
  floatingActions,
}: GameLayoutProps) {
  return (
    <div className="flex h-screen max-h-[100dvh] flex-col overflow-x-hidden bg-[#070403] text-amber-50">
      <div className="shrink-0 border-b border-amber-950/50 bg-black/40 px-2 py-1.5 backdrop-blur-md">{header}</div>

      <div className="relative min-h-0 flex-1 overflow-y-visible">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 78% 58% at 50% 48%, rgba(48,28,14,0.92) 0%, rgba(22,12,6,0.96) 55%, #050302 100%),
              radial-gradient(circle at 20% 15%, rgba(120,80,40,0.12), transparent 42%),
              #0a0604
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-[6%] rounded-[50%] border border-amber-950/35 shadow-[inset_0_0_80px_rgba(0,0,0,0.85)] sm:inset-[7%]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[14%] rounded-[48%] border border-amber-900/20 opacity-60 sm:inset-[15%]"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-[2%] top-1/2 z-20 -translate-y-1/2 sm:left-[3%]">
          <div className="pointer-events-auto">{avatarLeft}</div>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[5%] z-20 -translate-x-1/2 sm:top-[4%]">
          <div className="pointer-events-auto flex flex-col items-center gap-1">
            {avatarTop}
            {topExtra ? <div className="pointer-events-auto max-w-[min(92vw,20rem)]">{topExtra}</div> : null}
          </div>
        </div>
        <div className="pointer-events-none absolute right-[2%] top-1/2 z-20 -translate-y-1/2 sm:right-[3%]">
          <div className="pointer-events-auto">{avatarRight}</div>
        </div>

        {/* PlayZone 低於手牌層（頁面 fixed z-50） */}
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-3 pb-[min(38vh,280px)] pt-[min(12vh,88px)]">
          <div className="pointer-events-auto h-[min(34vmin,280px)] w-[min(72vmin,520px)] max-w-full">{playZone}</div>
        </div>

        <div className="pointer-events-none absolute bottom-[min(28vh,240px)] left-2 z-30 max-w-[min(42vw,200px)] sm:bottom-[min(30vh,260px)] sm:left-3">
          <div className="pointer-events-auto">{logPanel}</div>
        </div>

        <div className="pointer-events-none absolute bottom-[min(26vh,220px)] right-2 z-40 max-w-[min(48vw,220px)] sm:bottom-[min(28vh,240px)] sm:right-3">
          <div className="pointer-events-auto flex flex-col items-end gap-1.5">{floatingActions}</div>
        </div>
      </div>
    </div>
  )
}
