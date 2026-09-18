export type Special = 'striped-h' | 'striped-v' | 'wrapped' | 'bomb';
export interface Candy { id: number; color: number; special?: Special; item?: boolean }
export type BlockerKind = 'ice' | 'chocolate' | 'box' | 'stone' | 'lock';
export interface Blocker { kind: BlockerKind; hp: number; maxHp: number }
export interface Cell { candy: Candy | null; blocker?: Blocker }
export type Board = (Cell | null)[][];
export interface Position { r: number; c: number }
export const key = (p: Position) => `${p.r},${p.c}`;
export const position = (k: string): Position => { const [r,c] = k.split(',').map(Number); return {r,c}; };
