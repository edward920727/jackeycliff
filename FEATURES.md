# 《機密代號》功能說明

## ✅ 已完成的功能

### 1. initializeGame 函數
- **位置**: `lib/gameUtils.ts`
- **功能**: 隨機生成 25 張卡片（文字與顏色），並自動存入 Firestore 的 `games` 集合
- **卡片分配**:
  - 9 張紅色（紅隊）
  - 8 張藍色（藍隊）
  - 1 張黑色（刺客）
  - 7 張米色（路人）
- **使用方式**:
  ```typescript
  const cards = await initializeGame(roomId)
  // 卡片已自動存入 Firestore
  ```

### 2. 實時同步功能（onSnapshot）
- **位置**: `lib/firestore.ts` 的 `subscribeToGame` 函數
- **功能**: 使用 Firebase Firestore 的 `onSnapshot` 監聽資料庫變化
- **實現**: 
  - 當任何玩家點擊卡片並更新資料庫後
  - 所有在該房間的玩家畫面會自動同步翻牌
  - 無需手動刷新頁面
- **使用方式**:
  ```typescript
  const unsubscribe = subscribeToGame(roomId, (gameData) => {
    // 當資料庫更新時，這個回調函數會自動執行
    setCards(gameData.words_data)
    setCurrentTurn(gameData.current_turn)
  })
  ```

### 3. 隊長/隊員模式切換 UI
- **位置**: `app/game/[roomId]/page.tsx`
- **功能**: 在遊戲頁面提供模式切換按鈕
- **隊長模式**:
  - 可以看到所有卡片的顏色（使用透明度顯示）
  - 無法點擊卡片
  - 用於給隊員提示
- **隊員模式**:
  - 看不到卡片顏色（未翻開時）
  - 可以點擊卡片翻牌
  - 點擊後會顯示顏色

## 📁 檔案結構

```
lib/
├── firebase.ts      # Firebase 初始化配置
├── firestore.ts     # Firestore 資料庫操作（getGame, createGame, updateGame, subscribeToGame）
└── gameUtils.ts     # 遊戲工具函數（initializeGame, generateGameData）

app/game/[roomId]/
└── page.tsx         # 遊戲主頁面（包含模式切換 UI）
```

## 🔄 資料流程

1. **創建遊戲**:
   ```
   用戶進入房間 → initializeGame(roomId) 
   → 生成 25 張隨機卡片 
   → 存入 Firestore (games/{roomId})
   ```

2. **點擊卡片**:
   ```
   隊員點擊卡片 → 顯示確認對話框 
   → 確認後 → updateGame() 更新 Firestore
   → onSnapshot 監聽到變化 
   → 所有玩家畫面自動更新
   ```

3. **模式切換**:
   ```
   點擊模式切換按鈕 → setPlayerRole() 
   → UI 立即更新（隊長/隊員視角）
   ```

## 🎮 遊戲規則

- **紅隊先手**: 遊戲開始時為紅隊回合
- **回合切換**:
  - 點到己方顏色：繼續回合
  - 點到對方顏色：換回合
  - 點到米色（路人）：換回合
  - 點到黑色（刺客）：遊戲結束
- **勝利條件**: 率先翻完所有己方顏色卡片的一方獲勝

## 🔧 技術細節

### Firestore 資料結構

```typescript
games/{roomId} {
  room_id: string
  words_data: WordCard[]  // 25 張卡片
  current_turn: 'red' | 'blue'
  created_at: Timestamp
  updated_at: Timestamp
}
```

### WordCard 結構

```typescript
{
  word: string           // 詞彙
  color: CardColor       // 'red' | 'blue' | 'black' | 'beige'
  revealed: boolean      // 是否已翻開
}
```

## 🚀 使用範例

### 初始化遊戲

```typescript
// 在遊戲頁面載入時
const existingGame = await getGame(roomId)
if (!existingGame) {
  // 創建新遊戲（自動存入 Firestore）
  const cards = await initializeGame(roomId)
  setCards(cards)
}
```

### 訂閱實時更新

```typescript
useEffect(() => {
  const unsubscribe = subscribeToGame(roomId, (gameData) => {
    if (gameData) {
      setCards(gameData.words_data)
      setCurrentTurn(gameData.current_turn)
    }
  })
  
  return () => unsubscribe()  // 清理訂閱
}, [roomId])
```

### 更新卡片狀態

```typescript
const newCards = [...cards]
newCards[index].revealed = true
await updateGame(roomId, newCards, newTurn)
// 所有訂閱者會自動收到更新
```
