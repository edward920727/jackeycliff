'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { subscribeMonopolyRoomsList, type MonopolyRoomListItem } from '@/lib/monopoly/multiplayerFirestore'
import { GO_BONUS, MONOPOLY_RENT_MULTIPLIER } from '@/lib/monopoly/types'

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function sanitizeRoomCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export default function MonopolyLobby() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [rooms, setRooms] = useState<MonopolyRoomListItem[]>([])
  const [roomsErr, setRoomsErr] = useState<string | null>(null)

  const finalCode = useMemo(() => sanitizeRoomCode(roomCode), [roomCode])

  const goRoom = useCallback(
    (code: string) => {
      const c = sanitizeRoomCode(code)
      if (!c) return
      const n = name.trim()
      router.push(n ? `/monopoly/${c}?name=${encodeURIComponent(n)}` : `/monopoly/${c}`)
    },
    [router, name],
  )

  const onCreate = useCallback(() => goRoom(makeRoomCode()), [goRoom])
  const onJoin = useCallback(() => goRoom(finalCode), [goRoom, finalCode])

  useEffect(() => {
    setRoomsErr(null)
    const unsub = subscribeMonopolyRoomsList(
      (rs) => setRooms(rs),
      (e) => setRoomsErr(e instanceof Error ? e.message : '讀取房間列表失敗'),
      18,
    )
    return () => unsub()
  }, [])

  return (
    <div className="weplay-plane-window-bg relative flex min-h-[100dvh] flex-col overflow-x-hidden font-game text-slate-800 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.18)_45%,rgba(255,255,255,0.35)_100%)]"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto flex w-full max-w-[62rem] flex-1 flex-col justify-center px-3 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-white/70 bg-white/85 p-4 shadow-[0_28px_90px_rgba(2,6,23,0.22)] backdrop-blur-xl sm:p-7"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fuchsia-500">Online Room</p>
              <h1 className="mt-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-2xl font-extrabold tracking-wide text-transparent sm:text-3xl">
                大富翁 · 加入房間
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                輸入房間碼即可同步遊玩。支援手機與電腦多開測試。
              </p>
            </div>
            <a
              href="/"
              className="inline-flex w-fit items-center justify-center rounded-2xl bg-gradient-to-b from-white to-violet-50 px-4 py-2 text-sm font-extrabold tracking-wide text-violet-600 shadow-[0_6px_0_#ddd6fe] ring-2 ring-violet-200/80"
            >
              ← 大廳
            </a>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wide text-violet-700">
                你的暱稱（選填）
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Jackey"
                className="mt-2 w-full rounded-2xl border-2 border-white/70 bg-white/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-inner outline-none focus:border-violet-200"
              />
              <p className="mt-2 text-[11px] font-semibold text-slate-600">
                之後可用來顯示在房間上方（下一步我也可以幫你串到玩家名單）。
              </p>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wide text-violet-700">房間碼</label>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="例如：AB12CD"
                className="mt-2 w-full rounded-2xl border-2 border-white/70 bg-white/95 px-4 py-3 font-mono text-base font-extrabold tracking-widest text-violet-700 shadow-inner outline-none focus:border-violet-200"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-600">將自動轉大寫並移除符號</p>
                <p className="text-[11px] font-extrabold text-slate-700">
                  {finalCode ? `→ ${finalCode}` : '\u00A0'}
                </p>
              </div>
            </div>

            {/* 規則卡 */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700">規則</p>
              <ul className="mt-2 space-y-1 text-[12px] font-semibold text-slate-700">
                <li>
                  - 經過起點 <span className="font-black text-amber-700">+${GO_BONUS}</span>
                </li>
                <li>
                  - 同色組買齊（未蓋房）租金 <span className="font-black text-amber-700">×{MONOPOLY_RENT_MULTIPLIER}</span>
                </li>
                <li>- 壟斷後可蓋房（平均蓋）、先滿四戶再升旅館</li>
                <li>- 有建物後租金依「建物租金表」計算</li>
                <li>- 破產：資產充公、建物清空</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-white px-5 py-4 text-left shadow-[0_10px_0_#a7f3d0,0_22px_50px_rgba(16,185,129,0.18)]"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Create</p>
              <p className="mt-0.5 text-lg font-black text-emerald-800">建立新房間</p>
              <p className="mt-1 text-[12px] font-semibold text-emerald-700/90">自動產生房間碼並進入</p>
            </button>
            <button
              type="button"
              onClick={onJoin}
              disabled={!finalCode}
              className="rounded-2xl border-2 border-violet-200/90 bg-gradient-to-b from-violet-50 to-white px-5 py-4 text-left shadow-[0_10px_0_#ddd6fe,0_22px_50px_rgba(109,40,217,0.14)] disabled:opacity-50"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700">Join</p>
              <p className="mt-0.5 text-lg font-black text-violet-800">加入房間</p>
              <p className="mt-1 text-[12px] font-semibold text-violet-700/90">輸入房間碼後進入同步遊玩</p>
            </button>
          </div>

          {/* 房間列表 */}
          <div className="mt-6 rounded-3xl border-2 border-white/70 bg-white/75 p-4 backdrop-blur-md">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">Rooms</p>
                <p className="mt-0.5 text-base font-black text-slate-800">房間列表</p>
              </div>
              <p className="text-[11px] font-semibold text-slate-600">顯示最近更新的房間</p>
            </div>

            {roomsErr && (
              <div className="mt-3 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {roomsErr}
              </div>
            )}

            {!roomsErr && rooms.length === 0 && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-600">
                目前沒有可顯示的房間，先建立一個吧。
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rooms.map((r) => {
                const alive = r.players.filter((p) => !p.bankrupt)
                const title = alive.length ? alive.map((p) => p.name).join('、') : '（無玩家）'
                return (
                  <button
                    key={r.roomId}
                    type="button"
                    onClick={() => goRoom(r.roomId)}
                    className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-left shadow-sm transition hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-sm font-black tracking-widest text-violet-700">{r.roomId}</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                        {r.phase}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-700">{title}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">版本 #{r.version}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

