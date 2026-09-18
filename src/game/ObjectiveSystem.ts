import type { ObjectiveConfig } from '../types/Level';
export interface Objective extends ObjectiveConfig { current:number }
export const objectivesComplete=(objectives:Objective[])=>objectives.every(o=>o.current>=o.amount);
export function record(objectives:Objective[],type:ObjectiveConfig['type'],amount=1,color?:number,blocker?:string){for(const o of objectives)if(o.type===type&&(o.color===undefined||o.color===color)&&(o.blocker===undefined||o.blocker===blocker))o.current=Math.min(o.amount,o.current+amount);}
export function recordScore(objectives:Objective[],score:number){for(const o of objectives)if(o.type==='score')o.current=Math.min(o.amount,score);}
