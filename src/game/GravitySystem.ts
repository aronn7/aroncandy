import type { Board, Candy } from '../types/Candy';
import type { SpawnSystem } from './SpawnSystem';
export function gravity(b:Board,spawn:SpawnSystem){
 for(const row of b)for(const cell of row)if(cell?.blocker?.kind==='ice'&&!cell.candy)cell.candy=spawn.candy();
 for(let c=0;c<9;c++){let r=8;while(r>=0){if(!b[r]?.[c]||b[r][c]?.blocker){r--;continue;}const end=r;while(r>=0&&b[r]?.[c]&&!b[r][c]?.blocker)r--;const top=r+1;const candies:Candy[]=[];for(let y=end;y>=top;y--){const candy=b[y][c]!.candy;if(candy)candies.push(candy);}for(let y=end;y>=top;y--)b[y][c]!.candy=candies[end-y]??spawn.candy();}}
}
export function dropItems(b:Board):number{let count=0;for(let c=0;c<9;c++){let bottom=8;while(bottom>=0&&!b[bottom][c])bottom--;const cell=b[bottom]?.[c];if(cell?.candy?.item){cell.candy=null;count++;}}return count;}
