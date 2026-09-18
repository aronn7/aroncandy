import type { Board, Cell, Position } from '../types/Candy';
export const solid=(cell:Cell|null|undefined)=>!!cell?.blocker&&['box','stone','chocolate'].includes(cell.blocker.kind);
export const movable=(cell:Cell|null|undefined)=>!!cell?.candy&&!cell.blocker;
export const at=(b:Board,p:Position)=>b[p.r]?.[p.c];
export const neighbors=(b:Board,p:Position):Position[]=>[{r:p.r-1,c:p.c},{r:p.r+1,c:p.c},{r:p.r,c:p.c-1},{r:p.r,c:p.c+1}].filter(q=>!!at(b,q));
