# 環境變數設置說明

## 步驟 1: 創建 Supabase 專案

1. 前往 [https://supabase.com](https://supabase.com)
2. 註冊/登入帳號
3. 點擊 "New Project" 創建新專案
4. 填寫專案資訊並等待資料庫初始化完成

## 步驟 2: 執行資料庫遷移

1. 在 Supabase Dashboard 中，點擊左側選單的 "SQL Editor"
2. 點擊 "New query"
3. 複製 `supabase/migrations/001_create_games_table.sql` 的內容
4. 貼上到 SQL Editor 中
5. 點擊 "Run" 執行 SQL

## 步驟 3: 取得 API 憑證

1. 在 Supabase Dashboard 中，點擊左側選單的 "Settings" → "API"
2. 找到以下資訊：
   - **Project URL** (例如: `https://xxxxx.supabase.co`)
   - **anon/public key** (一長串的 JWT token)

## 步驟 4: 設置環境變數

在專案根目錄創建 `.env.local` 檔案（如果不存在），並填入：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
```

**注意：**
- `.env.local` 檔案不會被提交到 Git（已在 `.gitignore` 中）
- 變數名稱必須以 `NEXT_PUBLIC_` 開頭，才能在瀏覽器端使用

## 步驟 5: 驗證設置

重新啟動開發伺服器：

```bash
npm run dev
```

如果設置正確，應用程式應該可以正常連接到 Supabase。
