export const BOOSTERS = {hammer:{name:'Hammer',description:'Hancurkan satu candy atau satu lapisan blocker.',cost:75},shuffle:{name:'Shuffle',description:'Acak candy tanpa memakai langkah.',cost:100},rainbow:{name:'Rainbow',description:'Pilih candy untuk menghapus semua warnanya.',cost:150}} as const;
export type BoosterType = keyof typeof BOOSTERS;
