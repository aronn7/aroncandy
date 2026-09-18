import { key,position,type Board,type Position } from '../types/Candy';
import { at,neighbors } from './Tile';
import { record,type Objective } from './ObjectiveSystem';
export function hitBlockers(b:Board,hits:Set<string>,objectives:Objective[]):boolean{
 const targets=new Set(hits);for(const k of hits)for(const p of neighbors(b,position(k)))if(at(b,p)?.blocker?.kind!=='ice')targets.add(key(p));
 let chocolateBroken=false;for(const k of targets){const cell=at(b,position(k));if(!cell?.blocker)continue;const blocker=cell.blocker;blocker.hp--;if(blocker.hp<=0){record(objectives,blocker.kind==='ice'?'breakIce':'breakBlockers',1,undefined,blocker.kind);chocolateBroken ||=blocker.kind==='chocolate';delete cell.blocker;}}
 return chocolateBroken;
}
export function spreadChocolate(b:Board,random:()=>number):Position|undefined{const targets:Position[]=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(b[r][c]?.blocker?.kind==='chocolate')for(const p of neighbors(b,{r,c})){const v=at(b,p);if(v&&!v.blocker&&!v.candy?.item&&!v.candy?.special)targets.push(p);}const p=targets[Math.floor(random()*targets.length)];if(p){const cell=at(b,p)!;cell.candy=null;cell.blocker={kind:'chocolate',hp:1,maxHp:1};}return p;}
