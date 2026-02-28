'use client'

import { useRouter } from 'next/navigation'

export default function RulesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-semibold"
        >
          ← 返回首頁
        </button>

        <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700/50">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            遊戲規則
          </h1>
          <p className="text-center text-gray-400 mb-8">Codenames 機密代號</p>

          <div className="space-y-6 text-gray-300">
            {/* 遊戲目標 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>遊戲目標</span>
              </h2>
              <p className="text-sm sm:text-base leading-relaxed">
                兩支隊伍（紅隊和藍隊）輪流猜測詞彙。率先翻完所有己方顏色卡片的一方獲勝。
              </p>
            </section>

            {/* 隊伍組成 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <span>隊伍組成</span>
              </h2>
              <div className="space-y-3 text-sm sm:text-base">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="font-semibold text-blue-300 mb-1">👁️ 隊長（Spymaster）</div>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-2">
                    <li>可以看到所有卡片的顏色（半透明顯示）</li>
                    <li>不能點擊卡片</li>
                    <li>負責給隊員提示</li>
                    <li>必須選擇加入紅隊或藍隊</li>
                  </ul>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="font-semibold text-green-300 mb-1">👤 隊員（Operative）</div>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-2">
                    <li>看不到卡片顏色（未翻開時）</li>
                    <li>可以點擊卡片翻牌</li>
                    <li>根據隊長的提示猜測詞彙</li>
                    <li>自動分配到人數較少的隊伍</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 卡片類型 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <span>卡片類型</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded bg-red-600"></div>
                    <span className="font-semibold text-red-300">紅隊卡片（9張）</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">紅隊需要翻開的目標卡片</p>
                </div>
                <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded bg-blue-600"></div>
                    <span className="font-semibold text-blue-300">藍隊卡片（8張）</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">藍隊需要翻開的目標卡片</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded bg-gray-800"></div>
                    <span className="font-semibold text-gray-300">刺客卡片（1張）</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">點到立即輸掉遊戲</p>
                </div>
                <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded bg-yellow-600"></div>
                    <span className="font-semibold text-yellow-300">路人卡片（7張）</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">無關卡片，點到換回合</p>
                </div>
              </div>
            </section>

            {/* 遊戲流程 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <span>遊戲流程</span>
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base">
                <li>紅隊先手，隊長給出提示（例如：「動物，2個」）</li>
                <li>紅隊隊員根據提示猜測並點擊卡片</li>
                <li>根據點擊的卡片顏色決定是否換回合：
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-gray-400">
                    <li>點到己方顏色：繼續回合，可以再猜一次</li>
                    <li>點到對方顏色：換到對方回合</li>
                    <li>點到路人（米色）：換到對方回合</li>
                    <li>點到刺客（黑色）：立即輸掉遊戲</li>
                  </ul>
                </li>
                <li>輪到藍隊，重複上述流程</li>
                <li>率先翻完所有己方顏色卡片的一方獲勝</li>
              </ol>
            </section>

            {/* 注意事項 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <span>注意事項</span>
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base">
                <li>角色在進入房間時已確定，無法更改以確保遊戲公平性</li>
                <li>只有當前回合的隊伍可以點擊卡片</li>
                <li>已翻開的卡片無法再次點擊</li>
                <li>點擊卡片前會顯示確認對話框，防止誤操作</li>
                <li>所有玩家可以實時看到遊戲進度</li>
              </ul>
            </section>

            {/* 勝利條件 */}
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span>勝利條件</span>
              </h2>
              <div className="bg-gradient-to-r from-red-600/20 to-blue-600/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm sm:text-base leading-relaxed">
                  率先翻完所有己方顏色卡片的一方獲勝！<br/>
                  <span className="text-yellow-400 font-semibold">⚠️ 但如果點到黑色刺客卡片，該隊伍立即輸掉遊戲！</span>
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              返回首頁開始遊戲
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
