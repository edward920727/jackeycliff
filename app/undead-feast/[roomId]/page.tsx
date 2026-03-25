'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { UndercoverGameData } from '@/types/undead-feast'
import {
  createUndercoverRoom,
  getUndercoverGame,
  joinUndercoverRoom,
  leaveUndercoverRoom,
  startUndercoverGame,
  subscribeToUndercoverGame,
} from '@/lib/undead-feast/firestore'
import { ALL_UNDEAD_CHALLENGE_KEYS, getChallengeLabel } from '@/lib/undead-feast/constants'

export default function UndercoverRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [game, setGame] = useState<UndercoverGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [enabledChallengeKeys, setEnabledChallengeKeys] = useState<string[]>(ALL_UNDEAD_CHALLENGE_KEYS)
  const [customChallengeInput, setCustomChallengeInput] = useState('')
  const [customChallenges, setCustomChallenges] = useState<string[]>([])

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''

  const isHost = role === 'host'

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家識別資訊，請從「亡靈盛宴」大廳重新進入房間。')
      setLoading(false)
      return
    }

    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getUndercoverGame(roomId)

        if (!existing) {
          if (isHost) {
            const created = await createUndercoverRoom(roomId, {
              id: pid,
              name,
              isHost: true,
            })
            setGame(created)
            setAdvancedMode(created.advancedMode ?? false)
            setEnabledChallengeKeys(created.enabledChallengeKeys ?? ALL_UNDEAD_CHALLENGE_KEYS)
            setCustomChallenges(created.customChallenges ?? [])
          } else {
            setError('房間不存在，請確認房間代碼是否正確。')
            setLoading(false)
            return
          }
        } else {
          setGame(existing)
          setAdvancedMode(existing.advancedMode ?? false)
          setEnabledChallengeKeys(existing.enabledChallengeKeys ?? ALL_UNDEAD_CHALLENGE_KEYS)
          setCustomChallenges(existing.customChallenges ?? [])
          await joinUndercoverRoom(roomId, {
            id: pid,
            name,
            isHost,
          })
        }

        unsub = subscribeToUndercoverGame(roomId, (data) => {
          setGame(data)
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message || '載入房間失敗')
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsub) unsub()
      // 不在這裡離開房間，讓參與者資訊在整個遊戲期間都保留
      // 真正離線時再另外處理即可
    }
  }, [roomId, pid, name, isHost])

  // 若遊戲已經開始，直接導向遊戲畫面，並帶上身分與名稱方便還原
  useEffect(() => {
    if (!game || !pid) return
    if (game.status === 'playing') {
      const params = new URLSearchParams({
        pid,
        role: isHost ? 'host' : 'player',
        name,
      })
      router.push(`/undead-feast/${roomId}/game?${params.toString()}`)
    }
  }, [game?.status, roomId, pid, router])

  const handleStartGame = async () => {
    if (!game) return
    if (!isHost) {
      alert('只有房主可以開始遊戲')
      return
    }
    const count = game.participants?.length ?? 0
    if (count < 4) {
      alert('亡靈盛宴至少需要 4 位玩家')
      return
    }
    if (count > 8) {
      alert('亡靈盛宴最多 8 位玩家')
      return
    }

    try {
      setIsStarting(true)
      await startUndercoverGame(roomId, advancedMode, enabledChallengeKeys, customChallenges)

    } catch (err: any) {
      console.error(err)
      alert(err.message || '開始遊戲失敗')
      setIsStarting(false)
    }
  }

  const toggleChallengeKey = (key: string) => {
    setEnabledChallengeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const addCustomChallenge = () => {
    const text = customChallengeInput.trim()
    if (!text) return
    if (customChallenges.includes(text)) {
      alert('這條自訂規則已存在')
      return
    }
    if (customChallenges.length >= 20) {
      alert('自訂規則最多 20 條')
      return
    }
    setCustomChallenges((prev) => [...prev, text])
    setCustomChallengeInput('')
  }

  const removeCustomChallenge = (text: string) => {
    setCustomChallenges((prev) => prev.filter((c) => c !== text))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">載入房間中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-rose-900/20 border border-rose-500/60 text-rose-100 text-sm rounded-xl px-4 py-3 max-w-md w-full">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => router.push('/undead-feast')}
            className="mt-1 w-full px-3 sm:px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold"
          >
            返回「亡靈盛宴」大廳
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return null
  }

  const participants = game.participants || []

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6"
      style={{
        backgroundImage: "url('/undead-feast-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/undead-feast')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-100 border border-slate-700 shadow-md"
          >
            ← 返回「亡靈盛宴」大廳
          </button>

          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-yellow-300/80 tracking-wide">
              房間代碼
            </div>
            <div className="font-mono text-sm sm:text-lg text-yellow-100 drop-shadow-[0_0_10px_rgba(0,0,0,0.7)]">
              {roomId}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 mb-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.45),_transparent_70%)]" />
            <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.5),_transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent tracking-wide">
                亡靈盛宴房間大廳
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                等待所有玩家加入後，由房主按下「開始遊戲」，大家會自動看到自己的詞與身分。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-slate-300">
              <div className="mb-1">
                目前人數：
                <span className="font-semibold text-yellow-300 ml-1">
                  {participants.length} 人
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400">
                建議 4–8 人一起遊玩
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-3 tracking-wide">
              玩家列表
            </h2>
            {participants.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400">尚無玩家加入。</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border ${
                      p.id === pid ? 'border-yellow-400/80 shadow-[0_0_0_1px_rgba(250,204,21,0.4)]' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-slate-50 truncate">{p.name}</span>
                      {p.id === pid && (
                        <span className="text-[10px] sm:text-xs text-yellow-300 flex-shrink-0">
                          （你）
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 flex-shrink-0">
                      {p.isHost ? '房主' : '玩家'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-md">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-2 tracking-wide">
                房間資訊
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mb-2">
                請將房間代碼分享給所有玩家，讓他們在「亡靈盛宴」大廳輸入代碼加入。
              </p>
              <div className="bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 shadow-inner">
                <div className="text-[11px] sm:text-xs text-slate-400 mb-1">房間代碼</div>
                <div className="font-mono text-sm sm:text-base text-slate-50 tracking-[0.18em]">
                  {roomId}
                </div>
              </div>
            </div>

            <div className="mt-auto">
              {isHost ? (
                <>
                  <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 mb-2">
                    <input
                      type="checkbox"
                      checked={advancedMode}
                      onChange={(e) => setAdvancedMode(e.target.checked)}
                      className="accent-yellow-400"
                    />
                    啟用進階規則（難題牌）
                  </label>
                  {advancedMode && (
                    <div className="mb-2 rounded-lg border border-slate-700 bg-slate-800/60 p-2">
                      <div className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                        難題牌題庫（可自訂新增/刪除啟用項）
                      </div>
                      <div className="space-y-1.5">
                        {ALL_UNDEAD_CHALLENGE_KEYS.map((key) => (
                          <label key={key} className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-200">
                            <input
                              type="checkbox"
                              checked={enabledChallengeKeys.includes(key)}
                              onChange={() => toggleChallengeKey(key)}
                              className="accent-yellow-400"
                            />
                            {getChallengeLabel(key) ?? key}
                          </label>
                        ))}
                      </div>
                      <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
                        目前啟用：{enabledChallengeKeys.length} 張
                      </div>
                      <div className="mt-2 border-t border-slate-700 pt-2">
                        <div className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                          自訂文字規則卡（僅提醒，不做系統驗證）
                        </div>
                        <div className="flex gap-1.5 mb-1.5">
                          <input
                            value={customChallengeInput}
                            onChange={(e) => setCustomChallengeInput(e.target.value)}
                            placeholder="例如：不能使用食物相關詞"
                            className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[11px] sm:text-xs"
                          />
                          <button
                            type="button"
                            onClick={addCustomChallenge}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] sm:text-xs"
                          >
                            新增
                          </button>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-auto">
                          {customChallenges.length === 0 ? (
                            <div className="text-[10px] sm:text-[11px] text-slate-500">尚未新增自訂規則</div>
                          ) : (
                            customChallenges.map((text) => (
                              <div key={text} className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                                <span className="text-slate-200 truncate">{text}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomChallenge(text)}
                                  className="text-rose-300 hover:text-rose-200"
                                >
                                  刪除
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleStartGame}
                    disabled={
                      isStarting ||
                      participants.length < 4 ||
                      participants.length > 8 ||
                      (advancedMode && enabledChallengeKeys.length === 0)
                    }
                    className="mt-2 w-full px-3 sm:px-4 py-2.5 rounded-lg bg-gradient-to-b from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-slate-500 disabled:via-slate-500 disabled:to-slate-500 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm sm:text-base shadow-[0_10px_26px_rgba(0,0,0,0.9)] border border-yellow-300/80 transition-all"
                  >
                    {isStarting
                      ? '開始中...'
                      : participants.length < 4
                      ? '至少需要 4 位玩家'
                      : participants.length > 8
                      ? '最多 8 位玩家'
                      : advancedMode && enabledChallengeKeys.length === 0
                      ? '進階規則至少要選 1 張難題牌'
                      : '開始遊戲'}
                  </button>
                </>
              ) : (
                <div className="mt-2 text-[11px] sm:text-xs text-slate-300">
                  等待房主按下「開始遊戲」，開始後會自動顯示你的詞與身分。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

