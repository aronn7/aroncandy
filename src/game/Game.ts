import { key,position,type Board,type Position } from '../types/Candy';
import type { LevelConfig } from '../types/Level';
import { createBoard,cloneBoard } from './Board';
import { SpawnSystem } from './SpawnSystem';
import { detectMatches,type Match } from './MatchDetector';
import { canSwap,exchange,specialSwap } from './SwapManager';
import { gravity,dropItems } from './GravitySystem';
import { possibleMoves } from './HintSystem';
import { shuffle } from './ShuffleSystem';
import { objectivesComplete,record,recordScore,type Objective } from './ObjectiveSystem';
import { specialFor,expandSpecials,specialCombination } from './SpecialCandySystem';
import { hitBlockers,spreadChocolate } from './BlockerSystem';
import { matchScore } from './ScoreSystem';
import { comboLabel } from './ComboSystem';
import { at } from './Tile';
export type Phase='IDLE'|'SWAPPING'|'MATCHING'|'DESTROYING'|'FALLING'|'SHUFFLING'|'WIN'|'LOSE'|'ERROR'|'FINALE_START'|'CONVERTING_MOVES'|'BONUS_SPECIAL_READY'|'BONUS_ACTIVATING'|'BONUS_CASCADE'|'FINALE_COMPLETE';
export interface Frame{board:Board;phase:Phase;score:number;moves:number;objectives:Objective[];chain:number;hits:string[];message:string;duration:number;finale?:boolean;burstAt?:string;bonusText?:string;star?:number}
export type Action={type:'swap';a:Position;b:Position}|{type:'hammer'|'rainbow';at:Position}|{type:'shuffle'};
export class Game {
 board:Board;score=0;moves:number;objectives:Objective[];phase:Phase='IDLE';chain=0;actions:Action[]=[];
 private spawn:SpawnSystem;private frames:Frame[]=[];private chocolateBroken=false;private finaleRandom:()=>number;
 constructor(readonly level:LevelConfig,readonly seed:number){this.spawn=new SpawnSystem(seed,level.candyTypes,level.spawnWeights);this.board=createBoard(level,this.spawn);this.moves=level.moves;this.objectives=level.objectives.map(o=>({...o,current:0}));this.finaleRandom=this.spawn.random;if(!possibleMoves(this.board).length&&!shuffle(this.board,this.spawn))this.phase='ERROR';}
 snapshot(phase:Phase=this.phase,message='',hits:string[]=[],duration=0):Frame{return {board:cloneBoard(this.board),phase,score:this.score,moves:this.moves,objectives:this.objectives.map(o=>({...o})),chain:this.chain,hits,message,duration};}
 private emit(phase:Phase,duration=200,message='',hits:string[]=[]){this.phase=phase;this.frames.push(this.snapshot(phase,message,hits,duration));}
 async act(action:Action):Promise<Frame[]>{
  if(this.phase!=='IDLE')return [];
  this.frames=[];this.chain=0;this.chocolateBroken=false;
  if(action.type==='swap'){
   if(!canSwap(this.board,action.a,action.b))return [];
   const special=specialSwap(this.board,action.a,action.b);exchange(this.board,action.a,action.b);this.emit('SWAPPING',170);
   const matches=detectMatches(this.board);
   if(!special&&!matches.length){exchange(this.board,action.a,action.b);this.emit('SWAPPING',220,'Coba pasangan lain');this.emit('IDLE',0);return this.frames;}
   this.moves--;this.actions.push(action);
   if(special){this.chain=1;this.clear(specialCombination(this.board,action.a,action.b),[],undefined,true);this.fall();}
   this.resolve(special?undefined:action.b);
   if(this.level.chocolateSpreads&&!this.chocolateBroken&&spreadChocolate(this.board,this.spawn.random))this.emit('FALLING',180,'Cokelat tumbuh!');
  }else if(action.type==='shuffle'){this.actions.push(action);this.emit('SHUFFLING',240,'A little remix!');if(!shuffle(this.board,this.spawn)){this.emit('ERROR',0,'Papan tidak dapat diacak. Silakan ulangi level.');return this.frames;}this.emit('FALLING',240);}
  else {
   const cell=at(this.board,action.at);if(!cell||cell.candy?.item||(!cell.candy&&!cell.blocker))return [];
   this.actions.push(action);this.chain=1;const hits=action.type==='hammer'?new Set([key(action.at)]):new Set(this.board.flatMap((rr,r)=>rr.flatMap((v,c)=>v?.candy&&!v.candy.item&&v.candy.color===cell.candy?.color?[key({r,c})]:[])));
   if(action.type==='rainbow'&&!cell.candy){this.actions.pop();return [];}
   if(action.type==='hammer'){const c=at(this.board,action.at);if(c?.candy){record(this.objectives,'collect',1,c.candy.color);c.candy=null;}}
   this.clear(expandSpecials(this.board,hits),[],undefined,true);this.fall();this.resolve();
  }
  if((this.phase as Phase)==='ERROR')return this.frames;
  recordScore(this.objectives,this.score);
  if(objectivesComplete(this.objectives)){await this.sweetFinale();}
  else if(this.moves<=0)this.emit('LOSE',260,'Sedikit lagi!');
  else {if(!possibleMoves(this.board).length){this.emit('SHUFFLING',360,'No more moves! Mengacak candy…');if(!shuffle(this.board,this.spawn)){this.emit('ERROR',0,'Papan tidak dapat diacak. Silakan ulangi level.');return this.frames;}this.emit('FALLING',220);}this.emit('IDLE',0);}
  return this.frames;
 }
 private resolve(preferred?:Position){let matches=detectMatches(this.board);let iterations=0;while(matches.length){if(++iterations>60){this.emit('SHUFFLING',250,'A little remix!');if(!shuffle(this.board,this.spawn))this.emit('ERROR',0,'Papan tidak dapat diacak.');break;}this.chain++;const hits=expandSpecials(this.board,new Set(matches.flatMap(m=>m.cells.map(key))));this.clear(hits,matches,preferred);preferred=undefined;this.fall();matches=detectMatches(this.board);}}
 private clear(hits:Set<string>,matches:Match[],preferred?:Position,special=false){
  const keep=new Map<string,ReturnType<typeof specialFor>>();
  for(const m of matches){const type=specialFor(m);if(type){const p=m.cells.find(p=>preferred&&key(p)===key(preferred)&&!at(this.board,p)?.blocker&&!at(this.board,p)?.candy?.special)??m.cells.find(p=>!at(this.board,p)?.blocker&&!at(this.board,p)?.candy?.special);if(p)keep.set(key(p),type);}}
  const points=matches.length?matches.reduce((s,m)=>s+matchScore(m.cells.length,this.chain),0):Math.max(100,hits.size*40);
  this.score+=points+(special?300:0);recordScore(this.objectives,this.score);
  this.emit('MATCHING',210,special?'Magic happens!':comboLabel(this.chain),[...hits].filter(k=>!keep.has(k)));
  const broken=hitBlockers(this.board,hits,this.objectives);this.chocolateBroken=broken||this.chocolateBroken;
  // Always hit blockers even when chocolate was already broken earlier in this turn.
  for(const k of hits){const p=position(k),cell=at(this.board,p);if(!cell?.candy||cell.candy.item)continue;if(keep.has(k)){cell.candy.special=keep.get(k);continue;}if(cell.blocker)continue;record(this.objectives,'collect',1,cell.candy.color);cell.candy=null;}
  this.emit('DESTROYING',90);
 }
 private fall(){gravity(this.board,this.spawn);const dropped=dropItems(this.board);if(dropped){record(this.objectives,'drop',dropped);gravity(this.board,this.spawn);}this.emit('FALLING',240);}
 hint(){return possibleMoves(this.board)[0];}
 /** SWEET FINALE — convert remaining moves into striped candies, then chain-detonate them. */
 private async sweetFinale(){
  const remaining=this.moves;
  this.emit('FINALE_START',520,'OBJECTIVE COMPLETE! ✨ Sweet Finale!');
  if(remaining<=0){this.emit('WIN',300,'Sweet success!');return;}
  // Legacy parity: remaining moves collapse to 0 on the win frame (they are spent as bonus).
  this.moves=0;
  // Accelerate when many moves remain so the finale never drags.
  const per=remaining>8?260:remaining>4?340:420;
  const targets:Position[]=[];
  for(let i=0;i<remaining;i++){
   const spot=this.pickFinaleTarget(targets);
   if(!spot)break;targets.push(spot);
   this.moves=remaining-1-i;const cell=this.board[spot.r][spot.c]!;
   cell.candy!.special=(spot.r+spot.c)%2?'striped-h':'striped-v';
   this.score+=500;
   const f=this.snapshot('CONVERTING_MOVES',i===remaining-1?'SWEET FINALE!':'+ SPECIAL!',[key(spot)],per);
   f.finale=true;f.bonusText=i===remaining-1?'SWEET FINALE!':'+ SPECIAL!';f.burstAt=key(spot);this.frames.push(f);
  }
  await 0; // frames are awaited by the presenter, not here
  // Activation: chain reaction — detonate one special at a time so the player sees the cascade.
  const ready=[...targets];const seen=new Set<string>();
  while(ready.length){
   const next=ready.shift()!;const nk=key(next);if(seen.has(nk))continue;seen.add(nk);
   const cell=this.board[next.r]?.[next.c];
   if(!cell?.candy?.special)continue; // already consumed by an earlier blast
   const special=cell.candy.special;
   const hits=special==='striped-h'?new Set(this.board[next.r].flatMap((v,c)=>v?.candy?[key({r:next.r,c})]:[]))
    :new Set(this.board.flatMap((rr,r)=>rr[next.c]?.candy?[key({r,c:next.c})]:[]));
   const expanded=expandSpecials(this.board,new Set([...hits,key(next)]));
   const pulse=this.snapshot('BONUS_ACTIVATING','',[],200);pulse.finale=true;pulse.burstAt=nk;this.frames.push(pulse);
   this.clear(expanded,[],undefined,true);
   this.fall();
   // Chain: any surviving special candy (from blasts keeping them via `keep`) detonates next wave.
   this.board.forEach((row,r)=>row.forEach((cc,c)=>{if(cc?.candy?.special&&!seen.has(key({r,c})))ready.push({r,c});}));
  }
  const done=this.snapshot('FINALE_COMPLETE','',[],350);done.finale=true;done.bonusText='BONUS!';this.frames.push(done);
  this.emit('WIN',420,'Sweet success!');
 }
 /** Pick a random valid normal candy (not blocker, item, special or already chosen). */
 private pickFinaleTarget(taken:Position[]):Position|null{
  const pool:Position[]=[];
  this.board.forEach((row,r)=>row.forEach((cell,c)=>{if(cell?.candy&&!cell.candy.item&&!cell.candy.special&&!cell.blocker&&!taken.some(t=>t.r===r&&t.c===c))pool.push({r,c});}));
  if(!pool.length)return null;
  return pool[Math.floor(this.finaleRandom()*pool.length)];
 }
}
