'use client'

import { useRouter } from 'next/navigation'

export default function MuffinTimeRulesPage() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen p-4 sm:p-8 bg-black/80"
      style={{
        backgroundImage: "url('/lobby-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-2xl mx-auto bg-amber-950/90 border border-amber-800/60 rounded-2xl p-6 sm:p-8 text-amber-50">
        <button
          onClick={() => router.push('/muffin-time')}
          className="mb-6 px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 text-sm font-semibold border border-amber-700"
        >
          ← 返回吸爆鬆餅
        </button>

        <h1 className="text-2xl font-bold text-amber-100 mb-4">吸爆鬆餅（線上簡化版）規則</h1>

        <p className="text-sm text-amber-200/90 mb-6 leading-relaxed">
          本頁為網頁版自訂規則與自創牌庫，與實體桌遊《Muffin Time》官方規則／牌面無關，僅供同樂。
        </p>

        <ul className="space-y-3 text-sm text-amber-100/95 leading-relaxed list-disc pl-5">
          <li>2–8 人。開局每人抽 3 張，由房主先手。</li>
          <li>
            回合開始可選擇在面前放置最多 3 張陷阱（可覆蓋舊陷阱）；接著選擇「抽 1 張」或打出一張行動牌。
          </li>
          <li>陷阱會在符合條件時自動觸發（例如：自己抽牌、任何人打出藍色行動牌、手牌達 7 張以上等）。</li>
          <li>
            部分行動會指定「下一位玩家丟牌」——該玩家可先打出反擊牌抵消，或選擇承受並隨機丟牌。
          </li>
          <li>
            當你手牌<strong>剛好 10 張</strong>時，必須按下「吸爆鬆餅！」；若到你下一回合開始時仍為 10 張，你獲勝。
          </li>
          <li>另有極少數彩蛋牌可立即獲勝。</li>
        </ul>
      </div>
    </div>
  )
}
