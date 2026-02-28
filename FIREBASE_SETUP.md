# Firebase 設置說明

## 已完成的工作

✅ Firebase 已成功初始化並整合到專案中

## 專案結構

```
lib/
├── firebase.ts      # Firebase 初始化配置
└── firestore.ts     # Firestore 資料庫操作函數
```

## Firebase 配置

Firebase 配置已包含在 `lib/firebase.ts` 中，使用您提供的配置資訊：
- Project ID: `table-game-2b77d`
- 已啟用 Firestore 和 Analytics

## Firestore 資料結構

遊戲數據儲存在 Firestore 的 `games` collection 中，每個房間使用 `room_id` 作為 document ID。

### Document 結構

```typescript
{
  room_id: string
  words_data: WordCard[]  // 25 張卡片的陣列
  current_turn: 'red' | 'blue'
  created_at: Timestamp
  updated_at: Timestamp
}
```

### WordCard 結構

```typescript
{
  word: string        // 詞彙
  color: CardColor    // 'red' | 'blue' | 'black' | 'beige'
  revealed: boolean   // 是否已翻開
}
```

## 使用方式

### 1. 安裝依賴

```bash
npm install
```

### 2. Firebase Console 設置

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 `table-game-2b77d`
3. 進入 **Firestore Database**
4. 創建資料庫（如果尚未創建）
   - 選擇「以測試模式啟動」（開發階段）
   - 選擇區域（建議選擇離您最近的區域）

### 3. 安全規則設置（可選）

在 Firestore 的「規則」頁面，您可以設置安全規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允許讀寫 games collection
    match /games/{roomId} {
      allow read, write: if true;  // 開發階段：允許所有人
      // 生產環境建議設置更嚴格的規則
    }
  }
}
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

## 功能說明

### 實時同步

使用 Firestore 的 `onSnapshot` 實現實時同步：
- 當任何玩家翻開卡片時，所有玩家的畫面會自動更新
- 無需手動刷新頁面

### 資料操作

- `getGame(roomId)`: 獲取遊戲數據
- `createGame(roomId, wordsData)`: 創建新遊戲
- `updateGame(roomId, wordsData, currentTurn)`: 更新遊戲狀態
- `subscribeToGame(roomId, callback)`: 訂閱實時更新

## 注意事項

1. **Analytics**: 僅在瀏覽器環境中初始化，不會在伺服器端執行
2. **Firestore**: 在客戶端和伺服器端都可以使用
3. **安全規則**: 開發階段使用開放規則，生產環境請設置適當的安全規則

## 與 Supabase 的差異

- ✅ 無需額外的環境變數設置
- ✅ 配置直接寫在程式碼中
- ✅ Firestore 提供類似的實時同步功能
- ✅ 更簡單的 API 介面

## 疑難排解

### 問題：無法連接到 Firestore

**解決方案**：
1. 確認 Firebase Console 中已創建 Firestore 資料庫
2. 檢查網路連線
3. 查看瀏覽器控制台的錯誤訊息

### 問題：Analytics 初始化失敗

**解決方案**：
- 這是正常的，Analytics 可能在某些環境中無法初始化
- 不影響遊戲功能
