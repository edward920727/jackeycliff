'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'orange' | 'emerald' | 'ghost'

/** WePlay 風：圓潤糖果按鈕、高飽和漸層、底部加厚陰影 */
const variantClass: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-fuchsia-500 to-violet-600 text-white border-2 border-white/30 shadow-[0_6px_0_#5b21b6,inset_0_2px_0_rgba(255,255,255,0.35)] hover:from-fuchsia-400 hover:to-violet-500',
  secondary:
    'bg-gradient-to-b from-white to-violet-50 text-violet-700 border-2 border-violet-200/90 shadow-[0_5px_0_#ddd6fe,inset_0_1px_0_rgba(255,255,255,0.9)] hover:to-white',
  orange:
    'bg-gradient-to-b from-orange-400 to-orange-600 text-white border-2 border-white/25 shadow-[0_6px_0_#c2410c,inset_0_2px_0_rgba(255,255,255,0.3)] hover:from-orange-300',
  emerald:
    'bg-gradient-to-b from-emerald-400 to-teal-600 text-white border-2 border-white/25 shadow-[0_6px_0_#0f766e,inset_0_2px_0_rgba(255,255,255,0.25)] hover:from-emerald-300',
  ghost:
    'bg-violet-50/90 text-violet-700 border-2 border-violet-200/80 shadow-[0_3px_0_#e9d5ff] hover:bg-white',
}

export type GameButtonProps = HTMLMotionProps<'button'> & {
  variant?: Variant
}

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(function GameButton(
  { className = '', variant = 'primary', children, disabled, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96, y: 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={[
        'w-full rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold leading-snug tracking-wide sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs md:rounded-2xl md:py-3 md:text-sm',
        'active:shadow-[inset_0_5px_14px_rgba(0,0,0,0.22)] disabled:pointer-events-none disabled:opacity-45',
        variantClass[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

GameButton.displayName = 'GameButton'
