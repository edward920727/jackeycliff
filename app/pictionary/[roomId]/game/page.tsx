'use client'

import { FormEvent, PointerEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { DrawPoint, DrawStroke, PictionaryGameData } from '@/types/pictionary'
import {
  appendPictionaryStroke,
  clearPictionaryCanvas,
  formatPictionaryFirestoreError,
  nextPictionaryRound,
  resetPictionaryToLobby,
  revealPictionaryAnswer,
  submitPictionaryGuess,
  subscribeToPictionaryGame,
} from '@/lib/pictionary/firestore'
import { pictionaryBackgroundStyle } from '@/lib/pictionary/constants'

function PictionaryGameContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const pid = searchParams.get('pid') || ''
  const role = (searchParams.get('role') || 'player') as 'host' | 'player'

  const [game, setGame] = useState<PictionaryGameData | null>(null)
  const [subError, setSubError] = useState<string | null>(null)
  const [guess, setGuess] = useState('')
  const [message, setMessage] = useState('開始猜詞吧！')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const pathRef = useRef<DrawPoint[]>([])

  useEffect(() => {
    if (!pid) {
      router.push('/pictionary')
      return
    }
    const unsub = subscribeToPictionaryGame(
      roomId,
      (data) => {
        if (!data) return
        setGame(data)
        setSubError(null)
      },
      (err) => setSubError(formatPictionaryFirestoreError(err))
    )
    return () => unsub()
  }, [roomId, pid, router])

  const currentRound = game?.currentRound
  const me = useMemo(() => game?.participants.find((p) => p.id === pid), [game?.participants, pid])
  const isDrawer = currentRound?.drawerId === pid
  const isHost = role === 'host'

  const timeLeft = useMemo(() => {
    if (!currentRound?.startedAt) return 0
    const startedAt = currentRound.startedAt.toDate
      ? currentRound.startedAt.toDate().getTime()
      : new Date(currentRound.startedAt).getTime()
    const passed = Math.floor((Date.now() - startedAt) / 1000)
    return Math.max(0, currentRound.durationSeconds - passed)
  }, [currentRound, game?.updated_at])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const strokes = game?.strokes || []
    for (const stroke of strokes) {
      if (!stroke.points.length) continue
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
  }, [game?.strokes])

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): DrawPoint {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !currentRound || currentRound.isRevealed) return
    drawingRef.current = true
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
  }

  async function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) canvas.releasePointerCapture(event.pointerId)
    if (!isDrawer) return
    if (pathRef.current.length < 2) return
    const stroke: DrawStroke = { points: pathRef.current, color: '#111827', width: 4 }
    pathRef.current = []
    await appendPictionaryStroke(roomId, stroke)
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
      setMessage(result.correct ? '猜中了！你和作畫者各得 1 分。' : '猜錯了，再試試看！')
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
        className="min-h-screen text-white flex items-center justify-center bg-black/60"
        style={pictionaryBackgroundStyle}
      >
        載入遊戲中...
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white p-4 sm:p-6 bg-black/60"
      style={pictionaryBackgroundStyle}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/pictionary')}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm"
          >
            ← 返回大廳
          </button>
          <div className="font-mono text-xs sm:text-sm">房號：{roomId}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-3 text-sm">
              <div>回合：{currentRound.roundNumber} / {game.maxRounds}</div>
              <div>作畫者：<span className="text-rose-300 font-semibold">{currentRound.drawerName}</span></div>
              <div>剩餘：<span className="text-amber-300 font-semibold">{timeLeft}s</span></div>
            </div>
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
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-semibold"
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
                placeholder={isDrawer ? '你是作畫者，不能猜題' : '輸入你的猜測'}
                disabled={isDrawer || !!currentRound.isRevealed}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting || isDrawer || !!currentRound.isRevealed}
                className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 px-3 py-2 text-sm font-semibold"
              >
                送出猜測
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-2">{message}</p>

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
                遊戲已結束，房主可按「回到大廳重開」。
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

