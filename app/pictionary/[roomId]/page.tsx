'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { PictionaryGameData, PictionaryWinMode } from '@/types/pictionary'
import type { PictionarySnapshotMeta } from '@/lib/pictionary/firestore'
import { PictionaryConnectionBadge } from '@/lib/pictionary/ConnectionBadge'
import { DEFAULT_WORD_BANK_ID, WORD_BANK_OPTIONS } from '@/lib/pictionary/wordBanks'
import { useNavigatorOnline } from '@/lib/pictionary/useNavigatorOnline'
import {
  createPictionaryRoom,
  formatPictionaryFirestoreError,
  getPictionaryGame,
  joinPictionaryRoom,
  startPictionaryGame,
  subscribeToPictionaryGame,
} from '@/lib/pictionary/firestore'
import { pictionaryBackgroundStyle } from '@/lib/pictionary/constants'

function PictionaryRoomContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''
  const isHost = role === 'host'

  const [game, setGame] = useState<PictionaryGameData | null>(null)
  const [fsMeta, setFsMeta] = useState<PictionarySnapshotMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [maxRounds, setMaxRounds] = useState(6)
  const [winMode, setWinMode] = useState<PictionaryWinMode>('most_points')
  const [targetScore, setTargetScore] = useState(5)
  const [wordBankId, setWordBankId] = useState(DEFAULT_WORD_BANK_ID)

  const navigatorOnline = useNavigatorOnline()

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家資訊，請從大廳重新加入。')
      setLoading(false)
      return
    }
    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getPictionaryGame(roomId)
        if (!existing) {
          if (!isHost) {
            setError('房間不存在')
            return
          }
          const created = await createPictionaryRoom(roomId, {
            id: pid,
            name,
            isHost: true,
          })
          setGame(created)
        } else {
          setGame(existing)
          await joinPictionaryRoom(roomId, { id: pid, name, isHost })
        }

        unsub = subscribeToPictionaryGame(
          roomId,
          (data, meta) => {
            if (meta) setFsMeta(meta)
            setGame(data)
          },
          (err) => {
            setError(formatPictionaryFirestoreError(err))
          }
        )
      } catch (err: unknown) {
        setError(formatPictionaryFirestoreError(err))
      } finally {
        setLoading(false)
      }
    }
    init()

    return () => {
      if (unsub) unsub()
    }
  }, [roomId, pid, name, isHost])

  useEffect(() => {
    if (!game || !pid) return
    if (game.status === 'playing' || game.status === 'finished') {
      const params = new URLSearchParams({
        role: isHost ? 'host' : 'player',
        name,
        pid,
      })
      router.push(`/pictionary/${roomId}/game?${params.toString()}`)
    }
  }, [game?.status, roomId, pid, isHost, name, router])

  const handleStart = async () => {
    if (!isHost) return
    try {
      setIsStarting(true)
      await startPictionaryGame(roomId, {
        maxRounds,
        winMode,
        targetScore,
        wordBankId,
      })
    } catch (err: any) {
      alert(err.message || '開始失敗')
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center bg-black/60"
        style={pictionaryBackgroundStyle}
      >
        載入中...
      </div>
    )
  }
  if (error) {
    return (
      <div
        className="min-h-screen text-white flex flex-col items-center justify-center gap-4 p-4 bg-black/60"
        style={pictionaryBackgroundStyle}
      >
        <div className="max-w-lg rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-sm">{error}</div>
        <button
          type="button"
          onClick={() => router.push('/pictionary')}
          className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm hover:bg-gray-800"
        >
          返回你畫我猜大廳
        </button>
      </div>
    )
  }
  if (!game) return null

  return (
    <div
      className="min-h-screen text-white p-4 sm:p-6 bg-black/60"
      style={pictionaryBackgroundStyle}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.push('/pictionary')}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm w-fit"
          >
            ← 返回大廳
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PictionaryConnectionBadge navigatorOnline={navigatorOnline} fsMeta={fsMeta} />
            <div className="font-mono text-sm tracking-widest">{roomId}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h1 className="text-2xl font-bold mb-2">你畫我猜房間</h1>
          <p className="text-sm text-gray-300 mb-4">等待玩家加入，房主按下開始後會進入遊戲。</p>
          <div className="space-y-2 mb-5">
            {game.participants.map((p) => (
              <div
                key={p.id}
                className={`px-3 py-2 rounded-lg border ${
                  p.id === pid ? 'border-rose-500 bg-gray-800' : 'border-gray-700 bg-gray-950'
                }`}
              >
                <span className="text-sm">{p.name}</span>
                <span className="ml-2 text-xs text-gray-400">{p.isHost ? '房主' : '玩家'}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <div className="space-y-4 mb-5 rounded-xl border border-gray-800 bg-gray-950/80 p-4">
              <p className="text-sm font-medium text-gray-200">開局設定（僅房主）</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-400">回合數</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxRounds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      setMaxRounds(Number.isFinite(v) ? v : 6)
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-400">獲勝方式</span>
                  <select
                    value={winMode}
                    onChange={(e) => setWinMode(e.target.value as PictionaryWinMode)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                  >
                    <option value="most_points">比完所有回合，分數最高者勝</option>
                    <option value="first_to_score">先達指定分數者勝</option>
                  </select>
                </label>
                {winMode === 'first_to_score' && (
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    <span className="text-gray-400">目標分數（任一人達到即結束）</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={targetScore}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setTargetScore(Number.isFinite(v) ? v : 5)
                      }}
                      className="max-w-[12rem] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="text-gray-400">題庫</span>
                  <select
                    value={wordBankId}
                    onChange={(e) => setWordBankId(e.target.value)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                  >
                    {WORD_BANK_OPTIONS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={isStarting || game.participants.length < 2}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 px-4 py-2 font-semibold"
            >
              {game.participants.length < 2 ? '至少需要 2 位玩家' : isStarting ? '開始中...' : '開始遊戲'}
            </button>
          ) : (
            <p className="text-sm text-gray-300">等待房主開始...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PictionaryRoomPage() {
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
      <PictionaryRoomContent />
    </Suspense>
  )
}

