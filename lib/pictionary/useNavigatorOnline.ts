'use client'

import { useEffect, useState } from 'react'

/** 瀏覽器網路狀態（與 Firestore 離線快取搭配顯示用） */
export function useNavigatorOnline(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}
