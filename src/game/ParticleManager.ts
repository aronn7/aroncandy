interface Particle{x:number;y:number;vx:number;vy:number;life:number;color:string;size:number}
export class ParticleManager{
 private pool:Particle[];private frame=0;private last=0;
 constructor(private canvas:HTMLCanvasElement){
  // Adaptive particle budget: fewer particles on small/low-power devices.
  const cores=navigator.hardwareConcurrency??4,small=Math.min(screen.width,screen.height)<=430,mobile=cores<=6&&small;
  const budget=mobile?Math.round(120*.5):cores<=4?90:120;
   this.pool=Array.from({length:Math.max(30,budget)},()=>({x:0,y:0,vx:0,vy:0,life:0,color:'',size:0}));
  }
  burst(x:number,y:number,color:string){let count=0;for(const p of this.pool)if(p.life<=0){Object.assign(p,{x,y,vx:(Math.random()-.5)*.5,vy:-Math.random()*.35-.1,life:550,color,size:2+Math.random()*3});if(++count===7)break;}if(!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}}
 private tick=(now:number)=>{const dt=Math.min(now-this.last,32);this.last=now;const ctx=this.canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);let alive=false;for(const p of this.pool)if(p.life>0){alive=true;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.001*dt;ctx.globalAlpha=Math.max(0,p.life/550);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;this.frame=alive?requestAnimationFrame(this.tick):0;};
 destroy(){cancelAnimationFrame(this.frame);this.frame=0;}
}
