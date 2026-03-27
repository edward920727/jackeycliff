'use client'

import { useEffect, useRef, useState } from 'react'
import { getCardDef } from '@/lib/muffin-time/cards'
import { playCardLandSound } from '@/lib/muffin-time/sound'
import type { FlyDirection } from '@/lib/muffin-time/tableView'

type Stage = 'fly' | 'table' | 'toDiscard'

type PlayState = {
  cardId: string
  rotation: number
  stage: Stage
}

function buildTransform(stage: Stage, flyFrom: FlyDirection, rotation: number): string {
  if (stage === 'fly') {
    switch (flyFrom) {
      case 'left':
        return 'translate(-240px, 8px) scale(0.82)'
      case 'right':
        return 'translate(240px, 8px) scale(0.82)'
      case 'top':
        return 'translate(0, -180px) scale(0.82)'
      case 'bottom':
        return 'translate(0, 200px) scale(0.82)'
      default:
        return 'translate(0, 0) scale(0.82)'
    }
  }
  if (stage === 'table') {
    return `translate(0, 0) rotate(${rotation}deg) scale(1)`
  }
  return 'translate(130px, 130px) rotate(12deg) scale(0.3)'
}

function stageOpacity(stage: Stage): number {
  if (stage === 'fly') return 0.45
  if (stage === 'toDiscard') return 0
  return 1
}

export function PlayZone({
  lastCardPlay,
  flyFrom,
}: {
  lastCardPlay: { cardId: string; actorSeat: number; seq: number } | null | undefined
  flyFrom: FlyDirection
}) {
  const [state, setState] = useState<PlayState | null>(null)
  const seqRef = useRef<number>(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!lastCardPlay?.seq) return
    if (lastCardPlay.seq === seqRef.current) return
    seqRef.current = lastCardPlay.seq
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    const rotation = Math.random() * 10 - 5
    setState({ cardId: lastCardPlay.cardId, rotation, stage: 'fly' })

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setState((s) => (s ? { ...s, stage: 'table' } : null))
      })
    })

    const tSound = setTimeout(() => playCardLandSound(), 520)

    const tExit = setTimeout(() => {
      setState((s) => (s ? { ...s, stage: 'toDiscard' } : null))
    }, 520 + 3000)

    const tClear = setTimeout(() => {
      setState(null)
    }, 520 + 3000 + 520)

    timersRef.current = [tSound, tExit, tClear]
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [lastCardPlay?.seq, lastCardPlay?.cardId])

  if (!state) {
    return (
      <div className="relative flex h-full min-h-0 flex-col items-center justify-center rounded-3xl border border-amber-900/40 bg-black/15 px-2 py-4 text-center shadow-inner">
        <p className="text-[10px] font-medium tracking-widest text-amber-800/80">PlayZone</p>
        <p className="mt-1 max-w-[12rem] text-[9px] leading-relaxed text-amber-900/70">
          行動牌將顯示於此
        </p>
      </div>
    )
  }

  const def = getCardDef(state.cardId)
  const transform = buildTransform(state.stage, flyFrom, state.rotation)
  const opacity = stageOpacity(state.stage)

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-visible rounded-3xl border border-amber-900/45 bg-black/15 px-2 py-3 shadow-inner">
      <p className="absolute top-2 left-1/2 z-0 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/60">
        PlayZone
      </p>

      <div
        className="pointer-events-none absolute bottom-3 right-4 z-0 flex flex-col items-center gap-0.5 rounded-xl border border-amber-950/50 bg-amber-950/40 px-2 py-1.5 text-[9px] text-amber-200/70"
        aria-hidden
      >
        <span>棄牌堆</span>
        <span className="font-mono text-amber-100/90">↓</span>
      </div>

      <div
        className={[
          'relative z-10 w-[min(92%,200px)] rounded-2xl border-2 border-amber-700/90 bg-gradient-to-b from-amber-800/95 to-amber-950 px-2.5 py-2 text-left',
          'shadow-2xl will-change-transform',
          'transition-[transform,opacity] duration-500 ease-out',
          state.stage === 'toDiscard' ? 'duration-500 ease-in' : '',
        ].join(' ')}
        style={{
          transform,
          opacity,
        }}
      >
        <div className="text-sm font-bold text-amber-50 drop-shadow-md">{def?.name ?? state.cardId}</div>
        <div className="mt-1 text-[10px] leading-snug text-amber-200/90 line-clamp-4">{def?.desc}</div>
      </div>
    </div>
  )
}
