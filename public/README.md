# Public 文件夹

请将您的背景图片放在这个文件夹中，命名为 `background.jpg`

## 支持的图片格式
- JPG / JPEG
- PNG
- WebP

## 图片建议
- 推荐尺寸：1920x1080 或更大
- 文件大小：建议小于 2MB（优化加载速度）
- 图片内容：建议使用深色或低对比度的图片，以确保文字可读性

## 使用方法
1. 将您的背景图片重命名为 `background.jpg`
2. 放在 `public` 文件夹中
3. 刷新页面即可看到效果

## 自定义图片路径
如果您想使用不同的文件名或路径，可以修改 `app/page.tsx` 中的：
```tsx
backgroundImage: 'url(/your-image-name.jpg)',
```
