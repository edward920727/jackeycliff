'use client'

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = {
  id: string
  name: string
  score: number
}

const WORD_BANK = [
  '貓咪',
  '飛機',
  '披薩',
  '火山',
  '城堡',
  '鯨魚',
  '吉他',
  '雨傘',
  '太空人',
  '恐龍',
  '摩天輪',
  '咖啡',
]

const ROUND_SECONDS = 60

export default function PictionaryPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [playersInput, setPlayersInput] = useState('玩家A,玩家B,玩家C')
  const [players, setPlayers] = useState<Player[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [drawerIndex, setDrawerIndex] = useState(0)
  const [secretWord, setSecretWord] = useState('')
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [guessInput, setGuessInput] = useState('')
  const [message, setMessage] = useState('先輸入玩家名單，開始遊戲後會輪流作畫。')
  const [revealedWord, setRevealedWord] = useState(false)

  const currentDrawer = useMemo(() => {
    if (!players.length) return null
    return players[drawerIndex % players.length]
  }, [drawerIndex, players])

  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer()
          setMessage(`時間到！答案是「${secretWord}」，下一位玩家準備。`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearTimer()
  }, [gameStarted, secretWord, timeLeft])

  useEffect(() => {
    return () => clearTimer()
  }, [])

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function pickWord() {
    return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]
  }

  function resetCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  function setupCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 4
    context.strokeStyle = '#111827'

    resetCanvas()
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const point = getCanvasPoint(event)
    drawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
    canvas.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const point = getCanvasPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.releasePointerCapture(event.pointerId)
  }

  function startGame() {
    const names = playersInput
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)

    if (names.length < 2) {
      setMessage('至少要 2 位玩家，請用逗號分隔名稱。')
      return
    }

    const initializedPlayers = names.map((name, index) => ({
      id: `${name}-${index}`,
      name,
      score: 0,
    }))

    setPlayers(initializedPlayers)
    setDrawerIndex(0)
    setGameStarted(true)
    setSecretWord(pickWord())
    setRevealedWord(false)
    setTimeLeft(ROUND_SECONDS)
    setGuessInput('')
    setMessage(`${initializedPlayers[0].name} 開始作畫，大家快來猜！`)

    setTimeout(setupCanvas, 0)
  }

  function nextRound() {
    if (!players.length) return
    clearTimer()

    const nextIndex = (drawerIndex + 1) % players.length
    setDrawerIndex(nextIndex)
    setSecretWord(pickWord())
    setRevealedWord(false)
    setTimeLeft(ROUND_SECONDS)
    setGuessInput('')
    setMessage(`${players[nextIndex].name} 的回合開始，準備作畫！`)
    resetCanvas()
  }

  function awardDrawerPoint() {
    if (!currentDrawer) return
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === currentDrawer.id
          ? { ...player, score: player.score + 1 }
          : player
      )
    )
  }

  function handleGuessSubmit(event: FormEvent) {
    event.preventDefault()
    if (!secretWord || !guessInput.trim() || timeLeft === 0) return

    if (guessInput.trim() === secretWord) {
      awardDrawerPoint()
      setMessage(`猜中了！答案是「${secretWord}」，作畫者得 1 分。`)
      setGuessInput('')
      setRevealedWord(true)
      clearTimer()
      return
    }

    setMessage(`「${guessInput.trim()}」不對，再試試看！`)
    setGuessInput('')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800"
          >
            ← 返回大廳
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">你畫我猜</h1>
          <div className="text-sm text-gray-400">本地派對模式</div>
        </div>

        {!gameStarted && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 space-y-4">
            <h2 className="text-lg font-semibold">開始新遊戲</h2>
            <p className="text-sm text-gray-300">
              輸入玩家名稱（用逗號分隔），每回合一位玩家作畫，其餘玩家猜詞。
            </p>
            <input
              value={playersInput}
              onChange={(event) => setPlayersInput(event.target.value)}
              placeholder="例如：小明,小華,小美"
              className="w-full rounded-xl bg-gray-950 border border-gray-700 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={startGame}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold"
            >
              開始遊戲
            </button>
          </section>
        )}

        {gameStarted && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                <div className="text-sm sm:text-base">
                  作畫者：
                  <span className="font-bold text-blue-300 ml-1">
                    {currentDrawer?.name}
                  </span>
                </div>
                <div className="text-sm sm:text-base">
                  剩餘時間：
                  <span className="font-bold text-amber-300 ml-1">{timeLeft}s</span>
                </div>
              </div>

              <div className="mb-3 text-sm text-gray-300">
                {revealedWord
                  ? `本回合答案：${secretWord}`
                  : `作畫者題目：${secretWord}（請不要念出來）`}
              </div>

              <canvas
                ref={canvasRef}
                width={900}
                height={520}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full rounded-xl border border-gray-700 bg-white cursor-crosshair touch-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={resetCanvas}
                  className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
                >
                  清空畫布
                </button>
                <button
                  onClick={() => {
                    setRevealedWord(true)
                    clearTimer()
                  }}
                  className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
                >
                  公開答案
                </button>
                <button
                  onClick={nextRound}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500"
                >
                  下一回合
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">猜詞</h3>
                <form onSubmit={handleGuessSubmit} className="space-y-2">
                  <input
                    value={guessInput}
                    onChange={(event) => setGuessInput(event.target.value)}
                    placeholder="輸入你猜的答案"
                    className="w-full rounded-xl bg-gray-950 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-500"
                  >
                    送出猜測
                  </button>
                </form>
              </div>

              <div>
                <h3 className="font-semibold mb-2">分數榜</h3>
                <ul className="space-y-2 text-sm">
                  {players
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between rounded-lg bg-gray-950 border border-gray-800 px-3 py-2"
                      >
                        <span>{player.name}</span>
                        <span className="font-bold text-emerald-300">
                          {player.score} 分
                        </span>
                      </li>
                    ))}
                </ul>
              </div>

              <p className="text-xs text-gray-400">{message}</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
