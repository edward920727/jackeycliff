import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '線上桌遊大廳',
    template: '%s | 線上桌遊大廳',
  },
  description: '線上桌遊大廳：多人即時桌遊（機密代號、誰是臥底、阿瓦隆等）',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
