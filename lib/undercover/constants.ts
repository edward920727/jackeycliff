import type { UndercoverWords } from '@/types/undercover'

/** 內建「平民詞／臥底詞」題組（詞意相近、方便描述裝懂） */
export const UNDERCOVER_WORD_PAIRS: UndercoverWords[] = [
  { civilian: '蘋果', undercover: '梨子' },
  { civilian: '可口可樂', undercover: '百事可樂' },
  { civilian: '圖書館', undercover: '書店' },
  { civilian: '筷子', undercover: '湯匙' },
  { civilian: '籃球', undercover: '排球' },
  { civilian: '牙刷', undercover: '牙線' },
  { civilian: '雨傘', undercover: '雨衣' },
  { civilian: '牛排', undercover: '豬排' },
  { civilian: '計程車', undercover: 'Uber' },
  { civilian: '咖啡', undercover: '奶茶' },
  { civilian: '空調', undercover: '電風扇' },
  { civilian: '便利商店', undercover: '超級市場' },
  { civilian: '電視劇', undercover: '電影' },
  { civilian: '手機殼', undercover: '手機膜' },
  { civilian: '耳機', undercover: '音響' },
  { civilian: '西瓜', undercover: '哈密瓜' },
  { civilian: '泡麵', undercover: '冬粉' },
  { civilian: '壽司', undercover: '生魚片' },
  { civilian: '火鍋', undercover: '燒烤' },
  { civilian: '餃子', undercover: '鍋貼' },
  { civilian: '拉麵', undercover: '烏龍麵' },
  { civilian: '冰淇淋', undercover: '霜淇淋' },
  { civilian: '吐司', undercover: '貝果' },
  { civilian: '優格', undercover: '布丁' },
  { civilian: '礦泉水', undercover: '氣泡水' },
  { civilian: '紅茶', undercover: '綠茶' },
  { civilian: '啤酒', undercover: '調酒' },
  { civilian: '健身房', undercover: '游泳池' },
  { civilian: '遊樂園', undercover: '動物園' },
  { civilian: '海邊', undercover: '湖邊' },
  { civilian: '登山', undercover: '健行' },
  { civilian: '露營', undercover: '野餐' },
  { civilian: '捷運', undercover: '輕軌' },
  { civilian: '高鐵', undercover: '火車' },
  { civilian: '腳踏車', undercover: '滑板車' },
  { civilian: '郵局', undercover: '銀行' },
  { civilian: '美容院', undercover: '理髮店' },
  { civilian: '瑜珈', undercover: '皮拉提斯' },
  { civilian: '電影院', undercover: 'KTV' },
  { civilian: '博物館', undercover: '美術館' },
  { civilian: '寺廟', undercover: '教堂' },
  { civilian: '貓', undercover: '狗' },
  { civilian: '老虎', undercover: '豹' },
  { civilian: '企鵝', undercover: '海豹' },
  { civilian: '蝴蝶', undercover: '蜜蜂' },
  { civilian: '鯊魚', undercover: '海豚' },
  { civilian: '鋼琴', undercover: '小提琴' },
  { civilian: '吉他', undercover: '烏克麗麗' },
  { civilian: '漫畫', undercover: '小說' },
  { civilian: '拼圖', undercover: '樂高' },
  { civilian: '撲克牌', undercover: 'UNO' },
  { civilian: '羽球', undercover: '網球' },
  { civilian: '足球', undercover: '橄欖球' },
  { civilian: '游泳', undercover: '潛水' },
  { civilian: '滑雪', undercover: '溜冰' },
  { civilian: '圍棋', undercover: '象棋' },
  { civilian: '太陽眼鏡', undercover: '近視眼鏡' },
  { civilian: '手錶', undercover: '手環' },
  { civilian: '背包', undercover: '手提包' },
  { civilian: '拖鞋', undercover: '涼鞋' },
  { civilian: '圍巾', undercover: '領帶' },
  { civilian: '枕頭', undercover: '抱枕' },
  { civilian: '鬧鐘', undercover: '碼表' },
  { civilian: '冰箱', undercover: '冷凍庫' },
  { civilian: '微波爐', undercover: '烤箱' },
  { civilian: '洗衣機', undercover: '烘衣機' },
  { civilian: '掃地機器人', undercover: '吸塵器' },
  { civilian: '平板電腦', undercover: '電子書閱讀器' },
  { civilian: '筆電', undercover: '桌機' },
  { civilian: '滑鼠', undercover: '觸控板' },
  { civilian: '充電線', undercover: '行動電源' },
  { civilian: '社群軟體', undercover: '通訊軟體' },
  { civilian: '搜尋引擎', undercover: '地圖App' },
  { civilian: '外送平台', undercover: '美食評論網' },
  { civilian: '醫生', undercover: '藥師' },
  { civilian: '老師', undercover: '家教' },
  { civilian: '警察', undercover: '保全' },
  { civilian: '廚師', undercover: '烘焙師' },
  { civilian: '攝影師', undercover: '導播' },
  { civilian: '春天', undercover: '秋天' },
  { civilian: '颱風', undercover: '地震' },
  { civilian: '日出', undercover: '日落' },
  { civilian: '櫻花', undercover: '楓葉' },
  { civilian: '牙膏', undercover: '漱口水' },
  { civilian: '洗髮精', undercover: '沐浴乳' },
  { civilian: '衛生紙', undercover: '濕紙巾' },
  { civilian: '信用卡', undercover: '簽帳金融卡' },
  { civilian: '發票', undercover: '收據' },
  { civilian: '口罩', undercover: '面紙' },
  { civilian: '防曬乳', undercover: '乳液' },
  { civilian: '泡湯', undercover: '三溫暖' },
  { civilian: '按摩', undercover: '刮痧' },
  { civilian: '失眠', undercover: '嗜睡' },
  { civilian: '過敏', undercover: '感冒' },
  { civilian: '婚禮', undercover: '訂婚宴' },
  { civilian: '畢業典禮', undercover: '開學典禮' },
  { civilian: '生日派對', undercover: '尾牙' },
  { civilian: '情人節', undercover: '白色情人節' },
  { civilian: '萬聖節', undercover: '聖誕節' },
  { civilian: '粽子', undercover: '月餅' },
  { civilian: '紅包', undercover: '禮券' },
  { civilian: '年夜飯', undercover: '烤肉聚會' },
  { civilian: '打工', undercover: '實習' },
  { civilian: '面試', undercover: '筆試' },
  { civilian: '簡報', undercover: '海報' },
  { civilian: '會議', undercover: '工作坊' },
  { civilian: '加班', undercover: '輪班' },
  { civilian: '遠距工作', undercover: '混合辦公' },
  { civilian: '迷因', undercover: '梗圖' },
  { civilian: '直播', undercover: '預錄影片' },
  { civilian: 'Podcast', undercover: '有聲書' },
  { civilian: '手沖咖啡', undercover: '義式濃縮' },
  { civilian: '麻辣鍋', undercover: '酸菜白肉鍋' },
  { civilian: '鹹酥雞', undercover: '炸雞排' },
]

const RECENT_CIVILIAN_CAP = 45

export function getRandomWordPair(): UndercoverWords {
  return pickWordPair([])
}

/**
 * 從題庫隨機抽一組；會盡量避開 recentCivilians 裡出現過的平民詞。
 */
export function pickWordPair(recentCivilians: string[]): UndercoverWords {
  const avoid = new Set(recentCivilians.filter(Boolean))
  const candidates = UNDERCOVER_WORD_PAIRS.filter((p) => !avoid.has(p.civilian))
  const pool = candidates.length > 0 ? candidates : UNDERCOVER_WORD_PAIRS
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

export function appendRecentCivilian(recent: string[] | undefined, civilian: string): string[] {
  const next = [...(recent || []), civilian]
  return next.length > RECENT_CIVILIAN_CAP ? next.slice(-RECENT_CIVILIAN_CAP) : next
}

