import { comboMultiplier } from './ComboSystem';
export const matchScore=(count:number,chain:number)=>Math.round((count>=5?500:count===4?250:100)*comboMultiplier(chain));
export const starsFor=(score:number,thresholds:number[])=>Math.max(1,thresholds.filter(t=>score>=t).length);
