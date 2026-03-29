'use client'

import type { Dispatch } from 'react'
import { motion } from 'framer-motion'
import { BOARD } from '@/lib/monopoly/board'
import type { GameAction } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import { GO_BONUS, MONOPOLY_RENT_MULTIPLIER } from '@/lib/monopoly/types'
import { GameButton } from './GameButton'

const PLAYER_ACCENTS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24']

function weplayPanel(extra?: string) {
  return [
    'rounded-3xl border-2 border-white/90 bg-white/90 p-4 text-slate-700 shadow-[0_12px_40px_rgba(109,40,217,0.18)] backdrop-blur-xl',
    extra ?? '',
  ].join(' ')
}

type Props = {
  names: string[]
  setNames: (n: string[]) => void
  playerCount: number
  setPlayerCount: (n: number) => void
  state: GameState
  dispatch: Dispatch<GameAction>
  startGame: () => void
}

export function ControlPanel({
  names,
  setNames,
  playerCount,
  setPlayerCount,
  state,
  dispatch,
  startGame,
}: Props) {
  const current = state.players[state.currentPlayer]

  return (
    <aside className="space-y-4 tracking-wide">
      {state.phase === 'gameover' && state.winnerId != null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={weplayPanel(
            'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-center text-amber-950'
          )}
        >
          <p className="text-lg font-extrabold tracking-wide text-amber-800">
            🏆 {state.players[state.winnerId]?.name} 獲勝！
          </p>
          <GameButton type="button" variant="primary" onClick={startGame} className="mt-4">
            再開一局
          </GameButton>
        </motion.div>
      )}

      <div className={weplayPanel()}>
        <h2 className="mb-3 text-sm font-extrabold tracking-widest text-violet-600">開局設定</h2>
        <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500">人數</label>
        <select
          value={playerCount}
          onChange={(e) => setPlayerCount(Number(e.target.value))}
          className="mb-3 w-full rounded-2xl border-2 border-violet-100 bg-violet-50/80 px-3 py-2.5 text-sm font-medium tracking-wide text-slate-800 shadow-inner focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
        >
          <option value={2}>2 人</option>
          <option value={3}>3 人</option>
          <option value={4}>4 人</option>
        </select>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} className="mb-2 flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-md ring-2 ring-violet-200/80"
              style={{ backgroundColor: PLAYER_ACCENTS[i % PLAYER_ACCENTS.length] }}
            />
            <input
              value={names[i] ?? ''}
              onChange={(e) => {
                const next = [...names]
                next[i] = e.target.value
                setNames(next)
              }}
              className="flex-1 rounded-2xl border-2 border-violet-100 bg-white px-3 py-2 text-sm font-medium tracking-wide text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              placeholder={`玩家 ${i + 1}`}
            />
          </div>
        ))}
        <GameButton type="button" variant="secondary" onClick={startGame} className="mt-3">
          重新開始
        </GameButton>
      </div>

      <div className={weplayPanel()}>
        <h2 className="mb-2 text-sm font-extrabold tracking-widest text-violet-600">狀態</h2>
        <ul className="space-y-2.5 text-sm">
          {state.players.map((p) => (
            <li
              key={p.id}
              className={`flex justify-between gap-2 font-medium tracking-wide ${p.bankrupt ? 'opacity-40 line-through' : ''}`}
            >
              <span className="flex items-center gap-2 text-slate-700">
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white shadow ring-1 ring-violet-200"
                  style={{ backgroundColor: PLAYER_ACCENTS[p.id % PLAYER_ACCENTS.length] }}
                />
                {p.name}
                {p.inJail && <span className="text-xs font-bold text-orange-500">🔒 監獄</span>}
              </span>
              <span className="font-mono text-base font-bold tracking-tight text-violet-600">${p.money}</span>
            </li>
          ))}
        </ul>
        {current && !current.bankrupt && state.phase !== 'gameover' && (
          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-500">
            回合：<span className="text-violet-600">{current.name}</span>
          </p>
        )}
        {state.dice && (
          <p className="mt-2 font-mono text-sm font-bold tracking-wide text-slate-800">
            骰子：{state.dice[0]} + {state.dice[1]} = {state.dice[0] + state.dice[1]}
          </p>
        )}
        <p className="mt-3 border-t border-violet-100 pt-3 text-xs leading-relaxed tracking-wide text-slate-600">
          {state.lastMessage}
        </p>
      </div>

      {state.phase !== 'gameover' && current && !current.bankrupt && (
        <div className={`${weplayPanel()} space-y-2`}>
          {state.phase === 'roll' && (
            <>
              {current.inJail ? (
                <>
                  <GameButton
                    type="button"
                    variant="orange"
                    disabled={current.money < 50}
                    onClick={() => dispatch({ type: 'JAIL_PAY' })}
                  >
                    付 $50 出獄並擲骰
                  </GameButton>
                  <GameButton type="button" variant="primary" onClick={() => dispatch({ type: 'ROLL' })}>
                    擲骰（擲到雙數免費出獄）
                  </GameButton>
                </>
              ) : (
                <GameButton type="button" variant="primary" onClick={() => dispatch({ type: 'ROLL' })}>
                  🎲 擲骰
                </GameButton>
              )}
            </>
          )}
          {state.phase === 'buy_prompt' && (() => {
            const cell = BOARD[current.position]
            const price =
              cell.kind === 'property' || cell.kind === 'railroad' || cell.kind === 'utility'
                ? cell.price
                : 0
            return (
              <>
                <p className="mb-1 text-xs font-medium tracking-wide text-slate-600">
                  是否購買「{cell.name}」？（${price}）
                </p>
                <GameButton
                  type="button"
                  variant="emerald"
                  disabled={current.money < price}
                  onClick={() => dispatch({ type: 'BUY' })}
                >
                  購買
                </GameButton>
                <GameButton type="button" variant="ghost" onClick={() => dispatch({ type: 'SKIP_BUY' })}>
                  放棄
                </GameButton>
              </>
            )
          })()}
        </div>
      )}

      <p className="px-2 text-[10px] font-medium leading-relaxed tracking-wide text-white/75">
        規則摘要：經過起點領 {GO_BONUS}；同色一組買齊租金×{MONOPOLY_RENT_MULTIPLIER}；四條鐵路租金遞增；兩家公共事業依骰子點數收租；停在他人資產須付租；破產者資產充公。
      </p>
    </aside>
  )
}
