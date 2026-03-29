import type { BoardCellDef } from '@/lib/monopoly/types'

/** 立體積木格：內外陰影 + 底部加厚邊框；地產用漸層、略降飽和 */
export function cellSurfaceClass(cell: BoardCellDef): string {
  const base =
    'relative rounded-lg border-x border-t border-white/12 shadow-[inset_0_2px_5px_rgba(255,255,255,0.14),inset_0_-4px_10px_rgba(0,0,0,0.42)] drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)] border-b-[5px]'

  if (cell.kind === 'property') {
    const g = cell.group
    const byGroup: Record<string, string> = {
      brown:
        `${base} bg-gradient-to-br from-amber-800/88 via-amber-900/92 to-amber-950 border-b-amber-950/95 border-amber-900/40`,
      light_blue:
        `${base} bg-gradient-to-br from-sky-700/82 via-sky-800/88 to-sky-950 border-b-sky-950/90 border-sky-700/35`,
      pink:
        `${base} bg-gradient-to-br from-rose-700/78 via-pink-800/85 to-pink-950 border-b-pink-950/90 border-pink-800/35`,
      orange:
        `${base} bg-gradient-to-br from-orange-700/78 via-orange-800/85 to-orange-950 border-b-orange-950/90 border-orange-800/35`,
      red:
        `${base} bg-gradient-to-br from-rose-700/75 via-rose-800/82 to-rose-950 border-b-rose-950/90 border-rose-800/35`,
      yellow:
        `${base} bg-gradient-to-br from-amber-600/72 via-yellow-800/80 to-yellow-950 border-b-yellow-950/90 border-yellow-800/35`,
      green:
        `${base} bg-gradient-to-br from-emerald-700/78 via-emerald-800/85 to-emerald-950 border-b-emerald-950/90 border-emerald-800/35`,
      dark_blue:
        `${base} bg-gradient-to-br from-blue-800/80 via-blue-900/88 to-blue-950 border-b-blue-950/90 border-blue-800/40`,
    }
    return byGroup[g] ?? `${base} bg-gradient-to-br from-zinc-700 to-zinc-900 border-b-zinc-950`
  }

  if (cell.kind === 'railroad')
    return `${base} bg-gradient-to-br from-slate-600/85 via-slate-700/90 to-slate-900 border-b-slate-950/90 border-slate-600/30`
  if (cell.kind === 'utility')
    return `${base} bg-gradient-to-br from-sky-600/80 via-sky-800/88 to-sky-950 border-b-sky-950/90 border-sky-700/35`
  if (cell.kind === 'tax')
    return `${base} bg-gradient-to-br from-red-900/80 via-red-950/90 to-stone-950 border-b-red-950/90 border-red-900/40`
  if (cell.kind === 'chance')
    return `${base} bg-gradient-to-br from-violet-700/72 via-violet-800/85 to-violet-950 border-b-violet-950/90 border-violet-700/35`
  if (cell.kind === 'chest')
    return `${base} bg-gradient-to-br from-teal-700/72 via-teal-800/85 to-teal-950 border-b-teal-950/90 border-teal-700/35`
  if (cell.kind === 'goto_jail')
    return `${base} bg-gradient-to-br from-neutral-800/90 to-neutral-950 border-b-neutral-950 border-neutral-700/40`
  if (cell.kind === 'jail')
    return `${base} bg-gradient-to-br from-stone-700/85 to-stone-900 border-b-stone-950 border-stone-600/35`
  if (cell.kind === 'parking')
    return `${base} bg-gradient-to-br from-emerald-800/75 via-emerald-900/88 to-emerald-950 border-b-emerald-950/90 border-emerald-800/35`
  if (cell.kind === 'go')
    return `${base} bg-gradient-to-br from-amber-700/70 via-amber-800/85 to-amber-950 border-b-amber-950/90 border-amber-800/35`
  return `${base} bg-gradient-to-br from-zinc-700/88 to-zinc-900 border-b-zinc-950 border-zinc-600/35`
}
