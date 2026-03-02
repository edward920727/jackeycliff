'use client'

import { useRouter } from 'next/navigation'

export default function GameHub() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-black/70"
      style={{
        backgroundImage: "url('/lobby-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-3xl w-full mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          線上桌遊大廳
        </h1>
        <p className="text-center text-gray-400 mb-8 text-sm sm:text-base">
          選擇一款遊戲開始玩吧！
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 機密代號 */}
              <button
            onClick={() => router.push('/codenames')}
            className="group bg-gray-900/80 border border-gray-700 rounded-2xl p-4 sm:p-6 text-left hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white group-hover:text-blue-300">
                機密代號
              </h2>
              <span className="text-2xl">🕵️‍♂️</span>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              兩隊對抗、透過提示詞來猜出己方關鍵字的陣營猜詞遊戲。
            </p>
            <p className="text-xs text-gray-500">
              4–8 人適合｜支援自訂題庫、18 禁題庫
            </p>
              </button>

          {/* 阿瓦隆 */}
              <button
            onClick={() => router.push('/avalon')}
            className="group bg-gray-900/80 border border-gray-700 rounded-2xl p-4 sm:p-6 text-left hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white group-hover:text-emerald-300">
                阿瓦隆
              </h2>
              <span className="text-2xl">🏰</span>
            </div>
            <p className="text-sm text-gray-300 mb-2">
              好人與壞人陣營對抗，透過投票與發言找出隱藏的邪惡勢力。
            </p>
            <p className="text-xs text-gray-500">
              5–10 人適合｜支援線上房間、身分發牌、任務紀錄
            </p>
            </button>
        </div>
      </div>
    </div>
  )
}

