import type { LevelConfig, ObjectiveConfig } from '../types/Level';
import type { BlockerKind, Position } from '../types/Candy';

export const WORLDS = [
    { name: 'Candy Garden', subtitle: 'Awal yang manis', color: '#f1d7ea', icon: 'flower' },
    { name: 'Sugar Valley', subtitle: 'Es mulai bermunculan', color: '#fdeee3', icon: 'cookie' },
    { name: 'Cookie Village', subtitle: 'Renyah dan penuh kotak', color: '#f3e3cf', icon: 'cookie' },
    { name: 'Chocolate Town', subtitle: 'Cokelat menyebar, cepat!', color: '#efdbcb', icon: 'cookie' },
    { name: 'Jelly Forest', subtitle: 'Buka gemboknya pelan-pelan', color: '#d6eadc', icon: 'leaf' },
    { name: 'Ice Kingdom', subtitle: 'Es berlapis menantimu', color: '#d8e9f9', icon: 'snow' },
    { name: 'Sweet Sky', subtitle: 'Kirim bintang ke bawah', color: '#e3ecfd', icon: 'star' },
    { name: 'Rainbow World', subtitle: 'Strategi special candy', color: '#f4e6fa', icon: 'rainbow' },
    { name: 'Dark Chocolate Castle', subtitle: 'Gelap, manis, dan sulit', color: '#e2d5d0', icon: 'crown' },
    { name: 'Aron Candy Kingdom', subtitle: 'Tantangan terakhir yang manis', color: '#e8dafa', icon: 'crown' },
];

export const SHAPES: Record<string, (r: number, c: number) => boolean> = {
    square: () => true, diamond: (r, c) => Math.abs(r - 4) + Math.abs(c - 4) <= 5,
    cross: (r, c) => (r >= 2 && r <= 6) || (c >= 2 && c <= 6), heart: (r, c) => r < 2 ? (c > 0 && c < 8 && c !== 4) : r < 5 ? true : Math.abs(c - 4) <= 8 - r,
    x: (r, c) => Math.abs(r - c) <= 1 || Math.abs(8 - r - c) <= 1,
    split: (_r, c) => c !== 4, hole: (r, c) => !(r >= 3 && r <= 5 && c >= 3 && c <= 5),
    paths: (r, c) => c < 3 || c > 5 || (r >= 3 && r <= 5), islands: (r, c) => r !== 4 && c !== 4,
    asymmetric: (r, c) => !(r < 3 && c < 3) && !(r > 6 && c > 5),
    rings: (r, c) => Math.abs(r - 4) <= 3 && Math.abs(c - 4) <= 3 && !(Math.abs(r - 4) === 1 && Math.abs(c - 4) === 1 && r >= 2 && r <= 6 && c >= 2 && c <= 6),
    tower: (r, c) => r >= 2 || !(c >= 3 && c <= 5),
    arena: (r, c) => !(r > 2 && r < 6 && c > 2 && c < 6) || r === 4 || c === 4,
    gate: (r, c) => (c >= 2 && c <= 6) || (r >= 3 && r <= 5),
};

const NAMES: string[][] = [
    ['Hello, sweetness', 'Heart to heart', 'Starry surprise', 'A sweeter shape', 'Garden party', 'Petal match', 'Blossom breeze', 'Sweet six', 'Rosy path', 'Garden finale'],
    ['First frost', 'Sugar & ice', 'Frozen wishes', 'Cool crossroads', 'Chill steps', 'Icy lanes', 'Thaw and match', 'Frost garden', 'Slippery slope', 'Valley crown'],
    ['Crumb court', 'Unbox the magic', 'Two little worlds', 'Cookie lanes', 'Batch of four', 'Doughy depths', 'Crunchy corners', 'Sprinkle squares', 'Oven fresh', 'Village feast'],
    ['Cocoa drift', 'Chocolate dreams', 'Chocolate escape', 'Meltdown', 'Truffle trouble', 'Bitter bar', 'Dark drizzle', 'Molten lane', 'Cocoa castle', 'Sweet surrender'],
    ['Jelly bokeh', 'Unlock a little joy', 'The secret garden', 'Wobbly walk', 'Jelly jars', 'Locked blooms', 'Forest maze', 'Glowing glade', 'Jelly jubilee', 'Forest crown'],
    ['Crystal courage', 'Frozen core', 'Layered lake', 'Ice vault', 'Frostbite', 'Glacier gate', 'Winter lock', 'Frozen throne', 'Permafrost', 'Kingdom crest'],
    ['Cloud hopper', 'Golden delivery', 'Sky garden', 'Parcel parade', 'Updraft', 'Star bridge', 'Wind lanes', 'Sky shower', 'Comet mail', 'Sky farewell'],
    ['Prism path', 'Spectrum square', 'Rainbow road', 'Chromatic crew', 'Color theory', 'Prism locks', 'Spectral six', 'Rainbow roast', 'Full spectrum', 'Rainbow reign'],
    ['Bitter walls', 'Midnight snack', 'Castle gates', 'Dark corridors', 'Bitter frost', 'Stone heart', 'Locked tower', 'Cocoa crypt', 'Castle siege', 'Dark crown'],
    ['Royal court', 'Kingdom keys', 'Sugar siege', 'Candy coronation', 'Royal freezer', 'Gilded court', 'Enchanted cage', 'Throne room', 'Last march', 'Kingdom finale'],
];

const TIPS: Record<string, string> = {
    ice: 'Cocokkan candy di bawah es. Es berlapis perlu dua hit.',
    box: 'Match di samping kotak untuk memecahkannya.',
    chocolate: 'Hancurkan cokelat tiap langkah agar tidak menyebar.',
    lock: 'Match di samping gembok untuk membuka candy.',
    stone: 'Match di samping batu dua kali untuk menghancurkannya.',
    none: 'Match 4 membuat striped candy. Match 5 membuat color bomb.',
};

interface Mech { kind?: BlockerKind; count?: (id: number) => number; hp?: (n: number, id: number) => number; secondary?: BlockerKind; secondaryCount?: (id: number) => number; secondaryHp?: (n: number, id: number) => number }
/** Difficulty pulse per step 0..9: easy→hard→PEAK→relax — a fair curve with recovery levels. */
const MECH: Mech[] = [
    {},                                                                                       // 1-10 basic
    { kind: 'ice', count: id => 6 + Math.floor(id / 6), hp: (n, id) => id > 25 && n % 3 === 0 ? 2 : 1 },                  // 11-20 ice
    { kind: 'box', count: id => 7 + Math.floor(id / 7), secondary: 'ice', secondaryCount: id => id > 25 ? 4 : 0, hp: (n, id) => id > 26 && n % 2 === 0 ? 2 : 1 }, // 21-30 box+ice
    { kind: 'chocolate', count: id => 5 + Math.floor(id / 8), secondary: 'box', secondaryCount: id => id > 35 ? 4 : 0 }, // 31-40 chocolate+box
    { kind: 'lock', count: id => 6 + Math.floor(id / 6), secondary: 'ice', secondaryCount: id => id > 45 ? 5 : 0 },  // 41-50 lock+ice
    { kind: 'ice', count: id => 8 + Math.floor(id / 5), hp: () => 2, secondary: 'lock', secondaryCount: id => 3 + Math.floor(id / 12) }, // 51-60 layered ice+lock
    {},                                                                                       // 61-70 drop items (no blockers)
    { kind: 'lock', count: id => 5 + Math.floor(id / 7), secondary: 'ice', secondaryCount: id => id > 75 ? 8 : 0, hp: () => 1, secondaryHp: (n, id) => id > 75 && n % 2 === 0 ? 2 : 1 }, // 71-80
    { kind: 'chocolate', count: id => 5 + Math.floor(id / 8), secondary: 'stone', secondaryCount: id => 4 + Math.floor(id / 10), secondaryHp: () => 2 }, // 81-90
    { kind: 'ice', count: () => 9, hp: () => 2, secondary: 'stone', secondaryCount: id => id >= 100 ? 6 : 4, secondaryHp: () => 2 }, // 91-100 expert
];

const shapeFor = (id: number) => { const catalog = ['square', 'square', 'diamond', 'heart', 'cross', 'hole', 'x', 'split', 'islands', 'paths', 'asymmetric', 'rings', 'tower', 'arena', 'gate']; const shape = catalog[(id * 7 + Math.floor(id / 10) * 3) % catalog.length]; return shape; };

/** Deterministic shuffle from level id (levels must be reproducible — no Math.random). */
function takeSlots(slots: { r: number; c: number }[], id: number) {
    const pool = [...slots]; let s = (id * 2654435761) >>> 0; for (let i = 0; i < pool.length; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; const j = (s + i) % pool.length;[pool[i], pool[j]] = [pool[j], pool[i]]; }
    return (n: number): Position[] => pool.splice(0, n).map(p => ({ ...p }));
}

const movesFor = (id: number): number => { const w = Math.floor((id - 1) / 10); const step = (id - 1) % 10; const peak = [0, 0, 1, 1, 2, 1, 2, 2, 3, 3][step]; const relax = step === 9 ? 6 : 0; return Math.max(16, 22 + Math.min(10, w) + peak * 3 - Math.floor(step / 4) * 2 + relax); };

const build = (id: number): LevelConfig => {
    const w = Math.min(9, Math.floor((id - 1) / 10));
    const mech = MECH[w];
    const shape = shapeFor(id);
    const board0 = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => +SHAPES[shape](r, c)));
    const w0 = Math.min(9, Math.floor((id - 1) / 10));
    const mech0 = MECH[w0];
    const need0 = (mech0.kind ? mech0.count ? mech0.count(id) : 6 : 0) + (mech0.secondary ? mech0.secondaryCount?.(id) ?? 4 : 0);
    // Keep enough free space: fall back to roomier shapes when blockers would crowd the board.
    const openInterior = board0.flat().reduce((n, v, i) => n + (v && Math.floor(i / 9) > 0 && Math.floor(i / 9) < 8 && i % 9 > 0 && i % 9 < 8 ? 1 : 0), 0);
    const finalShape = openInterior - need0 < 26 && shape !== 'square' ? (id % 2 ? 'diamond' : 'cross') : shape;
    const board = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => +SHAPES[finalShape](r, c)));
    const slots = board.flatMap((row, r) => row.flatMap((v, c) => v && r > 0 && r < 8 && c > 0 && c < 8 ? [{ r, c }] : []));
    const take = takeSlots(slots, id);
    const candyTypes = id < 6 ? 5 : 6;
    const blockers: LevelConfig['blockers'] = [];
    if (mech.kind) take(mech.count ? mech.count(id) : 6).forEach((p, n) => blockers.push({ ...p, kind: mech.kind!, hp: mech.hp ? mech.hp(n, id) : 1 }));
    if (mech.secondary) take(mech.secondaryCount?.(id) ?? 4).forEach((p, n) => blockers.push({ ...p, kind: mech.secondary!, hp: mech.secondaryHp ? mech.secondaryHp(n, id) : 1 }));
    const items: Position[] = [];
    const wantsDrop = (w === 6 && id % 10 >= 3) || id === 100;
    if (wantsDrop) take(3).forEach(p => items.push(p));
    const objectives: ObjectiveConfig[] = [];
    if (id === 1) objectives.push({ type: 'score', amount: 1200 });
    else if (id === 100) { objectives.push({ type: 'collect', color: 0, amount: 20 }, { type: 'collect', color: 2, amount: 20 }, { type: 'breakBlockers', blocker: 'stone', amount: 6 }, { type: 'drop', amount: 3 }); }
    else if (wantsDrop) objectives.push({ type: 'drop', amount: 3 }, { type: 'collect', color: id % candyTypes, amount: 16 + Math.floor(id / 12) });
    else objectives.push({ type: 'collect', color: id % candyTypes, amount: 14 + Math.floor(id / 8) });
    if (mech.kind && id !== 100) objectives.push({ type: mech.kind === 'ice' ? 'breakIce' : 'breakBlockers', blocker: mech.kind, amount: blockers.filter(b => b.kind === mech.kind).length });
    if (mech.secondary && id % 3 !== 0) objectives.push({ type: mech.secondary === 'ice' ? 'breakIce' : 'breakBlockers', blocker: mech.secondary, amount: blockers.filter(b => b.kind === mech.secondary).length });
    const base = 1200 + 140 * (id - 1);
    return { id, name: NAMES[w][(id - 1) % 10], world: w, moves: movesFor(id), board, candyTypes, objectives, blockers, stars: [base, Math.round(base * 1.8), Math.round(base * 2.6)], chocolateSpreads: mech.kind === 'chocolate' || id >= 91, items, tip: TIPS[mech.kind ?? 'none'] };
}

export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, i) => build(i + 1));
export const getLevel = (id: number) => LEVELS.find(l => l.id === id) ?? LEVELS[0];
