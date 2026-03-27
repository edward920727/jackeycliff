import type { MuffinTimeGameData } from '@/types/muffin-time'
import { sortedPlayersBySeat } from './engine'

export type FlyDirection = 'left' | 'top' | 'right' | 'bottom'

export function getOpponentSlots(game: MuffinTimeGameData, myPid: string) {
  const sorted = sortedPlayersBySeat(game)
  const others = sorted.filter((p) => p.participantId !== myPid)
  return {
    left: others[0],
    top: others[1],
    right: others[2],
    rest: others.slice(3),
  }
}

/** 打牌動畫飛入方向：依「自己在下、其他人在左／上／右」的圓桌配置 */
export function getCardFlyDirection(
  game: MuffinTimeGameData,
  myPid: string,
  actorSeat: number
): FlyDirection {
  const mySeat = game.players.find((p) => p.participantId === myPid)?.seat
  if (mySeat === actorSeat) return 'bottom'
  const others = sortedPlayersBySeat(game).filter((p) => p.participantId !== myPid)
  const idx = others.findIndex((p) => p.seat === actorSeat)
  if (idx === 0) return 'left'
  if (idx === 1) return 'top'
  if (idx === 2) return 'right'
  return 'top'
}
