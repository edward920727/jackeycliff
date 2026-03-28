'use client'

import { FormEvent, PointerEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { DrawPoint, DrawStroke, PictionaryGameData } from '@/types/pictionary'
import type { PictionarySnapshotMeta } from '@/lib/pictionary/firestore'
import {
  clearPictionaryCanvas,
  finalizePictionaryStroke,
  formatPictionaryFirestoreError,
  nextPictionaryRound,
  resetPictionaryToLobby,
  revealPictionaryAnswer,
  setStrokeInProgress,
  submitPictionaryGuess,
  subscribeToPictionaryGame,
} from '@/lib/pictionary/firestore'
import { PictionaryConnectionBadge } from '@/lib/pictionary/ConnectionBadge'
import { pictionaryBackgroundStyle } from '@/lib/pictionary/constants'
import {
  getSoundEnabled,
  playGameFinishedChime,
  playRoundChangeChime,
  setSoundEnabledStorage,
} from '@/lib/pictionary/roundFeedback'
import { useNavigatorOnline } from '@/lib/pictionary/useNavigatorOnline'
import { getWordBankLabel } from '@/lib/pictionary/wordBanks'

const STROKE_SYNC_MS = 100

function guessLogAtMs(at: unknown): number {
  if (!at) return 0
  const v = at as { toDate?: () => Date; toMillis?: () => number }
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  if (at instanceof Date) return at.getTime()
  return new Date(at as string | number).getTime()
}

function drawStrokePath(ctx: CanvasRenderingContext2D, stroke: { points: DrawPoint[]; color: string; width: number }) {
  if (stroke.points.length < 2) return
  ctx.beginPath()
  ctx.lineWidth = stroke.width
  ctx.strokeStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
  }
  ctx.stroke()
}

function PictionaryGameContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const pid = searchParams.get('pid') || ''
  const role = (searchParams.get('role') || 'player') as 'host' | 'player'

  const [game, setGame] = useState<PictionaryGameData | null>(null)
  const [fsMeta, setFsMeta] = useState<PictionarySnapshotMeta | null>(null)
  const [subError, setSubError] = useState<string | null>(null)
  const [guess, setGuess] = useState('')
  const [message, setMessage] = useState('開始猜詞吧！')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [roundBanner, setRoundBanner] = useState<string | null>(null)
  /** 每秒遞增，讓剩餘時間依 Date.now() 重算（僅依賴 Firestore 更新時倒數會凍結） */
  const [timerTick, setTimerTick] = useState(0)

  /** 計時歸零：已對該回合送出過「下一回合／公布」請求（避免每秒重複） */
  const timerPhase1RoundRef = useRef<number | null>(null)
  /** 該回合的公布是否由計時歸零觸發（須在公布後延遲再進下一題） */
  const timerRevealTriggeredForRoundRef = useRef<number | null>(null)
  const timerPostRevealTimeoutRoundRef = useRef<number | null>(null)
  const timerImmediateAdvanceRoundRef = useRef<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const isDrawingLocalRef = useRef(false)
  const lastStrokeSyncRef = useRef(0)
  const pathRef = useRef<DrawPoint[]>([])

  const navigatorOnline = useNavigatorOnline()

  useEffect(() => {
    setSoundEnabled(getSoundEnabled())
  }, [])

  const prevRoundRef = useRef<number | null>(null)
  const prevStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pid) {
      router.push('/pictionary')
      return
    }
    const unsub = subscribeToPictionaryGame(
      roomId,
      (data, meta) => {
        if (meta) setFsMeta(meta)
        if (!data) return
        setGame(data)
        setSubError(null)
      },
      (err) => setSubError(formatPictionaryFirestoreError(err))
    )
    return () => unsub()
  }, [roomId, pid, router])

  useEffect(() => {
    const id = window.setInterval(() => setTimerTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const currentRound = game?.currentRound
  const me = useMemo(() => game?.participants.find((p) => p.id === pid), [game?.participants, pid])
  const isDrawer = currentRound?.drawerId === pid
  const isHost = role === 'host'

  useEffect(() => {
    if (!soundEnabled) return
    const rn = currentRound?.roundNumber
    if (rn == null) return
    const prev = prevRoundRef.current
    prevRoundRef.current = rn
    if (prev == null) return
    if (prev === rn) return
    playRoundChangeChime()
    setRoundBanner('換題')
    const t = window.setTimeout(() => setRoundBanner(null), 2600)
    return () => window.clearTimeout(t)
  }, [currentRound?.roundNumber, soundEnabled])

  useEffect(() => {
    if (!soundEnabled || !game) return
    const st = game.status
    const prev = prevStatusRef.current
    prevStatusRef.current = st
    if (prev == null) return
    if (prev === 'playing' && st === 'finished') {
      playGameFinishedChime()
      setRoundBanner('遊戲結束')
      const t = window.setTimeout(() => setRoundBanner(null), 2600)
      return () => window.clearTimeout(t)
    }
  }, [game?.status, soundEnabled])

  const timeLeft = useMemo(() => {
    if (!currentRound?.startedAt) return 0
    const startedAt = currentRound.startedAt.toDate
      ? currentRound.startedAt.toDate().getTime()
      : new Date(currentRound.startedAt).getTime()
    const passed = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, currentRound.durationSeconds - passed)
  }, [currentRound, timerTick])

  useEffect(() => {
    const rn = game?.currentRound?.roundNumber
    if (rn == null) return
    timerPhase1RoundRef.current = null
    timerRevealTriggeredForRoundRef.current = null
    timerPostRevealTimeoutRoundRef.current = null
    timerImmediateAdvanceRoundRef.current = null
  }, [game?.currentRound?.roundNumber])

  useEffect(() => {
    const round = game?.currentRound
    if (!game || game.status !== 'playing' || !round) return
    if (timeLeft > 0) return

    const rn = round.roundNumber

    if (!round.isRevealed) {
      if (timerPhase1RoundRef.current === rn) return
      timerPhase1RoundRef.current = rn
      timerRevealTriggeredForRoundRef.current = rn
      void nextPictionaryRound(roomId, { ifCurrentRoundNumber: rn }).catch(() => {
        timerPhase1RoundRef.current = null
        timerRevealTriggeredForRoundRef.current = null
      })
      return
    }

    if (timerRevealTriggeredForRoundRef.current === rn) {
      if (timerPostRevealTimeoutRoundRef.current === rn) return
      timerPostRevealTimeoutRoundRef.current = rn
      const t = window.setTimeout(() => {
        void nextPictionaryRound(roomId, { ifCurrentRoundNumber: rn }).finally(() => {
          timerPostRevealTimeoutRoundRef.current = null
        })
      }, 3500)
      return () => window.clearTimeout(t)
    }

    if (timerImmediateAdvanceRoundRef.current === rn) return
    timerImmediateAdvanceRoundRef.current = rn
    void nextPictionaryRound(roomId, { ifCurrentRoundNumber: rn }).catch(() => {
      timerImmediateAdvanceRoundRef.current = null
    })
  }, [timeLeft, timerTick, game?.status, game?.currentRound, roomId])

  const roundGuessLog = useMemo(() => {
    if (!currentRound || !game?.guess_log?.length) return []
    return [...game.guess_log]
      .filter((e) => e.roundNumber === currentRound.roundNumber)
      .sort((a, b) => guessLogAtMs(a.at) - guessLogAtMs(b.at))
  }, [game?.guess_log, currentRound?.roundNumber])

  const alreadyCorrectThisRound = useMemo(() => {
    if (!currentRound || !pid) return false
    const ids = currentRound.correctOrderIds?.length
      ? currentRound.correctOrderIds
      : currentRound.solvedById
        ? [currentRound.solvedById]
        : []
    return ids.includes(pid)
  }, [currentRound, pid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isDrawer && isDrawingLocalRef.current) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const strokes = game?.strokes || []
    for (const stroke of strokes) {
      drawStrokePath(ctx, stroke)
    }

    const wip = game?.strokeInProgress
    if (wip && wip.points.length >= 2) {
      drawStrokePath(ctx, wip)
    }
  }, [game?.strokes, game?.strokeInProgress, isDrawer])

  /** 將螢幕上的點轉成 canvas 內部座標（CSS 縮放後的顯示區與 width/height 屬性常不一致） */
  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): DrawPoint {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const rw = rect.width || 1
    const rh = rect.height || 1
    const scaleX = canvas.width / rw
    const scaleY = canvas.height / rh
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !currentRound || currentRound.isRevealed) return
    drawingRef.current = true
    isDrawingLocalRef.current = true
    lastStrokeSyncRef.current = 0
    pathRef.current = [pointFromEvent(event)]
    const canvas = canvasRef.current
    if (canvas) canvas.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !isDrawer) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const p = pointFromEvent(event)
    pathRef.current.push(p)

    const points = pathRef.current
    if (points.length < 2) return
    const prev = points[points.length - 2]
    ctx.beginPath()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#111827'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()

    const now = Date.now()
    if (now - lastStrokeSyncRef.current >= STROKE_SYNC_MS && points.length >= 2) {
      lastStrokeSyncRef.current = now
      const snapshot: DrawStroke = {
        points: points.map((pt) => ({ ...pt })),
        color: '#111827',
        width: 4,
      }
      void setStrokeInProgress(roomId, snapshot)
    }
  }

  async function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    isDrawingLocalRef.current = false
    const canvas = canvasRef.current
    if (canvas) canvas.releasePointerCapture(event.pointerId)
    if (!isDrawer) return

    const pts = pathRef.current
    pathRef.current = []

    if (pts.length < 2) {
      await setStrokeInProgress(roomId, null)
      return
    }

    const stroke: DrawStroke = { points: pts, color: '#111827', width: 4 }
    await finalizePictionaryStroke(roomId, stroke)
  }

  async function handleGuess(event: FormEvent) {
    event.preventDefault()
    if (!guess.trim() || !game || !currentRound || currentRound.isRevealed) return
    if (isDrawer) {
      setMessage('作畫者不能猜題')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await submitPictionaryGuess(roomId, pid, guess.trim())
      if (result.correct && result.rank != null && result.points != null) {
        const tail = result.advancedRound ? ' 全員已答對，已進入下一回合。' : ''
        setMessage(`猜中了！第 ${result.rank} 位答對，你與作畫者各得 ${result.points} 分。${tail}`)
      } else {
        setMessage(result.correct ? '猜中了！' : '猜錯了，再試試看！')
      }
      setGuess('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (subError) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center p-4 bg-black/60"
        style={pictionaryBackgroundStyle}
      >
        <div className="max-w-md rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-sm">{subError}</div>
      </div>
    )
  }

  if (!game || !currentRound) {
    return (
      <div
        className="min-h-screen text-white flex flex-col items-center justify-center gap-3 bg-black/60 p-4"
        style={pictionaryBackgroundStyle}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <PictionaryConnectionBadge navigatorOnline={navigatorOnline} fsMeta={fsMeta} />
        </div>
        <p>載入遊戲中...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white p-4 sm:p-6 bg-black/60"
      style={pictionaryBackgroundStyle}
    >
      {roundBanner ? (
        <div
          className="fixed left-1/2 top-16 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg border border-rose-500/60 bg-gray-950/95 px-4 py-2 text-center text-sm text-rose-100 shadow-lg"
          role="status"
          aria-live="polite"
        >
          {roundBanner}
        </div>
      ) : null}
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push('/pictionary')}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm w-fit"
          >
            ← 返回大廳
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PictionaryConnectionBadge navigatorOnline={navigatorOnline} fsMeta={fsMeta} />
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled
                setSoundEnabled(next)
                setSoundEnabledStorage(next)
              }}
              className="rounded-lg border border-gray-600 bg-gray-900 px-2 py-1 text-[10px] sm:text-xs text-gray-300 hover:bg-gray-800"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? '關閉換題音效' : '開啟換題音效'}
            >
              {soundEnabled ? '音效：開' : '音效：關'}
            </button>
            <div className="font-mono text-xs sm:text-sm">房號：{roomId}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-2 text-sm">
              <div>回合：{currentRound.roundNumber} / {game.maxRounds}</div>
              <div>作畫者：<span className="text-rose-300 font-semibold">{currentRound.drawerName}</span></div>
              <div>剩餘：<span className="text-amber-300 font-semibold">{timeLeft}s</span></div>
            </div>
            <div className="mb-3 text-xs text-gray-400">
              {game.winMode === 'first_to_score'
                ? `獲勝：先達 ${game.targetScore ?? 5} 分 · `
                : '獲勝：比完回合分數最高 · '}
              題庫：{getWordBankLabel(game.wordBankId ?? 'general')}
            </div>
            <p className="mb-3 text-xs text-gray-500">
              答對順序：第 1 位 5 分、第 2 位 4 分、第 3 位 3 分…（作畫者與答對者同分）；公開答案前其他人仍可搶答。所有人（作畫者除外）都答對時會自動換題；若有人尚未答對就換題（倒數歸零或房主按「下一回合」），會先公布題目再進下一題。
            </p>
            <div className="mb-3 text-sm text-gray-300">
              {isDrawer || currentRound.isRevealed ? `題目：${currentRound.word}` : '題目：？？？'}
            </div>

            <canvas
              ref={canvasRef}
              width={900}
              height={520}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`w-full rounded-xl border border-gray-700 bg-white touch-none ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => clearPictionaryCanvas(roomId)}
                disabled={!isDrawer || !!currentRound.isRevealed}
                className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                清空畫布
              </button>
              {isHost && (
                <>
                  <button
                    onClick={() => revealPictionaryAnswer(roomId)}
                    className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm"
                  >
                    公開答案
                  </button>
                  <button
                    onClick={() => nextPictionaryRound(roomId)}
                    disabled={game.status === 'finished'}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:opacity-60 px-3 py-1.5 text-sm font-semibold"
                  >
                    下一回合
                  </button>
                  {game.status === 'finished' && (
                    <button
                      onClick={() => resetPictionaryToLobby(roomId)}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-semibold"
                    >
                      回到大廳重開
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="font-semibold mb-2">猜詞</h3>
            <form onSubmit={handleGuess} className="space-y-2">
              <input
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                placeholder={
                  isDrawer
                    ? '你是作畫者，不能猜題'
                    : alreadyCorrectThisRound
                      ? '你已在本回合答對'
                      : '輸入你的猜測'
                }
                disabled={isDrawer || !!currentRound.isRevealed || alreadyCorrectThisRound}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting || isDrawer || !!currentRound.isRevealed || alreadyCorrectThisRound}
                className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 px-3 py-2 text-sm font-semibold"
              >
                送出猜測
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-2">{message}</p>

            <h3 className="font-semibold mt-4 mb-2">本回合猜詞紀錄</h3>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/80 p-2 space-y-1.5 text-xs mb-1">
              {roundGuessLog.length === 0 ? (
                <p className="text-gray-500">尚無紀錄</p>
              ) : (
                roundGuessLog.map((entry) => (
                  <div key={entry.id} className="leading-snug">
                    {entry.isCorrect ? (
                      <span>
                        <span className="text-emerald-400 font-medium">{entry.name}</span>
                        <span className="text-gray-300"> 猜中了</span>
                        {entry.rank != null && entry.points != null ? (
                          <span className="text-amber-300/90">（第 {entry.rank} 位 · 各 +{entry.points} 分）</span>
                        ) : null}
                        <span className="text-gray-500">（答案已隱藏）</span>
                      </span>
                    ) : (
                      <span>
                        <span className="text-slate-300">{entry.name}</span>
                        <span className="text-gray-500">：</span>
                        <span className="text-slate-100">{entry.text}</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <h3 className="font-semibold mt-5 mb-2">分數榜</h3>
            <ul className="space-y-2 text-sm">
              {game.participants
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((participant) => (
                  <li
                    key={participant.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      participant.id === pid ? 'border-rose-500 bg-gray-800' : 'border-gray-800 bg-gray-950'
                    }`}
                  >
                    <span>{participant.name}{participant.id === pid ? '（你）' : ''}</span>
                    <span className="font-semibold text-emerald-300">{participant.score}</span>
                  </li>
                ))}
            </ul>

            {game.status === 'finished' && (
              <p className="mt-3 text-xs text-amber-300">
                {game.winMode === 'first_to_score'
                  ? '已有玩家達到目標分數，遊戲結束。房主可按「回到大廳重開」。'
                  : '遊戲已結束，房主可按「回到大廳重開」。'}
              </p>
            )}
            {me && <p className="mt-3 text-xs text-gray-500">你的分數：{me.score}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PictionaryGamePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen text-white flex items-center justify-center bg-black/60"
          style={pictionaryBackgroundStyle}
        >
          載入中...
        </div>
      }
    >
      <PictionaryGameContent />
    </Suspense>
  )
}

