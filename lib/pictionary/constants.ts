import type { CSSProperties } from 'react'

export const PICTORY_BACKGROUND_URL =
  'https://img95.699pic.com/photo/32039/1055.jpg_wh860.jpg'

export const pictionaryBackgroundStyle: CSSProperties = {
  backgroundImage: `url('${PICTORY_BACKGROUND_URL}')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
}
