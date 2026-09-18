import type { Board, Position } from '../types/Candy';
import { at,movable } from './Tile';
export const adjacent=(a:Position,b:Position)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
export const canSwap=(b:Board,a:Position,z:Position)=>adjacent(a,z)&&movable(at(b,a))&&movable(at(b,z));
export function exchange(b:Board,a:Position,z:Position){const x=at(b,a),y=at(b,z);if(x&&y)[x.candy,y.candy]=[y.candy,x.candy];}
export const specialSwap=(b:Board,a:Position,z:Position)=>{const x=at(b,a)?.candy,y=at(b,z)?.candy;return !!x&&!x.item&&!!y&&!y.item&&(x.special==='bomb'||y.special==='bomb'||!!x.special&&!!y.special);};
