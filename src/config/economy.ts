/** ARONCANDY economy — single source of truth for balance. Tune here after playtesting. */
export const MAX_LIVES = 5;
export const REWARDS = {
  /** Base coin reward when a level is completed. */
  levelComplete: 50,
  /** Bonus coins per star earned (applied once per star). */
  perStar: 15,
  /** Three-star bonus on top of per-star coins. */
  threeStarBonus: 0,
  /** Extra coins the very first time a level is cleared. */
  firstClear: 20,
  /** Small reward for replays of already-cleared levels. */
  replay: 10,
} as const;
export const SHOP = {
  heart_1: { label: '+1 Heart', description: 'Satu hati untuk satu kesempatan.', amount: 1, price: 100, icon: 'heart1' },
  heart_2: { label: '+2 Hearts', description: 'Dua hati sekaligus, lebih hemat.', amount: 2, price: 180, icon: 'heart2' },
  heart_refill: { label: 'Full Refill', description: 'Isi semua hati sampai penuh.', amount: MAX_LIVES, price: 350, icon: 'refill', refill: true },
} as const;
export type ShopKey = keyof typeof SHOP;
