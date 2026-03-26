'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { UndercoverGameData, UndeadGuess } from '@/types/undead-feast'
import {
  getUndercoverGame,
  resetUndercoverGameToLobby,
  submitUndeadGuesses,
  submitUndeadWord,
  subscribeToUndercoverGame,
} from '@/lib/undead-feast/firestore'
import { getChallengeLabel } from '@/lib/undead-feast/constants'

function normalizeSeat(seat: number, playerCount: number): number {
  return ((seat - 1 + playerCount) % playerCount) + 1
}

function getBoardOwnerSeatForHolderSeat(holderSeat: number, round: number, playerCount: number): number {
  return normalizeSeat(holderSeat - (round - 1), playerCount)
}

export default function UndeadFeastGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string

  const [game, setGame] = useState<UndercoverGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wordInput, setWordInput] = useState('')
  const [guessMap, setGuessMap] = useState<Record<number, string>>({})

  const pid = searchParams.get('pid') || ''
  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || ''

  useEffect(() => {
    async function init() {
      try {
        const existing = await getUndercoverGame(roomId)
        if (!existing) setError('找不到這個房間')
        else setGame(existing)
      } catch (err: any) {
        setError(err.message || '載入遊戲失敗')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    const unsub = subscribeToUndercoverGame(roomId, (data) => setGame(data))
    return () => unsub()
  }, [roomId])

  const myPlayer = useMemo(
    () => game?.players?.find((p) => p.participantId === pid),
    [game?.players, pid]
  )
  const isHost = role === 'host'
  const players = game?.players || []
  const round = game?.round || 1
  const total = players.length
  const mySeat = myPlayer?.seat || 0

  const myBoardOwnerSeat = useMemo(() => {
    if (!mySeat || !total) return 0
    return getBoardOwnerSeatForHolderSeat(mySeat, round, total)
  }, [mySeat, round, total])

  const myBoard = useMemo(
    () => game?.boards?.find((b) => b.ownerSeat === myBoardOwnerSeat),
    [game?.boards, myBoardOwnerSeat]
  )

  const mySubmittedWord = game?.currentRoundSubmissions?.[String(mySeat)]
  const myGuessSubmitted = (game?.guessSubmissions || []).some((g) => g.guesserParticipantId === pid)

  useEffect(() => {
    if (!game || game.status !== 'guessing') return
    const initial: Record<number, string> = {}
    for (const b of game.boards || []) initial[b.ownerSeat] = ''
    const mine = (game.guessSubmissions || []).find((g) => g.guesserParticipantId === pid)
    if (mine) for (const g of mine.guesses) initial[g.ownerSeat] = g.character
    setGuessMap(initial)
  }, [game?.status, game?.boards, game?.guessSubmissions, pid])

  const handleSubmitWord = async () => {
    try {
      await submitUndeadWord(roomId, pid, wordInput)
      setWordInput('')
    } catch (err: any) {
      alert(err.message || '提交詞彙失敗')
    }
  }

  const handleSubmitGuesses = async () => {
    if (!game) return
    const guesses: UndeadGuess[] = game.boards.map((b) => ({
      ownerSeat: b.ownerSeat,
      character: guessMap[b.ownerSeat] || '',
    }))
    try {
      await submitUndeadGuesses(roomId, pid, guesses)
    } catch (err: any) {
      alert(err.message || '提交猜測失敗')
    }
  }

  const handleReset = async () => {
    if (!confirm('確定回到房間大廳重新開始？')) return
    await resetUndercoverGameToLobby(roomId)
  }

  useEffect(() => {
    if (!game || game.status !== 'lobby') return
    const q = new URLSearchParams({ pid, role, name })
    router.push(`/undead-feast/${roomId}?${q.toString()}`)
  }, [game?.status, pid, role, name, roomId, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-200">載入中...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-rose-300">{error}</div>
  if (!game || !myPlayer) return null

  const progressCount = Object.keys(game.currentRoundSubmissions || {}).length
  const challengeLabel = getChallengeLabel(game.currentRoundChallengeKey)
  const customChallengeText = game.currentRoundCustomChallengeText
  const pendingPlayers = players.filter(
    (p) => !(game.currentRoundSubmissions || {})[String(p.seat)]
  )
  const guessSubmittedParticipantIds = new Set(
    (game.guessSubmissions || []).map((sub) => sub.guesserParticipantId)
  )
  const pendingGuessPlayers = players.filter((p) => !guessSubmittedParticipantIds.has(p.participantId))

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6 text-slate-100"
      style={{
        backgroundImage: "url('/undead-feast-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/undead-feast/${roomId}`)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs"
            >
              ← 返回房間
            </button>
            {isHost && (
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg bg-rose-900/70 hover:bg-rose-800/70 text-xs border border-rose-400/30"
              >
                重新開始（回到房間）
              </button>
            )}
          </div>
          <div className="text-xs">房間：{roomId}</div>
        </div>

        {game.status === 'playing' && (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 space-y-3">
            <h1 className="text-xl font-bold text-yellow-200">亡靈盛宴｜傳詞階段</h1>
            <p className="text-sm text-slate-300">
              第 {round} / {game.maxRounds} 輪（每輪全員提交後自動進下一輪）
            </p>
            <p className="text-sm text-slate-300">進度：{progressCount} / {total}</p>
            {pendingPlayers.length > 0 && (
              <p className="text-xs text-amber-200">
                尚未提交：{pendingPlayers.map((p) => `${p.name}（${p.seat}）`).join('、')}
              </p>
            )}
            {game.advancedMode && challengeLabel && (
              <p className="text-xs text-rose-300">本輪難題：{challengeLabel}</p>
            )}
            {game.advancedMode && customChallengeText && (
              <p className="text-xs text-fuchsia-300">本輪自訂規則（提醒）：{customChallengeText}</p>
            )}
            <div className="text-sm">
              {round === 1 ? (
                <span>你的亡靈人物：<span className="text-yellow-300 font-semibold">{myBoard?.character}</span></span>
              ) : (
                <span>你拿到的詞彙：<span className="text-emerald-300 font-semibold">{myBoard?.words?.[myBoard.words.length - 1]}</span></span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                disabled={!!mySubmittedWord}
                placeholder={mySubmittedWord ? '本輪已提交' : '輸入一個詞語'}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleSubmitWord}
                disabled={!!mySubmittedWord}
                className="px-3 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold disabled:bg-slate-700 disabled:text-slate-400"
              >
                提交
              </button>
            </div>
          </div>
        )}

        {game.status === 'guessing' && (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 space-y-3">
            <h2 className="text-xl font-bold text-yellow-200">猜測階段</h2>
            <p className="text-sm text-slate-300">
              進度：{players.length - pendingGuessPlayers.length} / {players.length}
            </p>
            {pendingGuessPlayers.length > 0 && (
              <p className="text-xs text-amber-200">
                尚未提交：{pendingGuessPlayers.map((p) => `${p.name}（${p.seat}）`).join('、')}
              </p>
            )}
            <div className="text-xs text-slate-400">候選人物：{(game.candidateCharacters || []).join('、')}</div>
            <div className="space-y-2">
              {game.boards.map((b) => (
                <div key={b.ownerSeat} className="bg-slate-800/70 rounded-lg p-3 border border-slate-700">
                  <div className="text-sm mb-2">
                    骷髏 {b.ownerSeat}（{b.ownerName}）提示詞：{b.words[b.words.length - 1] || '（無）'}
                  </div>
                  <select
                    value={guessMap[b.ownerSeat] || ''}
                    onChange={(e) => setGuessMap((prev) => ({ ...prev, [b.ownerSeat]: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-sm"
                  >
                    <option value="">請選擇人物</option>
                    {game.candidateCharacters.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmitGuesses}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold text-sm"
            >
              {myGuessSubmitted ? '重新提交猜測' : '提交猜測'}
            </button>
          </div>
        )}

        {game.status === 'finished' && (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 space-y-3">
            <h2 className="text-xl font-bold text-yellow-200">結算</h2>
            <p className="text-sm text-slate-300">達成「至少 {players.length - 1} 人答對」的亡靈會安息。</p>
            {game.boards.map((b) => {
              const correct = (game.guessSubmissions || []).filter((sub) => {
                const g = sub.guesses.find((x) => x.ownerSeat === b.ownerSeat)
                return g?.character === b.character
              }).length
              const rested = game.restedSeats.includes(b.ownerSeat)
              return (
                <div key={b.ownerSeat} className="bg-slate-800/70 rounded-lg p-3 border border-slate-700">
                  <div className="text-sm">
                    骷髏 {b.ownerSeat}（{b.ownerName}）真身：<span className="font-semibold text-yellow-300">{b.character}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">詞鏈：{b.words.join(' → ')}</div>
                  <div className={`text-xs mt-1 ${rested ? 'text-emerald-300' : 'text-rose-300'}`}>
                    答對 {correct} 人｜{rested ? '成功安息' : '未安息'}
                  </div>
                </div>
              )
            })}
            {isHost && (
              <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">
                回到房間大廳重新開始
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

