'use client'

import { motion } from 'framer-motion'

const PIP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8],
}

function clampPip(n: number) {
  return Math.min(6, Math.max(1, Math.round(n)))
}

function DieFace({ value, spinning }: { value: number; spinning: boolean }) {
  const v = clampPip(value)
  const mask = new Set(PIP[v])

  return (
    <motion.div
      className="relative aspect-square w-[min(38vw,10.5rem)] rounded-[1.35rem] border-[3px] border-white/50 bg-gradient-to-br from-white via-slate-50 to-slate-200/95 shadow-[0_14px_0_#64748b,0_24px_48px_rgba(15,23,42,0.45)] sm:w-[min(34vw,12rem)] sm:rounded-[1.5rem]"
      animate={
        spinning
          ? {
              rotate: [0, -22, 18, -14, 12, -8, 0],
              y: [0, -10, 6, -5, 3, 0],
              scale: [1, 1.04, 0.98, 1.02, 1],
            }
          : { rotate: 0, y: 0, scale: 1 }
      }
      transition={
        spinning
          ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 380, damping: 22 }
      }
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[5%] p-[11%]">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={
              mask.has(i)
                ? 'rounded-full bg-gradient-to-br from-slate-800 to-slate-950 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.35)]'
                : ''
            }
          />
        ))}
      </div>
    </motion.div>
  )
}

type Props = {
  d1: number
  d2: number
  spinning: boolean
  rollerName: string
}

export function FullScreenDiceOverlay({ d1, d2, spinning, rollerName }: Props) {
  const sum = d1 + d2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-slate-950/92 via-violet-950/94 to-slate-950/96 px-3 backdrop-blur-[2px] sm:gap-7"
      aria-live="polite"
      aria-modal="true"
      role="dialog"
    >
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[90vw] text-center text-[0.7rem] font-extrabold uppercase tracking-[0.35em] text-amber-200/90 sm:text-xs"
      >
        {rollerName}
        <span className="mt-1 block tracking-[0.15em] text-violet-200/95 normal-case">
          {spinning ? '擲骰中…' : '結果'}
        </span>
      </motion.p>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-10">
        <DieFace value={d1} spinning={spinning} />
        <span className="select-none text-3xl font-black text-white/35 sm:text-4xl">+</span>
        <DieFace value={d2} spinning={spinning} />
      </div>

      <motion.p
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: spinning ? 0 : 0.08, type: 'spring', stiffness: 400, damping: 24 }}
        className="font-mono text-[clamp(1.35rem,5.5vw,2rem)] font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] sm:text-[clamp(1.5rem,4vw,2.25rem)]"
      >
        {d1} + {d2} = {sum}
      </motion.p>
    </motion.div>
  )
}
