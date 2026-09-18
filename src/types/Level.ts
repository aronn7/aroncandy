import type { BlockerKind, Position } from './Candy';
export type ObjectiveKind = 'score' | 'collect' | 'breakIce' | 'breakBlockers' | 'drop';
export interface ObjectiveConfig { type: ObjectiveKind; amount: number; color?: number; blocker?: BlockerKind }
export interface LevelConfig { id: number; name: string; world: number; moves: number; board: number[][]; candyTypes: number; objectives: ObjectiveConfig[]; blockers: (Position & {kind: BlockerKind; hp: number})[]; stars: [number,number,number]; chocolateSpreads: boolean; items: Position[]; spawnWeights?: number[]; tip: string }
