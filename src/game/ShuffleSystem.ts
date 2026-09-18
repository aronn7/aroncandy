import type { Board } from '../types/Candy';
import type { SpawnSystem } from './SpawnSystem';
import { possibleMoves } from './HintSystem';
import { detectMatches } from './MatchDetector';
export function shuffle(b:Board,spawn:SpawnSystem):boolean{
 const cells=b.flat().filter(cell=>cell?.candy&&!cell.candy.item&&!cell.blocker);
 const candies=cells.map(cell=>cell!.candy!);
 for(let attempt=0;attempt<300;attempt++){
  for(let i=candies.length-1;i>0;i--){const j=Math.floor(spawn.random()*(i+1));[candies[i],candies[j]]=[candies[j],candies[i]];}
  cells.forEach((cell,i)=>{cell!.candy=candies[i];});
  if(!detectMatches(b).length&&possibleMoves(b).length)return true;
 }
 // Regenerate colors as a bounded fallback; preserve special identities and blockers.
 for(let attempt=0;attempt<300;attempt++){
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){const cell=b[r][c];if(!cell?.candy||cell.blocker||cell.candy.item)continue;const excluded:number[]=[];if(c>1&&b[r][c-1]?.candy?.color===b[r][c-2]?.candy?.color)excluded.push(b[r][c-1]?.candy?.color??-1);if(r>1&&b[r-1][c]?.candy?.color===b[r-2][c]?.candy?.color)excluded.push(b[r-1][c]?.candy?.color??-1);cell.candy.color=spawn.candy(excluded).color;}
  if(!detectMatches(b).length&&possibleMoves(b).length)return true;
 }return false;
}
