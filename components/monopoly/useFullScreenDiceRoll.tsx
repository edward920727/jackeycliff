'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { GameAction } from '@/lib/monopoly/engine'
import { rollTwoDice } from '@/lib/monopoly/engine'
import { AnimatePresence } from 'framer-motion'
import { FullScreenDiceOverlay } from './FullScreenDiceOverlay'

const SPIN_MS = 1750
const REVEAL_MS = 520
const FAILSAFE_MS = SPIN_MS + REVEAL_MS + 1200

type OverlayState =
  | null
  | {
      id: number
      d1: number
      d2: number
      mode: 'roll' | 'jail_pay'
      phase: 'spinning' | 'reveal'
      rollerName: string
    }

/**
 * 全螢幕先播完擲骰動畫 → 顯示點數 → 再 dispatch（棋子才會動，避免骰還在轉人就開始走）。
 */
export function useFullScreenDiceRoll(dispatch: Dispatch<GameAction>) {
  const [overlay, setOverlay] = useState<OverlayState>(null)
  const [portalReady, setPortalReady] = useState(false)
  const rollIdRef = useRef(0)
  /** 與畫面上最近一次 begin 對齊，避免連點時舊計時器誤 dispatch */
  const activeRollIdRef = useRef(0)
  const spinTimerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const failSafeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setPortalReady(true)
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current)
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
      if (failSafeTimerRef.current) window.clearTimeout(failSafeTimerRef.current)
    }
  }, [])

  const begin = useCallback((mode: 'roll' | 'jail_pay', rollerName: string) => {
    const [d1, d2] = rollTwoDice()
    const id = ++rollIdRef.current
    activeRollIdRef.current = id
    setOverlay({ id, d1, d2, mode, phase: 'spinning', rollerName })

    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current)
    if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
    if (failSafeTimerRef.current) window.clearTimeout(failSafeTimerRef.current)

    spinTimerRef.current = window.setTimeout(() => {
      if (activeRollIdRef.current !== id) return
      setOverlay((o) => (o && o.id === id ? { ...o, phase: 'reveal' } : o))
    }, SPIN_MS)

    doneTimerRef.current = window.setTimeout(() => {
      if (activeRollIdRef.current !== id) return
      try {
        if (mode === 'roll') dispatch({ type: 'ROLL', d1, d2 })
        else dispatch({ type: 'JAIL_PAY', d1, d2 })
      } finally {
        setOverlay(null)
      }
    }, SPIN_MS + REVEAL_MS)

    // 手機保險：不論任何狀況，超過一定時間一定關掉 overlay
    failSafeTimerRef.current = window.setTimeout(() => {
      if (activeRollIdRef.current !== id) return
      setOverlay(null)
    }, FAILSAFE_MS)
  }, [])

  const sceneDiceSpinning = !!overlay && overlay.phase === 'spinning'
  const isRolling = !!overlay

  const tree = (
    <AnimatePresence mode="wait">
      {overlay && (
        <FullScreenDiceOverlay
          key={overlay.id}
          d1={overlay.d1}
          d2={overlay.d2}
          spinning={overlay.phase === 'spinning'}
          rollerName={overlay.rollerName}
        />
      )}
    </AnimatePresence>
  )

  const overlayNode: ReactNode =
    portalReady && typeof document !== 'undefined' ? createPortal(tree, document.body) : null

  return { begin, overlayNode, sceneDiceSpinning, isRolling }
}
