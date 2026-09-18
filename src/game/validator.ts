import { Game,type Action } from './Game';
import { getLevel,LEVELS } from '../levels';
import { starsFor } from './ScoreSystem';
export const RANKED_BOOSTER_LIMITS={hammer:3,shuffle:2,rainbow:1};
export async function validateReplay(levelId:number,seed:number,input:unknown){
 if(!Number.isInteger(levelId)||levelId<1||levelId>LEVELS.length)throw new Error('Invalid level');
 if(!Array.isArray(input)||input.length===0||input.length>150)throw new Error('Invalid action count');
 const game=new Game(getLevel(levelId),seed),used={hammer:0,shuffle:0,rainbow:0};
 const pos=(v:unknown)=>{if(!v||typeof v!=='object')return false;const p=v as {r:number;c:number};return Number.isInteger(p.r)&&Number.isInteger(p.c)&&p.r>=0&&p.r<9&&p.c>=0&&p.c<9;};
 for(const candidate of input){
  if(!candidate||typeof candidate!=='object')throw new Error('Invalid action');const a=candidate as Action;
  if(a.type==='swap'){if(!pos(a.a)||!pos(a.b))throw new Error('Invalid coordinates');}
  else if(a.type==='hammer'||a.type==='rainbow'||a.type==='shuffle'){if(++used[a.type]>RANKED_BOOSTER_LIMITS[a.type])throw new Error('Booster budget exceeded');if(a.type!=='shuffle'&&!pos(a.at))throw new Error('Invalid coordinates');}
  else throw new Error('Unknown action');
  const count=game.actions.length;await game.act(a);if(game.actions.length!==count+1)throw new Error('Rejected or post-terminal action');
 }
 if(game.phase!=='WIN')throw new Error('Objectives not completed');
 return {score:game.score,stars:starsFor(game.score,game.level.stars),movesUsed:game.level.moves-game.moves,level:levelId};
}
