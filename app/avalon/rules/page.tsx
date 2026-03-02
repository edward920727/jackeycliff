'use client'

import { useRouter } from 'next/navigation'

export default function AvalonRulesPage() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6"
      style={{
        backgroundImage: "url('/avalon-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-3xl mx-auto bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-[1.75rem] shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.5),_transparent_70%)]" />
          <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,91,40,0.5),_transparent_70%)]" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => router.push('/avalon')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-yellow-900/60 shadow-md"
            >
              ← 返回阿瓦隆大廳
            </button>
            <div className="text-[11px] sm:text-xs text-stone-600">
              遊戲規則僅供參考，實際玩法可依你們習慣調整
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-900 via-amber-800 to-amber-600 bg-clip-text text-transparent tracking-wide mb-2">
              阿瓦隆遊戲規則概要
            </h1>
            <p className="text-xs sm:text-sm text-stone-700">
              阿瓦隆是一款隱藏身份、發言與推理的遊戲。玩家分成「正義陣營」與「邪惡陣營」，透過 5
              輪任務的成敗決定勝負。
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-900 tracking-wide">
              角色與視野
            </h2>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-stone-700">
              <li>
                <span className="font-semibold text-emerald-800">梅林 Merlin</span>：
                知道所有邪惡陣營玩家，但
                <span className="font-semibold">看不到莫德雷德</span>。
              </li>
              <li>
                <span className="font-semibold text-emerald-800">派西維爾 Percival</span>：
                在開局時看到兩個人，知道他們是
                <span className="font-semibold">「梅林／莫甘娜」</span>
                其中一人，但不知道誰是誰。
              </li>
              <li>
                <span className="font-semibold text-emerald-800">亞瑟的忠臣</span>：
                沒有特殊能力，只靠發言與投票。
              </li>
              <li>
                <span className="font-semibold text-rose-700">刺客 Assassin</span>：
                任務階段結束後若好人先拿到 3 次成功，可以嘗試刺殺梅林。
              </li>
              <li>
                <span className="font-semibold text-rose-700">莫甘娜 Morgana</span>：
                會偽裝成梅林，讓派西維爾看到兩個「可能的梅林」。
              </li>
              <li>
                <span className="font-semibold text-rose-700">莫德雷德 Mordred</span>：
                梅林看不到他，但其他壞人可以看到他。
              </li>
              <li>
                <span className="font-semibold text-rose-700">奧伯倫 Oberon</span>：
                自己看不到任何壞人，其他壞人也看不到他。
              </li>
              <li>
                <span className="font-semibold text-rose-700">莫德雷德的爪牙 Minion</span>：
                一般壞人，與刺客／莫甘娜／莫德雷德互相看見，但看不到奧伯倫。
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-900 tracking-wide">
              回合流程（三個階段）
            </h2>
            <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-stone-700">
              <li>
                <span className="font-semibold">隊長選人（Leader / PROPOSING）</span>：輪到的隊長選出本輪要出任務的隊伍。
              </li>
              <li>
                <span className="font-semibold">全體投票（VOTING）</span>：所有玩家對隊長提案投「贊成／反對」。多數贊成通過，否則換下一位隊長。
              </li>
              <li>
                <span className="font-semibold">任務執行（MISSION）</span>：被選上的玩家秘密投「成功／失敗」，視規則決定任務成功或失敗。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-900 tracking-wide">
              勝利條件
            </h2>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-stone-700">
              <li>
                <span className="font-semibold text-emerald-800">正義陣營</span>：先達成
                3 次任務成功，且之後
                <span className="font-semibold">刺客沒有刺中梅林</span>。
              </li>
              <li>
                <span className="font-semibold text-rose-700">邪惡陣營</span>
                ：先達成 3 次任務失敗，或在正義拿到 3 次成功後成功刺殺梅林。
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

