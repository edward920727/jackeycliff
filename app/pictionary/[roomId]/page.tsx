'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { PictionaryGameData, PictionaryWinMode } from '@/types/pictionary'
import type { PictionarySnapshotMeta } from '@/lib/pictionary/firestore'
import { PictionaryConnectionBadge } from '@/lib/pictionary/ConnectionBadge'
import {
  CUSTOM_WORD_BANK_ID,
  DEFAULT_WORD_BANK_ID,
  WORD_BANK_OPTIONS,
  parseCustomWordBankInput,
} from '@/lib/pictionary/wordBanks'
import { useNavigatorOnline } from '@/lib/pictionary/useNavigatorOnline'
import {
  createPictionaryRoom,
  formatPictionaryFirestoreError,
  getPictionaryGame,
  joinPictionaryRoom,
  startPictionaryGame,
  subscribeToPictionaryGame,
} from '@/lib/pictionary/firestore'
import type { SavedCustomBank } from '@/lib/pictionary/savedCustomBanks'
import {
  deleteSavedCustomBank,
  getSavedCustomBank,
  listSavedCustomBanks,
  upsertSavedCustomBank,
} from '@/lib/pictionary/savedCustomBanks'
import { pictionaryBackgroundStyle } from '@/lib/pictionary/constants'

const CUSTOM_WORD_DRAFT_KEY = 'pictionary_custom_word_draft'

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
  const [customWordText, setCustomWordText] = useState('')
  const [savedBanks, setSavedBanks] = useState<SavedCustomBank[]>([])
  const [saveBankName, setSaveBankName] = useState('')
  const [selectedSavedId, setSelectedSavedId] = useState('')

  const navigatorOnline = useNavigatorOnline()

  function refreshSavedBanks() {
    setSavedBanks(listSavedCustomBanks())
  }

  const parsedCustomWords = useMemo(
    () => parseCustomWordBankInput(customWordText),
    [customWordText]
  )

  useEffect(() => {
    try {
      const s = localStorage.getItem(CUSTOM_WORD_DRAFT_KEY)
      if (s) setCustomWordText(s)
    } catch {
      /* ignore */
    }
    refreshSavedBanks()
  }, [])

  function updateCustomDraft(value: string) {
    setCustomWordText(value)
    try {
      localStorage.setItem(CUSTOM_WORD_DRAFT_KEY, value)
    } catch {
      /* ignore */
    }
  }

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
        ...(wordBankId === CUSTOM_WORD_BANK_ID ? { customWordBankText: customWordText } : {}),
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
                {wordBankId === CUSTOM_WORD_BANK_ID ? (
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    <span className="text-gray-400">自訂詞彙</span>
                    <textarea
                      value={customWordText}
                      onChange={(e) => updateCustomDraft(e.target.value)}
                      rows={8}
                      placeholder={`每行一詞，或用逗號、分號、頓號分隔
例如：
珍珠奶茶
貓咪
彩虹`}
                      className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm resize-y min-h-[8rem]"
                    />
                    <span className="text-xs text-gray-500">
                      已解析 {parsedCustomWords.length} 個不重複詞（至少 3、最多 500；單詞最長 40 字）
                    </span>
                    <div className="mt-3 space-y-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                      <p className="text-xs font-medium text-gray-400">本機儲存（僅此瀏覽器）</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-xs text-gray-500">儲存為（同名會覆蓋詞彙）</span>
                          <input
                            type="text"
                            value={saveBankName}
                            onChange={(e) => setSaveBankName(e.target.value)}
                            maxLength={32}
                            placeholder="題庫名稱"
                            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const r = upsertSavedCustomBank(saveBankName, parsedCustomWords)
                            if (!r.ok) {
                              alert(r.error)
                              return
                            }
                            refreshSavedBanks()
                            setSaveBankName('')
                          }}
                          className="rounded-lg border border-rose-700/80 bg-rose-950/50 px-3 py-2 text-sm text-rose-100 hover:bg-rose-900/50"
                        >
                          儲存題庫
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-xs text-gray-500">載入已儲存</span>
                          <select
                            value={selectedSavedId}
                            onChange={(e) => setSelectedSavedId(e.target.value)}
                            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
                          >
                            <option value="">— 選擇題庫 —</option>
                            {savedBanks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}（{b.words.length} 詞）
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedSavedId) return
                            const b = getSavedCustomBank(selectedSavedId)
                            if (!b) return
                            updateCustomDraft(b.words.join('\n'))
                          }}
                          disabled={!selectedSavedId}
                          className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
                        >
                          載入至編輯區
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedSavedId) return
                            if (!window.confirm('確定刪除此儲存題庫？')) return
                            deleteSavedCustomBank(selectedSavedId)
                            setSelectedSavedId('')
                            refreshSavedBanks()
                          }}
                          disabled={!selectedSavedId}
                          className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-rose-300 disabled:opacity-50"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={
                isStarting ||
                game.participants.length < 2 ||
                (wordBankId === CUSTOM_WORD_BANK_ID && parsedCustomWords.length < 3)
              }
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 px-4 py-2 font-semibold"
            >
              {game.participants.length < 2
                ? '至少需要 2 位玩家'
                : wordBankId === CUSTOM_WORD_BANK_ID && parsedCustomWords.length < 3
                  ? `自訂題庫至少 3 個詞（目前 ${parsedCustomWords.length}）`
                  : isStarting
                    ? '開始中...'
                    : '開始遊戲'}
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

