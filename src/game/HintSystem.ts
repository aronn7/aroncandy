import type { Board, Position } from '../types/Candy';
import { detectMatches } from './MatchDetector';
import { canSwap, exchange, specialSwap } from './SwapManager';
export function possibleMoves(b:Board):[Position,Position][]{const moves:[Position,Position][]=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const z of [{r:r+1,c},{r,c:c+1}]){const a={r,c};if(!canSwap(b,a,z))continue;if(specialSwap(b,a,z)){moves.push([a,z]);continue;}exchange(b,a,z);const valid=detectMatches(b).some(m=>m.cells.some(p=>(p.r===a.r&&p.c===a.c)||(p.r===z.r&&p.c===z.c)));exchange(b,a,z);if(valid)moves.push([a,z]);}return moves;}
