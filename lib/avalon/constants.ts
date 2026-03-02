export type AvalonFaction = 'good' | 'evil'

export type AvalonRoleId =
  | 'merlin'
  | 'percival'
  | 'loyal_servant'
  | 'assassin'
  | 'morgana'
  | 'mordred'
  | 'oberon'
  | 'minion'

export interface AvalonRole {
  id: AvalonRoleId
  name: string
  faction: AvalonFaction
  /**
   * 此角色在遊戲開始時可以「確定看見」哪些角色（以角色 ID 表示）
   * 實際可見對象還會受到當局使用的角色組合影響（沒選進來的角色自然不會出現在視野中）
   */
  sees: AvalonRoleId[]
}

/**
 * 阿瓦隆所有角色定義
 */
export const AVALON_ROLES: Record<AvalonRoleId, AvalonRole> = {
  merlin: {
    id: 'merlin',
    name: '梅林',
    faction: 'good',
    // 官方規則：梅林可以看到所有邪惡陣營，唯獨看不到莫德雷德
    sees: ['assassin', 'morgana', 'oberon', 'minion'],
  },
  percival: {
    id: 'percival',
    name: '派西維爾',
    faction: 'good',
    // 可以看到「梅林 + 莫甘娜」，但不知道誰才是真的梅林
    sees: ['merlin', 'morgana'],
  },
  loyal_servant: {
    id: 'loyal_servant',
    name: '亞瑟的忠臣',
    faction: 'good',
    sees: [],
  },
  assassin: {
    id: 'assassin',
    name: '刺客',
    faction: 'evil',
    // 邪惡陣營彼此互相看見（除了奧伯倫）
    sees: ['morgana', 'mordred', 'minion'],
  },
  morgana: {
    id: 'morgana',
    name: '莫甘娜',
    faction: 'evil',
    sees: ['assassin', 'mordred', 'minion'],
  },
  mordred: {
    id: 'mordred',
    name: '莫德雷德',
    faction: 'evil',
    // 莫德雷德對其他邪惡成員可見，梅林看不到莫德雷德
    sees: ['assassin', 'morgana', 'minion'],
  },
  oberon: {
    id: 'oberon',
    name: '奧伯倫',
    faction: 'evil',
    // 奧伯倫是「隱藏的邪惡」，雙方都看不到彼此
    sees: [],
  },
  minion: {
    id: 'minion',
    name: '莫德雷德的爪牙',
    faction: 'evil',
    // 爪牙看得到其他所有公開的壞人，但看不到奧伯倫
    sees: ['assassin', 'morgana', 'mordred', 'minion'],
  },
}

/**
 * 不同玩家人數（5–10人）對應的預設角色組合
 *
 * 你可以之後視需求調整這個對照表。
 */
export const ROLE_PRESETS_BY_PLAYER_COUNT: Record<number, AvalonRoleId[]> = {
  // 3 好 2 壞：梅林、派西維爾、忠臣 x1、刺客、莫甘娜
  5: ['merlin', 'percival', 'loyal_servant', 'assassin', 'morgana'],

  // 4 好 2 壞：梅林、派西維爾、忠臣 x2、刺客、莫甘娜
  6: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'assassin', 'morgana'],

  // 4 好 3 壞：梅林、派西維爾、忠臣 x2、刺客、莫甘娜、莫德雷德
  7: ['merlin', 'percival', 'loyal_servant', 'loyal_servant', 'assassin', 'morgana', 'mordred'],

  // 5 好 3 壞：梅林、派西維爾、忠臣 x3、刺客、莫甘娜、莫德雷德
  8: [
    'merlin',
    'percival',
    'loyal_servant',
    'loyal_servant',
    'loyal_servant',
    'assassin',
    'morgana',
    'mordred',
  ],

  // 6 好 3 壞：梅林、派西維爾、忠臣 x4、刺客、莫甘娜、莫德雷德
  9: [
    'merlin',
    'percival',
    'loyal_servant',
    'loyal_servant',
    'loyal_servant',
    'loyal_servant',
    'assassin',
    'morgana',
    'mordred',
  ],

  // 6 好 4 壞：梅林、派西維爾、忠臣 x4、刺客、莫甘娜、莫德雷德、奧伯倫
  10: [
    'merlin',
    'percival',
    'loyal_servant',
    'loyal_servant',
    'loyal_servant',
    'loyal_servant',
    'assassin',
    'morgana',
    'mordred',
    'oberon',
  ],
}

export interface AssignedRole {
  /** 第幾位玩家（位置 / 座位），從 1 開始方便之後在 UI 顯示「玩家1、玩家2…」 */
  seat: number
  roleId: AvalonRoleId
}

/**
 * 根據玩家人數，使用預設角色組合隨機分配阿瓦隆身分
 */
export function assignRoles(playerCount: number): AssignedRole[] {
  const preset = ROLE_PRESETS_BY_PLAYER_COUNT[playerCount]
  if (!preset) {
    throw new Error(`目前尚未支援的玩家人數：${playerCount}（只支援 5~10 人）`)
  }

  // 先複製一份陣列再洗牌，避免改動到常數本身
  const roles = [...preset]

  // Fisher–Yates 洗牌
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }

  return roles.map((roleId, index) => ({
    seat: index + 1,
    roleId,
  }))
}

/**
 * 由房主自訂一組角色清單時，根據該清單隨機分配身分
 */
export function assignSpecificRoles(roleIds: AvalonRoleId[]): AssignedRole[] {
  if (roleIds.length === 0) {
    throw new Error('至少需要一個角色才能分配身分')
  }

  const roles = [...roleIds]

  // Fisher–Yates 洗牌
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }

  return roles.map((roleId, index) => ({
    seat: index + 1,
    roleId,
  }))
}
