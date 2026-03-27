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
    return <div className="relative h-full min-h-0 w-full" aria-hidden />
  }

  const def = getCardDef(state.cardId)
  const transform = buildTransform(state.stage, flyFrom, state.rotation)
  const opacity = stageOpacity(state.stage)

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-visible px-2 py-3">
      <div
        className={[
          'relative z-10 w-[min(92%,220px)] px-2 py-1 text-center',
          'will-change-transform',
          'transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none motion-reduce:duration-200',
          state.stage === 'toDiscard' ? 'duration-500 ease-in' : '',
        ].join(' ')}
        style={{
          transform,
          opacity,
        }}
      >
        <div className="text-sm font-bold text-amber-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.65)]">
          {def?.name ?? state.cardId}
        </div>
        <div className="mt-1 text-[10px] leading-snug text-amber-100/95 line-clamp-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
          {def?.desc}
        </div>
      </div>
    </div>
  )
}
