'use client'

import type { PictionarySnapshotMeta } from '@/lib/pictionary/firestore'

type Props = {
  navigatorOnline: boolean
  fsMeta: PictionarySnapshotMeta | null
}

/** Firestore 快照 metadata + 瀏覽器 online／offline */
export function PictionaryConnectionBadge({ navigatorOnline, fsMeta }: Props) {
  if (!navigatorOnline) {
    return (
      <span className="rounded-full border border-amber-700/80 bg-amber-950/60 px-2 py-0.5 text-[10px] sm:text-xs text-amber-200">
        離線（讀取可能為快取）
      </span>
    )
  }
  if (fsMeta == null) {
    return (
      <span className="rounded-full border border-gray-600 bg-gray-900/80 px-2 py-0.5 text-[10px] sm:text-xs text-gray-300">
        連線中…
      </span>
    )
  }
  if (fsMeta.hasPendingWrites) {
    return (
      <span className="rounded-full border border-sky-700/80 bg-sky-950/50 px-2 py-0.5 text-[10px] sm:text-xs text-sky-200">
        同步中…
      </span>
    )
  }
  if (fsMeta.fromCache) {
    return (
      <span className="rounded-full border border-gray-600 bg-gray-900/80 px-2 py-0.5 text-[10px] sm:text-xs text-gray-300">
        已連線（快取）
      </span>
    )
  }
  return (
    <span className="rounded-full border border-emerald-800/80 bg-emerald-950/40 px-2 py-0.5 text-[10px] sm:text-xs text-emerald-200">
      已連線
    </span>
  )
}
