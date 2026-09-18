import type { Board } from '../types/Candy';
import type { LevelConfig } from '../types/Level';
import { SpawnSystem } from './SpawnSystem';
import { solid } from './Tile';
export function createBoard(level:LevelConfig,spawn:SpawnSystem):Board{
 const b:Board=level.board.map(row=>row.map(v=>v?{candy:null}:null));
 for(const p of level.blockers){const cell=b[p.r]?.[p.c];if(cell)cell.blocker={kind:p.kind,hp:p.hp,maxHp:p.hp};}
 for(let r=0;r<b.length;r++)for(let c=0;c<b[r].length;c++){const cell=b[r][c];if(!cell||solid(cell))continue;const exclude:number[]=[];if(c>1&&b[r][c-1]?.candy?.color===b[r][c-2]?.candy?.color)exclude.push(b[r][c-1]?.candy?.color??-1);if(r>1&&b[r-1][c]?.candy?.color===b[r-2][c]?.candy?.color)exclude.push(b[r-1][c]?.candy?.color??-1);cell.candy=spawn.candy(exclude);}
 for(const p of level.items){const cell=b[p.r]?.[p.c];if(cell&&!solid(cell))cell.candy={...spawn.candy(),item:true};}
 return b;
}
export const cloneBoard=(b:Board):Board=>b.map(row=>row.map(cell=>cell?{candy:cell.candy?{...cell.candy}:null,...(cell.blocker?{blocker:{...cell.blocker}}:{})}:null));
