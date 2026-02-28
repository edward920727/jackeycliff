'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { getGame, updateGame, subscribeToGame, joinGame, leaveGame } from '@/lib/firestore'
import { initializeGame } from '@/lib/gameUtils'
import { WordCard, CardColor, PlayerRole, Player } from '@/types/game'

export default function GamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  
  const [cards, setCards] = useState<WordCard[]>([])
  const [currentTurn, setCurrentTurn] = useState<'red' | 'blue'>('red')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 角色和名字在進入房間時確定，之後不能更改
  const playerRole = (searchParams.get('role') || 'operative') as PlayerRole
  const playerName = searchParams.get('name') || '匿名玩家'
  const playerIdRef = useRef<string>(`player_${Date.now()}_${Math.random().toString(36).substring(7)}`)
  const hasJoinedRef = useRef(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    cardIndex: number | null
    cardWord: string
  }>({ show: false, cardIndex: null, cardWord: '' })

  // 初始化或載入遊戲數據
  useEffect(() => {
    async function loadOrCreateGame() {
      try {
        // 嘗試載入現有遊戲
        const existingGame = await getGame(roomId)

        if (existingGame) {
          // 遊戲已存在，載入數據
          setCards(existingGame.words_data)
          setCurrentTurn(existingGame.current_turn)
          setPlayers(existingGame.players || [])
        } else {
          // 創建新遊戲（initializeGame 會自動存入 Firestore）
          const initialCards = await initializeGame(roomId)
          setCards(initialCards)
          setCurrentTurn('red')
          setPlayers([])
        }
      } catch (err: any) {
        setError(err.message || '載入遊戲失敗')
        console.error('Error loading game:', err)
      } finally {
        setLoading(false)
      }
    }

    loadOrCreateGame()
  }, [roomId])

  // 加入遊戲
  useEffect(() => {
    async function addPlayer() {
      if (loading || hasJoinedRef.current) return
      
      try {
        // 自動分配隊伍（根據現有玩家數量）
        const existingGame = await getGame(roomId)
        const existingPlayers = existingGame?.players || []
        const redCount = existingPlayers.filter(p => p.team === 'red').length
        const blueCount = existingPlayers.filter(p => p.team === 'blue').length
        
        // 分配隊伍：較少人的隊伍優先
        const assignedTeam = redCount <= blueCount ? 'red' : 'blue'
        
        const newPlayer: Player = {
          id: playerIdRef.current,
          name: playerName,
          team: assignedTeam,
          role: playerRole,
          joined_at: new Date(),
        }
        
        await joinGame(roomId, newPlayer)
        hasJoinedRef.current = true
      } catch (err: any) {
        console.error('Error joining game:', err)
      }
    }

    if (!loading) {
      addPlayer()
    }
  }, [roomId, loading, playerName, playerRole])

  // 離開遊戲時清理
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        leaveGame(roomId, playerIdRef.current).catch(console.error)
      }
    }
  }, [roomId])

  // 訂閱實時更新
  useEffect(() => {
    if (loading) return

    const unsubscribe = subscribeToGame(roomId, (gameData) => {
      if (gameData) {
        setCards(gameData.words_data)
        setCurrentTurn(gameData.current_turn)
        setPlayers(gameData.players || [])
      }
    })

    return () => {
      unsubscribe()
    }
  }, [roomId, loading])

  // 計算剩餘卡片數
  const getRemainingCards = () => {
    const redRemaining = cards.filter(
      (card) => card.color === 'red' && !card.revealed
    ).length
    const blueRemaining = cards.filter(
      (card) => card.color === 'blue' && !card.revealed
    ).length
    return { redRemaining, blueRemaining }
  }

  // 處理卡片點擊（顯示確認對話框）
  const handleCardClick = (index: number) => {
    // 隊長不能點擊
    if (playerRole === 'spymaster') return
    
    // 如果已經翻開，不能再次點擊
    if (cards[index].revealed) return

    // 顯示確認對話框
    setConfirmDialog({
      show: true,
      cardIndex: index,
      cardWord: cards[index].word,
    })
  }

  // 確認翻開卡片
  const confirmRevealCard = async () => {
    if (confirmDialog.cardIndex === null) return

    const index = confirmDialog.cardIndex
    setConfirmDialog({ show: false, cardIndex: null, cardWord: '' })

    try {
      const newCards = [...cards]
      newCards[index].revealed = true

      // 判斷是否換回合
      const clickedColor = newCards[index].color
      let newTurn = currentTurn
      
      if (clickedColor === 'black') {
        // 點到黑色，遊戲結束（這裡簡化處理，可以擴展）
        alert('遊戲結束！點到了黑色卡片！')
      } else if (clickedColor === 'beige') {
        // 點到米色，換回合
        newTurn = currentTurn === 'red' ? 'blue' : 'red'
      } else if (clickedColor !== currentTurn) {
        // 點到對方顏色，換回合
        newTurn = currentTurn === 'red' ? 'blue' : 'red'
      }

      // 更新資料庫
      await updateGame(roomId, newCards, newTurn)
    } catch (err: any) {
      setError(err.message || '更新失敗')
      console.error('Error updating card:', err)
    }
  }

  // 取消翻開卡片
  const cancelRevealCard = () => {
    setConfirmDialog({ show: false, cardIndex: null, cardWord: '' })
  }

  // 獲取卡片樣式
  const getCardStyle = (card: WordCard, index: number) => {
    const baseStyle = 'w-full aspect-square rounded-lg border-2 transition-all duration-300 flex items-center justify-center text-center p-2 font-semibold text-sm sm:text-base cursor-pointer transform hover:scale-105'
    
    // 隊長視角：顯示所有顏色（用透明度）
    if (playerRole === 'spymaster') {
      const colorMap: Record<CardColor, string> = {
        red: 'bg-red-600/30 border-red-500/50 text-red-200',
        blue: 'bg-blue-600/30 border-blue-500/50 text-blue-200',
        black: 'bg-gray-800/30 border-gray-600/50 text-gray-300',
        beige: 'bg-yellow-600/30 border-yellow-500/50 text-yellow-200',
      }
      return `${baseStyle} ${colorMap[card.color]} cursor-not-allowed`
    }
    
    // 隊員視角：只有翻開的才顯示顏色
    if (card.revealed) {
      const colorMap: Record<CardColor, string> = {
        red: 'bg-red-600 border-red-500 text-white',
        blue: 'bg-blue-600 border-blue-500 text-white',
        black: 'bg-gray-800 border-gray-600 text-white',
        beige: 'bg-yellow-600 border-yellow-500 text-white',
      }
      return `${baseStyle} ${colorMap[card.color]}`
    }
    
    // 未翻開的卡片
    return `${baseStyle} bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-gray-500`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">載入遊戲中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">錯誤</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  const { redRemaining, blueRemaining } = getRemainingCards()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 「目前輪到誰」指示燈 */}
        <div className={`mb-4 rounded-lg p-4 border-2 transition-all duration-300 ${
          currentTurn === 'red'
            ? 'bg-red-600/20 border-red-500 shadow-lg shadow-red-500/20'
            : 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
        }`}>
          <div className="flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              currentTurn === 'red' ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
            <span className={`text-lg font-bold ${
              currentTurn === 'red' ? 'text-red-300' : 'text-blue-300'
            }`}>
              {currentTurn === 'red' ? '現在是紅隊回合' : '現在是藍隊回合'}
            </span>
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              currentTurn === 'red' ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
          </div>
        </div>

        {/* 標題和資訊欄 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-semibold"
              >
                ← 返回首頁
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
                機密代號
              </h1>
            </div>
          </div>
          
          {/* 計分板 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-300 mb-1">紅隊</div>
                  <div className="text-3xl font-bold text-red-200">{redRemaining}</div>
                  <div className="text-xs text-red-400 mt-1">剩餘卡片</div>
                </div>
                <div className="text-4xl">🔴</div>
              </div>
            </div>
            <div className="bg-blue-600/20 border-2 border-blue-500 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-300 mb-1">藍隊</div>
                  <div className="text-3xl font-bold text-blue-200">{blueRemaining}</div>
                  <div className="text-xs text-blue-400 mt-1">剩餘卡片</div>
                </div>
                <div className="text-4xl">🔵</div>
              </div>
            </div>
          </div>

          {/* 隊伍成員列表 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                <span>🔴</span>
                <span>紅隊成員</span>
                <span className="text-xs text-red-400">
                  ({players.filter(p => p.team === 'red').length} 人)
                </span>
              </div>
              <div className="space-y-2">
                {players.filter(p => p.team === 'red').length === 0 ? (
                  <div className="text-xs text-gray-500 italic">等待玩家加入...</div>
                ) : (
                  players
                    .filter(p => p.team === 'red')
                    .map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between text-sm p-2 rounded ${
                          player.id === playerIdRef.current
                            ? 'bg-red-500/20 border border-red-500/50'
                            : 'bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-red-300">{player.name}</span>
                          {player.id === playerIdRef.current && (
                            <span className="text-xs text-red-400">(你)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {player.role === 'spymaster' ? '👁️ 隊長' : '👤 隊員'}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <span>🔵</span>
                <span>藍隊成員</span>
                <span className="text-xs text-blue-400">
                  ({players.filter(p => p.team === 'blue').length} 人)
                </span>
              </div>
              <div className="space-y-2">
                {players.filter(p => p.team === 'blue').length === 0 ? (
                  <div className="text-xs text-gray-500 italic">等待玩家加入...</div>
                ) : (
                  players
                    .filter(p => p.team === 'blue')
                    .map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between text-sm p-2 rounded ${
                          player.id === playerIdRef.current
                            ? 'bg-blue-500/20 border border-blue-500/50'
                            : 'bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-blue-300">{player.name}</span>
                          {player.id === playerIdRef.current && (
                            <span className="text-xs text-blue-400">(你)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {player.role === 'spymaster' ? '👁️ 隊長' : '👤 隊員'}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-gray-400">房間代碼：</span>
                <span className="font-mono text-xl font-bold text-white">{roomId}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                playerRole === 'spymaster'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                  : 'bg-green-500/20 text-green-300 border border-green-500/50'
              }`}>
                {playerRole === 'spymaster' ? '👁️ 隊長視角' : '👤 隊員視角'}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 提示：角色在進入房間時已確定，無法更改以確保遊戲公平性
            </div>
          </div>
        </div>

        {/* 5x5 卡片矩陣 */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
          {cards.map((card, index) => (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              className={getCardStyle(card, index)}
              disabled={playerRole === 'spymaster' || card.revealed}
            >
              <span className="break-words">{card.word}</span>
            </button>
          ))}
        </div>

        {/* 圖例 */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">圖例</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-600"></div>
              <span className="text-sm text-gray-300">紅隊</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600"></div>
              <span className="text-sm text-gray-300">藍隊</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-800"></div>
              <span className="text-sm text-gray-300">刺客</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-600"></div>
              <span className="text-sm text-gray-300">路人</span>
            </div>
          </div>
        </div>
      </div>

      {/* 確認對話框 */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border-2 border-gray-700 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">確認翻開卡片</h3>
            <p className="text-gray-300 mb-4">
              確定要翻開「<span className="font-bold text-yellow-400">{confirmDialog.cardWord}</span>」這張卡片嗎？
            </p>
            <p className="text-sm text-gray-400 mb-6">
              此操作無法復原，請謹慎確認。
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelRevealCard}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmRevealCard}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
              >
                確定翻開
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
