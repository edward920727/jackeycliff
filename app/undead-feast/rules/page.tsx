'use client'

import { useRouter } from 'next/navigation'

export default function UndeadFeastRulesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 text-slate-100">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/undead-feast')}
          className="mb-6 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
        >
          ← 返回「亡靈盛宴」
        </button>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-6">
          <h1 className="text-3xl font-bold text-yellow-300">亡靈盛宴：規則</h1>
          <p className="text-sm text-slate-300">
            依你提供的文章流程實作：4–8 人、4 輪傳詞、最後全員猜每張骷髏板對應人物，並以答對人數判定是否安息。
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1) 人數</h2>
            <p className="text-sm text-slate-300">建議 4–8 人。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2) 傳詞流程（4 輪）</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li>第 1 輪：每位玩家看到自己的亡靈人物，寫 1 個詞語描述它。</li>
              <li>之後每輪：拿到上一位玩家留下的詞，改寫成新的 1 個詞語。</li>
              <li>共進行 4 輪，系統會在全員提交後自動進入下一輪。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3) 填詞限制</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>不可填人物名稱。</li>
              <li>不可與上一位玩家同詞。</li>
              <li>請填單一詞語。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">進階規則（難題牌）</h2>
            <p className="text-sm text-slate-300 mb-2">
              房主可在開局前勾選「啟用進階規則」，每輪會抽一張限制卡並套用到所有玩家。
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>本輪詞語不能包含「的」</li>
              <li>本輪詞語至少 3 個字</li>
              <li>本輪詞語最多 4 個字</li>
              <li>本輪詞語不能有重複字</li>
              <li>本輪詞語不能包含方位詞（上/下/左/右）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4) 猜測與結算</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>4 輪結束後，系統提供 8 個候選人物供所有玩家猜測。</li>
              <li>每位玩家要替每張骷髏板選出對應人物。</li>
              <li>若某張骷髏板有「玩家人數 - 1」以上答對，該亡靈成功安息。</li>
            </ul>
          </section>

          <button
            onClick={() => router.push('/undead-feast')}
            className="w-full py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300"
          >
            返回「亡靈盛宴」開始遊戲
          </button>
        </div>
      </div>
    </div>
  )
}

