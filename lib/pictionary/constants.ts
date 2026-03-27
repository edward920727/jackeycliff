import type { CSSProperties } from 'react'

/** 你畫我猜背景（放在 public/pictionary-bg.png） */
export const PICTORY_BACKGROUND_URL = '/pictionary-bg.png'

export const pictionaryBackgroundStyle: CSSProperties = {
  backgroundImage: `url('${PICTORY_BACKGROUND_URL}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
}
