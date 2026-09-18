import type { Candy } from '../types/Candy';
export class SpawnSystem {
 private id=0; private seed:number;
 constructor(seed:number,readonly colors:number,readonly weights?:number[]){this.seed=seed>>>0;}
 random=()=>{this.seed+=0x6D2B79F5;let t=this.seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 color(){if(!this.weights)return Math.floor(this.random()*this.colors);const total=this.weights.slice(0,this.colors).reduce((a,b)=>a+b,0);let v=this.random()*total;for(let i=0;i<this.colors;i++){v-=this.weights[i]??1;if(v<0)return i;}return this.colors-1;}
 candy(excluded:number[]=[]):Candy{let color=this.color();for(let n=0;excluded.includes(color)&&n<50;n++)color=this.color();if(excluded.includes(color))color=Array.from({length:this.colors},(_,i)=>i).find(c=>!excluded.includes(c))??0;return {id:++this.id,color};}
}
