import { key,position,type Board,type Position,type Special } from '../types/Candy';
import { at } from './Tile';
import type { Match } from './MatchDetector';
export function specialFor(m:Match):Special|undefined{return m.longest>=5?'bomb':m.horizontal&&m.vertical?'wrapped':m.cells.length>=4?(m.horizontal?'striped-h':'striped-v'):undefined;}
const row=(b:Board,r:number)=>b[r]?.flatMap((v,c)=>v?[key({r,c})]:[])??[];
const column=(b:Board,c:number)=>b.flatMap((rr,r)=>rr[c]?[key({r,c})]:[]);
const area=(b:Board,p:Position,radius:number)=>b.flatMap((rr,r)=>rr.flatMap((v,c)=>v&&Math.abs(r-p.r)<=radius&&Math.abs(c-p.c)<=radius?[key({r,c})]:[]));
export function expandSpecials(b:Board,hits:Set<string>,skipBombs=false):Set<string>{const result=new Set(hits),seen=new Set<string>();let changed=true;while(changed){changed=false;for(const k of [...result]){if(seen.has(k))continue;seen.add(k);const p=position(k),candy=at(b,p)?.candy;if(!candy?.special||(skipBombs&&candy.special==='bomb'))continue;const targets=candy.special==='striped-h'?row(b,p.r):candy.special==='striped-v'?column(b,p.c):candy.special==='wrapped'?area(b,p,1):b.flatMap((rr,r)=>rr.flatMap((v,c)=>v?.candy?.color===candy.color?[key({r,c})]:[]));for(const t of targets)if(!result.has(t)){result.add(t);changed=true;}}}return result;}
export function specialCombination(b:Board,a:Position,z:Position):Set<string>{
 const x=at(b,a)!.candy!,y=at(b,z)!.candy!;const hits=new Set([key(a),key(z)]);
 if(x.special==='bomb'||y.special==='bomb'){
  if(x.special==='bomb'&&y.special==='bomb'){b.forEach((rr,r)=>rr.forEach((v,c)=>{if(v)hits.add(key({r,c}));}));}
  else {const target=x.special==='bomb'?y:x;b.forEach((rr,r)=>rr.forEach((v,c)=>{if(v?.candy?.color===target.color&&!v.candy.item){if(target.special)v.candy.special=target.special==='wrapped'?'wrapped':(r+c)%2?'striped-h':'striped-v';hits.add(key({r,c}));}}));}
 }else if(x.special==='wrapped'&&y.special==='wrapped')area(b,z,2).forEach(k=>hits.add(k));
 else if(x.special==='wrapped'||y.special==='wrapped'){for(let d=-1;d<=1;d++){row(b,z.r+d).forEach(k=>hits.add(k));if(z.c+d>=0&&z.c+d<9)column(b,z.c+d).forEach(k=>hits.add(k));}}
 else{row(b,z.r).forEach(k=>hits.add(k));column(b,z.c).forEach(k=>hits.add(k));}
 return expandSpecials(b,hits,true);
}
