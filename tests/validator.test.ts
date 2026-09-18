import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReplay } from '../src/game/validator';
import { Game } from '../src/game/Game';
import { getLevel } from '../src/levels';
test('server recomputes a winning score from seed and accepted actions',async()=>{const g=new Game(getLevel(1),1);while(g.phase==='IDLE'){const [a,b]=g.hint()!;await g.act({type:'swap',a,b});}assert.equal(g.phase,'WIN');const result=await validateReplay(1,1,g.actions);assert.equal(result.score,g.score);assert.ok(result.stars>=1);});
test('replay rejects fake, unfinished, post-win and excessive booster actions',async()=>{await assert.rejects(()=>validateReplay(1,1,[]));await assert.rejects(()=>validateReplay(1,1,[{type:'swap',a:{r:0,c:0},b:{r:8,c:8}}]));await assert.rejects(()=>validateReplay(1,1,Array.from({length:4},()=>({type:'shuffle'}))));await assert.rejects(()=>validateReplay(1,1,[{type:'hack',score:9999999}]));await assert.rejects(()=>validateReplay(1,1,[{type:'hammer',at:{r:NaN,c:0}}]));const g=new Game(getLevel(1),1);while(g.phase==='IDLE'){const [a,b]=g.hint()!;await g.act({type:'swap',a,b});}await assert.rejects(()=>validateReplay(1,1,[...g.actions,{type:'shuffle'}]));});
