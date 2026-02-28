# Vercel 部署指南

## ✅ 已修复的问题

1. **删除了旧的 Supabase 文件** - `lib/supabase.ts` 已删除（已迁移到 Firebase）
2. **Firebase 配置支持环境变量** - 现在可以使用环境变量或默认值
3. **添加了 vercel.json 配置** - 优化了部署设置

## 🚀 部署步骤

### 方法 1: 通过 Vercel Dashboard

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "准备部署到 Vercel"
   git push
   ```

2. **在 Vercel 导入项目**
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库
   - 点击 "Import"

3. **配置环境变量（可选）**
   - 在项目设置中添加以下环境变量（如果需要使用自定义 Firebase 配置）：
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     NEXT_PUBLIC_FIREBASE_PROJECT_ID
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     NEXT_PUBLIC_FIREBASE_APP_ID
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
     ```
   - **注意**: 如果不设置环境变量，代码会使用默认的 Firebase 配置

4. **部署**
   - 点击 "Deploy"
   - 等待构建完成

### 方法 2: 使用 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 📝 环境变量设置（可选）

如果你想要使用环境变量而不是默认配置：

1. 在 Vercel Dashboard 中进入项目设置
2. 进入 "Environment Variables"
3. 添加以下变量：

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDKnfp12btImXorjB4Jic6BimZRJ0K0Loo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=table-game-2b77d.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=table-game-2b77d
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=table-game-2b77d.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=594809215578
NEXT_PUBLIC_FIREBASE_APP_ID=1:594809215578:web:d1d7f1d7a0d449b4819663
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2PXZD6RZ5B
```

**注意**: 这些变量名必须以 `NEXT_PUBLIC_` 开头才能在客户端使用。

## 🔧 构建配置

项目已包含 `vercel.json` 配置文件：
- 使用 Next.js 框架
- 部署区域：香港 (hkg1)
- 自动检测构建命令

## ⚠️ 常见问题

### 问题 1: 构建失败 - 找不到模块
**解决方案**: 确保所有依赖都已安装
```bash
npm install
```

### 问题 2: Firebase 连接失败
**解决方案**: 
- 检查 Firebase 配置是否正确
- 确保 Firestore 已启用
- 检查 Firestore 安全规则

### 问题 3: 环境变量未生效
**解决方案**:
- 确保变量名以 `NEXT_PUBLIC_` 开头
- 重新部署项目
- 清除浏览器缓存

## 📦 项目结构

```
.
├── app/              # Next.js App Router
├── lib/              # 工具函数
│   ├── firebase.ts   # Firebase 配置
│   └── firestore.ts  # Firestore 操作
├── types/            # TypeScript 类型
├── vercel.json       # Vercel 配置
└── package.json      # 依赖配置
```

## ✅ 部署检查清单

- [x] 删除旧的 Supabase 文件
- [x] Firebase 配置支持环境变量
- [x] 构建测试通过
- [x] vercel.json 配置完成
- [ ] 在 Vercel 设置环境变量（可选）
- [ ] 测试部署后的功能

## 🎉 部署后

部署成功后，你可以：
1. 访问你的 Vercel URL
2. 测试游戏功能
3. 分享房间代码给朋友一起玩
