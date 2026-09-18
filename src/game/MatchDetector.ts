import { key, type Board, type Position } from '../types/Candy';
export interface Match { cells:Position[]; horizontal:boolean; vertical:boolean; longest:number }
export function detectMatches(b:Board):Match[]{
 const runs:Match[]=[];
 const color=(r:number,c:number)=>{const v=b[r]?.[c]?.candy;return !v||v.item||v.special==='bomb'?-1:v.color;};
 for(const vertical of [false,true])for(let lane=0;lane<9;lane++){
  let start=0;while(start<9){let end=start+1;const x=color(vertical?start:lane,vertical?lane:start);while(x>=0&&end<9&&color(vertical?end:lane,vertical?lane:end)===x)end++;
   if(x>=0&&end-start>=3)runs.push({cells:Array.from({length:end-start},(_,j)=>({r:vertical?start+j:lane,c:vertical?lane:start+j})),horizontal:!vertical,vertical,longest:end-start});start=end;
  }
 }
 for(let i=0;i<runs.length;i++)for(let j=i+1;j<runs.length;j++)if(runs[i].cells.some(a=>runs[j].cells.some(z=>key(a)===key(z)))){const a=runs[i],z=runs[j];a.cells=[...new Map([...a.cells,...z.cells].map(p=>[key(p),p])).values()];a.horizontal ||=z.horizontal;a.vertical ||=z.vertical;a.longest=Math.max(a.longest,z.longest);runs.splice(j,1);i=-1;break;}
 return runs;
}
