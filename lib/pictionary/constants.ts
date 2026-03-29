import type { CSSProperties } from 'react'

/** 你畫我猜背景（放在 public/pictionary-bg.png） */
export const PICTORY_BACKGROUND_URL = '/pictionary-bg.png'

/** 公布答案後等待多久再自動進下一題（毫秒） */
export const PICTIONARY_POST_REVEAL_DELAY_MS = 4000

export const pictionaryBackgroundStyle: CSSProperties = {
  backgroundImage: `url('${PICTORY_BACKGROUND_URL}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
}
