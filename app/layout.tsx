import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '機密代號 - Codenames Online',
  description: '線上版機密代號遊戲',
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
