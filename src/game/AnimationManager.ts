export class AnimationManager {
 private controller=new AbortController();
 wait(ms:number){return new Promise<void>(resolve=>{if(this.controller.signal.aborted){resolve();return;}const done=()=>{clearTimeout(timer);this.controller.signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,ms);this.controller.signal.addEventListener('abort',done,{once:true});});}
 get cancelled(){return this.controller.signal.aborted;}
 destroy(){this.controller.abort();}
}
