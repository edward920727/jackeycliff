'use client'

import { useRouter } from 'next/navigation'

export default function UndercoverRulesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/undercover')}
          className="mb-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-sm font-semibold text-slate-100 border border-slate-700"
        >
          ← 返回「誰是臥底」
        </button>

        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700/70">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent">
            誰是臥底：遊戲規則
          </h1>
          <p className="text-center text-slate-300 mb-8 text-sm sm:text-base">
            輕鬆聊天、互相懷疑，找出那個裝懂的臥底！
          </p>

          <div className="space-y-6 text-slate-200">
            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>遊戲目標</span>
              </h2>
              <p className="text-sm sm:text-base leading-relaxed">
                大部分玩家拿到同一個「平民詞」，少數玩家拿到一個非常相近但不一樣的「臥底詞」。
                <br />
                平民要試著
                <span className="font-semibold text-yellow-200">彼此確認同陣營</span> 並
                <span className="font-semibold text-yellow-200">找出臥底</span>；
                臥底則要
                <span className="font-semibold text-yellow-200">裝成平民</span>
                ，在不暴露的情況下讓平民互相懷疑。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <span>人數與身分</span>
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base">
                <li>建議人數：3–10 人。</li>
                <li>
                  <span className="font-semibold text-emerald-300">平民</span>：拿到「平民詞」，彼此合作找出臥底。
                </li>
                <li>
                  <span className="font-semibold text-rose-300">臥底</span>：拿到「臥底詞」，與平民詞很像但不完全相同。
                </li>
                <li>
                  <span className="font-semibold text-sky-300">白板（可選）</span>：沒有指定詞，自由發揮描述。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <span>遊戲流程</span>
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base">
                <li>系統替每位玩家分配詞彙（請勿讓其他人看到螢幕）。</li>
                <li>從任一玩家開始，按照座位順序輪流「用一句話描述你的詞」。</li>
                <li>可以多輪描述，每輪都可以換一種說法、補充細節。</li>
                <li>大家可以互相發問、要求某位玩家再多描述一次。</li>
                <li>當大家覺得差不多時，進入「投票淘汰」：指認最可疑的一位。</li>
                <li>由房主在系統中標記被淘汰的玩家，並公開他的真實身分與詞（自行口頭揭露）。</li>
                <li>
                  重複「描述 ➝ 討論 ➝ 投票」直到
                  <span className="font-semibold text-yellow-200">
                    臥底全部被淘汰（平民勝）或臥底人數大於等於平民
                  </span>
                  （臥底勝）。
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <span>描述小技巧</span>
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base">
                <li>盡量避免直接講出詞中的關鍵字。</li>
                <li>描述要「有點模糊」，但又不能讓隊友完全聽不懂。</li>
                <li>可以從用途、感覺、場合、顏色、味道等角度切入。</li>
                <li>臥底要小心不要說出只適用於自己詞彙的細節。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span>勝利條件</span>
              </h2>
              <div className="bg-gradient-to-r from-emerald-500/20 to-rose-500/20 border border-emerald-500/40 rounded-lg p-4">
                <ul className="list-disc list-inside space-y-2 text-sm sm:text-base">
                  <li>
                    <span className="font-semibold text-emerald-300">平民勝利：</span>
                    所有臥底皆被淘汰。
                  </li>
                  <li>
                    <span className="font-semibold text-rose-300">臥底勝利：</span>
                    臥底人數
                    <span className="font-semibold">大於等於</span>
                    平民人數。
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={() => router.push('/undercover')}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              返回「誰是臥底」開始遊戲
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

