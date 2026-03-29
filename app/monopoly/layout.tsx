import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-monopoly',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: '大富翁',
}

export default function MonopolyLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${nunito.variable} font-game min-h-screen antialiased`}>{children}</div>
}
