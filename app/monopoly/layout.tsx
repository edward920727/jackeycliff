import { Nunito } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-monopoly',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

export default function MonopolyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${nunito.variable} font-game min-h-screen antialiased`}>{children}</div>
  )
}
