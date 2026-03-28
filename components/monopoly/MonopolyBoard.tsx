'use client'

import { LayoutGroup, motion } from 'framer-motion'
import { BOARD } from '@/lib/monopoly/board'
import { computeRent } from '@/lib/monopoly/engine'
import type { GameState, PlayerState } from '@/lib/monopoly/types'
import { cellSurfaceClass } from './monopolyStyles'
import { PlayerToken } from './PlayerToken'

const PLAYER_ACCENTS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24']

function shortLabel(name: string): string {
  if (name.length <= 5) return name
  return name.slice(0, 5) + '…'
}

type Props = {
  grid: (number | null)[][]
  state: GameState
  tokensOnCell: (idx: number) => PlayerState[]
  ownerName: (ownerId: number | null) => string | null
}

export function MonopolyBoard({ grid, state, tokensOnCell, ownerName }: Props) {
  return (
    <div className="relative mx-auto flex w-full max-w-full flex-col items-center justify-center">
      {/* 桌面投影（不參與 3D，模擬棋盤落在桌上的陰影） */}
      <div
        className="pointer-events-none absolute bottom-[6%] left-1/2 z-0 h-20 w-[min(92%,560px)] -translate-x-1/2 rounded-[100%] bg-violet-950/35 blur-2xl"
        style={{ transform: 'translateX(-50%) scaleY(0.35)' }}
        aria-hidden
      />

      {/* 透視舞台 */}
      <div className="relative z-[1] w-full [perspective:1400px] [perspective-origin:50%_30%] sm:[perspective:1600px]">
        <motion.div
          initial={{ rotateX: 48, rotateZ: -3, rotateY: 5, opacity: 0.85 }}
          animate={{ rotateX: 52, rotateZ: -3, rotateY: 5, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-max max-w-none origin-center [transform-style:preserve-3d]"
        >
          {/* 棋盤底下的發光（隨平面傾斜） */}
          <div
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="h-[82%] w-[78%] rounded-[50%] opacity-95 blur-[0.5px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(244,114,182,0.35) 0%, rgba(167,139,250,0.22) 38%, rgba(253,224,71,0.12) 58%, transparent 74%)',
              }}
            />
            <div
              className="absolute h-[74%] w-[70%] rounded-[50%]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 42%, transparent 58%)',
              }}
            />
            <div
              className="absolute h-[88%] w-[84%] rounded-[50%] border border-white/40 shadow-[0_0_70px_rgba(192,132,252,0.35)]"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 50%, rgba(109,40,217,0.12) 100%)',
              }}
            />
          </div>

          <div
            className="relative z-[1] drop-shadow-[0_25px_35px_rgba(30,20,50,0.45)]"
            style={{ transform: 'translateZ(0)' }}
          >
            <LayoutGroup>
              <div
                className="relative z-[1] mx-auto inline-grid gap-2 p-1.5 sm:gap-2.5 sm:p-2"
                style={{
                  gridTemplateColumns: 'repeat(6, minmax(76px, 1fr))',
                  gridTemplateRows: 'repeat(8, minmax(70px, auto))',
                  transformStyle: 'preserve-3d',
                }}
              >
                {grid.map((row, ri) =>
                  row.map((cellIdx, ci) => {
                    if (cellIdx == null) {
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className="min-h-[70px] min-w-[76px] rounded-2xl border-2 border-white/50 bg-gradient-to-br from-white/50 to-violet-100/40 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)] backdrop-blur-sm [transform:translateZ(0)] sm:min-h-[76px] sm:min-w-[84px]"
                          style={{ gridColumn: ci + 1, gridRow: ri + 1 }}
                        />
                      )
                    }

                    const cell = BOARD[cellIdx]
                    const owner = state.owners[cellIdx]
                    const rent =
                      cell.kind === 'property' || cell.kind === 'railroad'
                        ? computeRent(cellIdx, state)
                        : null
                    const surface = cellSurfaceClass(cell)

                    return (
                      <motion.div
                        key={cellIdx}
                        whileHover={{
                          scale: 1.06,
                          z: 12,
                          boxShadow:
                            '0 0 0 3px rgba(232,121,249,0.65), inset 0 2px 6px rgba(255,255,255,0.25), 0 18px 32px rgba(109,40,217,0.4)',
                        }}
                        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                        className={`${surface} flex min-h-[70px] min-w-[76px] cursor-default flex-col justify-between p-1.5 text-[10px] leading-tight sm:min-h-[76px] sm:min-w-[84px] sm:p-2 sm:text-[11px] [transform-style:preserve-3d] [will-change:transform]`}
                        style={{
                          gridColumn: ci + 1,
                          gridRow: ri + 1,
                          transform: 'translateZ(2px)',
                        }}
                      >
                        <span className="font-semibold tracking-wide text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                          {shortLabel(cell.name)}
                        </span>
                        {(cell.kind === 'property' || cell.kind === 'railroad') && (
                          <span className="text-[9px] font-medium tracking-wider text-white/75 sm:text-[10px]">
                            ${cell.price}
                          </span>
                        )}
                        {owner != null && (
                          <span
                            className="truncate text-[9px] tracking-wide text-amber-100/90 sm:text-[10px]"
                            title={ownerName(owner)!}
                          >
                            ♦{ownerName(owner)}
                          </span>
                        )}
                        {rent != null && rent > 0 && owner != null && (
                          <span className="text-[8px] tracking-wide text-zinc-200/90 sm:text-[9px]">租${rent}</span>
                        )}
                        <div
                          className={`absolute bottom-1 right-1 z-[3] flex max-w-[92%] flex-wrap items-end justify-end gap-0.5 [transform-style:preserve-3d] ${
                            tokensOnCell(cellIdx).length > 2 ? 'origin-bottom-right scale-[0.88]' : ''
                          }`}
                          style={{ transform: 'translateZ(8px)' }}
                        >
                          {tokensOnCell(cellIdx).map((p) => (
                            <PlayerToken
                              key={p.id}
                              playerId={p.id}
                              name={p.name}
                              accent={PLAYER_ACCENTS[p.id % PLAYER_ACCENTS.length]}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </LayoutGroup>
          </div>
        </motion.div>
      </div>

      <p className="mt-4 max-w-md text-center text-[10px] font-medium tracking-wide text-white/70 sm:text-xs">
        2.5D 透視棋盤 · 拖曳可檢視完整版面（手機）
      </p>
    </div>
  )
}
