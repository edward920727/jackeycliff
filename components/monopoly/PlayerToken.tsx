'use client'

import { motion } from 'framer-motion'

const TOKEN_ICONS = ['🎩', '🚗', '🐕', '⛵'] as const

type Props = {
  playerId: number
  name: string
  accent: string
}

/** 立體圓盤棋子：上亮下暗漸層 + 落在格面的橢圓投影（隨 layout 移動） */
export function PlayerToken({ playerId, name, accent }: Props) {
  const icon = TOKEN_ICONS[playerId % TOKEN_ICONS.length]

  return (
    <motion.div
      layoutId={`monopoly-token-${playerId}`}
      title={name}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.65 }}
      className="relative z-[2] flex flex-col items-center justify-end"
    >
      <div
        className="pointer-events-none absolute -bottom-px left-1/2 z-0 h-[6px] w-[145%] max-w-[34px] -translate-x-1/2 rounded-[100%] bg-black/50 blur-[2.5px]"
        aria-hidden
      />
      <div
        className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white text-[15px] leading-none shadow-lg ring-2 ring-violet-300/50 sm:h-9 sm:w-9 sm:text-[17px]"
        style={{
          background: `linear-gradient(155deg, ${accent} 0%, ${accent}dd 38%, ${accent}88 100%)`,
          boxShadow:
            '0 4px 8px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.25)',
        }}
      >
        <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] filter">{icon}</span>
      </div>
    </motion.div>
  )
}
