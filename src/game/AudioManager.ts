import type { Settings } from '../types/Player';
export class AudioManager {
 private context:AudioContext|null=null;private timer:ReturnType<typeof setInterval>|null=null;private step=0;
 settings:Settings={music:true,sfx:true,volume:.45,reducedMotion:false};
 unlock(){try{if(!this.context)this.context=new AudioContext();void this.context.resume();this.music();}catch{/* Silent fallback on unsupported devices. */}}
 configure(settings:Settings){this.settings=settings;this.music();}
 private tone(frequency:number,duration:number,delay=0,volume=.12,type:OscillatorType='sine'){
  const ctx=this.context;if(!ctx||ctx.state!=='running')return;const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume*this.settings.volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 play(kind:'click'|'swap'|'invalid'|'match'|'fall'|'special'|'win'|'lose'|'break',chain=1){if(!this.settings.sfx)return;const notes=kind==='win'?[523,659,784,1047]:kind==='lose'?[392,330,262]:kind==='special'?[523,784,1047,1319]:kind==='invalid'?[240,180]:kind==='break'?[800,500]:kind==='match'?[523+chain*40,784+chain*40]:kind==='swap'?[440,587]:kind==='fall'?[330]:[660];notes.forEach((n,i)=>this.tone(n,.18,i*.075,kind==='fall'?.025:.12,'sine'));}
 private music(){if(this.timer){clearInterval(this.timer);this.timer=null;}if(!this.settings.music||!this.context)return;const tune=[523,0,659,784,659,0,587,0,440,0,523,659,587,0,392,0];this.timer=setInterval(()=>{const n=tune[this.step++%tune.length];if(n)this.tone(n,.55,0,.045,'sine');},440);}
 suspend(){if(this.timer){clearInterval(this.timer);this.timer=null;}void this.context?.suspend();}
 resume(){if(this.context){void this.context.resume();this.music();}}
 destroy(){if(this.timer)clearInterval(this.timer);void this.context?.close();this.context=null;}
}
