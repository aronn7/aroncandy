'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Settings,Coins,UserRound,ArrowRight,ChevronLeft,Pause,Lightbulb,Sparkles,ShieldCheck } from 'lucide-react';
import { Game,type Frame,type Action } from '@/game/Game';
import { AnimationManager } from '@/game/AnimationManager';
import { AudioManager } from '@/game/AudioManager';
import { starsFor } from '@/game/ScoreSystem';
import { RANKED_BOOSTER_LIMITS } from '@/game/validator';
import { adjacent } from '@/game/SwapManager';
import { CANDIES } from '@/config/candies';
import { BOOSTERS,type BoosterType } from '@/config/boosters';
import { WORLDS,getLevel } from '@/levels';
import { key,type Position } from '@/types/Candy';
import type { Player } from '@/types/Player';
import { newPlayer,loadProgress,saveProgress,refillLives,winProgress,loseLife,sanitizePlayer } from '@/services/progress';
import { database } from '@/services/database';
import { cloudProgress,syncProgress,startRankedGame,submitRankedGame } from '@/services/leaderboard';
import GameBoard from './GameBoard';
import LevelMap from './LevelMap';
import Objective from './Objective';
import Score from './Score';
import MovesCounter from './MovesCounter';
import BoosterBar from './BoosterBar';
import Lives from './Lives';
import HomeScreen from './HomeScreen';
import GameDialogs,{type Dialog} from './GameDialogs';
type View='home'|'map'|'game';
export default function CandyGame(){
 const [player,setPlayer]=useState<Player>(newPlayer),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(0),[view,setView]=useState<View>('home'),[modal,setModal]=useState<Dialog>(null);
 const [levelId,setLevelId]=useState(1),[frame,setFrame]=useState<Frame|null>(null),[busy,setBusy]=useState(false),[selected,setSelected]=useState<Position|null>(null),[booster,setBooster]=useState<BoosterType|null>(null),[hint,setHint]=useState<Position[]>([]);
 const [toast,setToast]=useState(''),[sessionEmail,setSessionEmail]=useState(''),[cloudReady,setCloudReady]=useState(false),[clock,setClock]=useState(Date.now());
 const game=useRef<Game|null>(null),animator=useRef<AnimationManager|null>(null),audio=useRef<AudioManager|null>(null),busyRef=useRef(false),playerRef=useRef(player),rankedSession=useRef<string|null>(null),modalRef=useRef(modal),viewRef=useRef(view),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),quitTarget=useRef<'map'|'retry'>('map');
 playerRef.current=player;modalRef.current=modal;viewRef.current=view;
 const rankedUsage=useRef({hammer:0,shuffle:0,rainbow:0});
 const level=getLevel(levelId),reducedMotion=player.settings.reducedMotion;
 const visibleBoosters=rankedSession.current?Object.fromEntries(Object.entries(player.boosters).map(([b,n])=>[b,Math.min(n,RANKED_BOOSTER_LIMITS[b as BoosterType]-rankedUsage.current[b as BoosterType])])) as Player['boosters']:player.boosters;
 const notify=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4800);},[]);
 const updatePlayer=useCallback((next:Player|((p:Player)=>Player))=>{const p=typeof next==='function'?next(playerRef.current):next;playerRef.current=p;setPlayer(p);if(!saveProgress(p))notify('Progres belum bisa disimpan. Periksa penyimpanan browser.');},[notify]);
 const open=useCallback((name:Dialog)=>{audio.current?.unlock();audio.current?.play('click');setModal(name);},[]);
 useEffect(()=>{
  const saved=loadProgress();const p={...saved.player,settings:{...saved.player.settings,reducedMotion:saved.player.settings.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches}};playerRef.current=p;setPlayer(p);if(saved.warning)notify(saved.warning);
  audio.current=new AudioManager();audio.current.configure(p.settings);
  let active=true;const assets=[...CANDIES.map(c=>`/assets/optimized/candies/${c.file}.webp`),...['striped','wrapped','color-bomb'].map(f=>`/assets/optimized/special/${f}.webp`),...['ice','box','chocolate','stone','lock'].map(f=>`/assets/optimized/blockers/${f}.webp`),'/assets/optimized/icons/icon.webp'];let complete=0;
  Promise.all(assets.map(src=>new Promise<void>(resolve=>{const img=new Image();img.onload=img.onerror=()=>{if(active)setLoading(Math.round(++complete/assets.length*100));resolve();};img.src=src;}))).then(()=>{if(active)setLoaded(true);});
  const route=window.location.pathname.split('/')[1];if(route==='levels')setView('map');else if(route==='play'){setLevelId(p.currentLevel);setView('map');setModal('intro');}else if(['settings','profile','leaderboard'].includes(route))setModal(route as Dialog);
  const timer=setInterval(()=>{setClock(Date.now());const current=playerRef.current,next=refillLives(current);if(next!==current)updatePlayer(next);},15000);
  const visibility=()=>{if(document.hidden){audio.current?.suspend();if(viewRef.current==='game'&&!modalRef.current)setModal('pause');}else audio.current?.resume();};document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clearInterval(timer);if(toastTimer.current)clearTimeout(toastTimer.current);document.removeEventListener('visibilitychange',visibility);animator.current?.destroy();audio.current?.destroy();};
 },[notify,updatePlayer]);
 useEffect(()=>{audio.current?.configure(player.settings);},[player.settings]);
 useEffect(()=>{
  const db=database();if(!db){setCloudReady(true);return;}let active=true;
  const refresh=async()=>{try{const {data:{session}}=await db.auth.getSession();if(!active)return;setSessionEmail(session?.user.email??'');if(session){const saved=await cloudProgress();if(saved&&active){const remote=sanitizePlayer(saved),local=playerRef.current,base=remote.updatedAt>local.updatedAt?remote:local;const merge=(a:Record<string,number>,b:Record<string,number>)=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(k=>[k,Math.max(a[k]??0,b[k]??0)]));updatePlayer({...base,stars:merge(remote.stars,local.stars),highScores:merge(remote.highScores,local.highScores),unlockedLevels:Math.max(remote.unlockedLevels,local.unlockedLevels)});}}}catch{if(active)notify('Sinkronisasi belum tersedia. Progres tetap disimpan di perangkat ini.');}finally{if(active)setCloudReady(true);}};
  void refresh();const {data:{subscription}}=db.auth.onAuthStateChange(()=>{setTimeout(()=>{if(active)void refresh();},0);});return()=>{active=false;subscription.unsubscribe();};
 },[notify,updatePlayer]);
 useEffect(()=>{if(!loaded||!cloudReady||!sessionEmail)return;const timer=setTimeout(()=>{void syncProgress(player).catch(()=>notify('Koneksi terputus. Progres tersimpan di perangkat ini.'));},800);return()=>clearTimeout(timer);},[player,loaded,cloudReady,sessionEmail,notify]);
 useEffect(()=>{if(view!=='game'||busy||modal||booster||!frame||frame.phase!=='IDLE'){setHint([]);return;}const timer=setTimeout(()=>setHint(game.current?.hint()??[]),6500);return()=>clearTimeout(timer);},[view,busy,modal,frame,booster,selected]);
 const toMap=()=>{animator.current?.destroy();busyRef.current=false;setBusy(false);setView('map');setModal(null);setSelected(null);setBooster(null);};
 const selectLevel=(id:number)=>{if(id>playerRef.current.unlockedLevels)return;setLevelId(id);open('intro');};
 const startGame=async(id=levelId)=>{
  if(busyRef.current)return;const current=refillLives(playerRef.current);if(current!==playerRef.current)updatePlayer(current);if(current.lives<=0){setModal('lives');return;}
  busyRef.current=true;setBusy(true);audio.current?.unlock();let seed=crypto.getRandomValues(new Uint32Array(1))[0];rankedSession.current=null;rankedUsage.current={hammer:0,shuffle:0,rainbow:0};
  try{const ranked=await startRankedGame(id);if(ranked){seed=ranked.seed;rankedSession.current=ranked.sessionId;}}catch{notify('Mode online belum tersedia. Level ini dimainkan sebagai latihan lokal.');}
  animator.current?.destroy();const next=new Game(getLevel(id),seed);game.current=next;setLevelId(id);setFrame(next.snapshot());setSelected(null);setBooster(null);setHint([]);setModal(next.phase==='ERROR'?'error':null);setView('game');setBusy(false);busyRef.current=false;
 };
 const act=async(action:Action)=>{
  if(!game.current||busyRef.current||modalRef.current)return;if(action.type!=='swap'&&playerRef.current.boosters[action.type]<=0)return;
  if(action.type!=='swap'&&rankedSession.current&&rankedUsage.current[action.type]>=RANKED_BOOSTER_LIMITS[action.type]){notify('Batas booster sesi online tercapai: 3 hammer, 2 shuffle, 1 rainbow.');return;}
  busyRef.current=true;setBusy(true);setHint([]);setSelected(null);
  try{
   const current=game.current;const frames=await current.act(action);if(!frames.length)return;
   if(action.type!=='swap'&&rankedSession.current)rankedUsage.current[action.type]++;
   if(action.type!=='swap')updatePlayer(p=>({...p,boosters:{...p.boosters,[action.type]:Math.max(0,p.boosters[action.type]-1)},updatedAt:Date.now()}));
   setBooster(null);animator.current?.destroy();const manager=new AnimationManager();animator.current=manager;
   for(const f of frames){if(manager.cancelled)return;setFrame(f);if(f.phase==='MATCHING')audio.current?.play(f.message.includes('Magic')?'special':'match',f.chain);else if(f.phase==='SWAPPING')audio.current?.play(f.message?'invalid':'swap');else if(f.phase==='FALLING')audio.current?.play('fall');else if(f.phase==='BONUS_ACTIVATING')audio.current?.play('special',f.chain+2);else if(f.phase==='CONVERTING_MOVES')audio.current?.play('match',3);if(f.duration)await manager.wait(reducedMotion?Math.min(f.duration,35):f.duration);}
   if(manager.cancelled)return;
   if(current.phase==='WIN'){updatePlayer(p=>winProgress(p,current.level.id,current.score,starsFor(current.score,current.level.stars)));audio.current?.play('win');setModal('win');if(rankedSession.current)void submitRankedGame(rankedSession.current,current.actions,playerRef.current.username).then(()=>notify('Skor terverifikasi dan masuk leaderboard.')).catch(()=>notify('Rekor tersimpan lokal. Skor online belum berhasil dikirim.'));}
   else if(current.phase==='LOSE'){updatePlayer(loseLife);audio.current?.play('lose');setModal('lose');}else if(current.phase==='ERROR')setModal('error');
  }catch(error){console.error('Game action failed',error);notify('Ada masalah pada papan. Silakan ulangi level.');setModal('error');}finally{busyRef.current=false;setBusy(false);}
 };
 const choose=(p:Position)=>{if(busyRef.current||modal)return;if(booster&&booster!=='shuffle'){void act({type:booster,at:p});return;}const cell=game.current?.board[p.r]?.[p.c];if(!cell?.candy)return;if(cell.blocker){notify(cell.blocker.kind==='ice'?'Cocokkan candy di bawah es untuk memecahkannya.':'Pecahkan gembok dengan match di sampingnya.');return;}audio.current?.unlock();if(selected&&key(selected)===key(p))setSelected(null);else if(selected&&adjacent(selected,p))void act({type:'swap',a:selected,b:p});else setSelected(p);};
 const useBooster=(type:BoosterType)=>{if(busyRef.current||modal)return;if(rankedSession.current&&rankedUsage.current[type]>=RANKED_BOOSTER_LIMITS[type]){notify('Batas booster sesi online tercapai.');return;}audio.current?.unlock();const p=playerRef.current;if(p.boosters[type]<=0){if(p.coins<BOOSTERS[type].cost){notify(`Perlu ${BOOSTERS[type].cost} koin. Menangkan level atau ambil daily treat.`);return;}updatePlayer({...p,coins:p.coins-BOOSTERS[type].cost,boosters:{...p.boosters,[type]:1},updatedAt:Date.now()});notify(`${BOOSTERS[type].name} dibeli dengan ${BOOSTERS[type].cost} koin.`);}if(type==='shuffle')void act({type:'shuffle'});else{setBooster(booster===type?null:type);setSelected(null);}};
 const askQuit=(target:'map'|'retry')=>{quitTarget.current=target;if(game.current?.actions.some(a=>a.type==='swap')&&game.current.phase==='IDLE')setModal('quit');else if(target==='retry')void startGame();else toMap();};
 const closeModal=()=>{if(modal==='win'||modal==='lose'||modal==='error')toMap();else if(view==='game'&&['settings','help','profile','leaderboard','lives','daily'].includes(modal??''))setModal('pause');else setModal(null);};
 const actionRef=useRef(act);actionRef.current=act;
 useEffect(()=>{
  const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;if(!context?.registerTool)return;const controller=new AbortController();
  const register=(tool:unknown)=>{try{void Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{/* Optional browser capability. */}};
  register({name:'aroncandy_read_board',description:'Read the current ARONCANDY board, moves, objectives and hint.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({view:viewRef.current,busy:busyRef.current,modal:modalRef.current,game:game.current?.snapshot(),hint:game.current?.hint()})});
  register({name:'aroncandy_swap',description:'Swap two adjacent candies in the active level; consumes a move only for a match.',inputSchema:{type:'object',properties:{row:{type:'integer',minimum:0,maximum:8},column:{type:'integer',minimum:0,maximum:8},direction:{type:'string',enum:['up','down','left','right']}},required:['row','column','direction'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{const p=input as {row:number;column:number;direction:string};const deltas:Record<string,number[]>={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]};if(!p||!Number.isInteger(p.row)||!Number.isInteger(p.column)||p.row<0||p.row>8||p.column<0||p.column>8||!deltas[p.direction])throw new Error('Invalid coordinates or direction');if(viewRef.current!=='game'||busyRef.current||modalRef.current)throw new Error('Game is not ready for a swap');const [r,c]=deltas[p.direction];await actionRef.current({type:'swap',a:{r:p.row,c:p.column},b:{r:p.row+r,c:p.column+c}});return {phase:game.current?.phase,score:game.current?.score,moves:game.current?.moves};}});return()=>controller.abort();
 },[]);
 if(!loaded)return <main className="loading-screen"><img src="/assets/logo/aroncandy-logo.png" alt="ARONCANDY"/><div className="loading-candies">{CANDIES.slice(0,3).map((c,i)=><img src={`/assets/candies/${c.file}.png`} alt="" key={c.file} style={{animationDelay:`${i*.16}s`}}/>)}</div><div className="loading-track"><div style={{width:`${loading}%`}}/></div><p>Menyiapkan sedikit keajaiban… {loading}%</p></main>;
 return <main className={`candy-app view-${view} ${reducedMotion?'reduce-motion':''}`}><div className="ambient" aria-hidden="true"><i/><i/><i/><i/><span>✦</span><span>✧</span><span>✦</span></div>
 <header className="topbar"><button className="brand" onClick={()=>view==='game'?askQuit('map'):setView('home')} disabled={busy} aria-label="ARONCANDY home">aron<span>candy</span><i>✦</i></button><div className="wallet"><Lives lives={player.lives} onClick={()=>{if(!busy)open('lives');}}/><button className="wallet-pill coin-pill" disabled={busy} onClick={()=>open('daily')} aria-label={`${player.coins} koin. Hadiah harian.`}><Coins/>{player.coins.toLocaleString('id-ID')}<span className="plus">+</span></button><button className="icon-button profile-button" disabled={busy} aria-label="Profil pemain" onClick={()=>open('profile')}><UserRound/></button><button className="icon-button settings-button" aria-label="Pengaturan" disabled={busy} onClick={()=>open('settings')}><Settings/></button></div></header>
 {view==='home'&&<HomeScreen player={player} onPlay={()=>{audio.current?.unlock();audio.current?.play('click');setView('map');}} onContinue={()=>selectLevel(player.currentLevel)} onOpen={open}/>}
 {view==='map'&&<LevelMap player={player} onSelect={selectLevel} onHome={()=>setView('home')}/>}
 {view==='game'&&frame&&<section className="game-page"><div className="game-heading"><button className="icon-button" disabled={busy} onClick={()=>askQuit('map')} aria-label="Kembali ke map"><ChevronLeft/></button><div><span className="eyebrow">{WORLDS[level.world].name}</span><h1>Level {level.id}<span>{level.name}</span></h1></div><button className="icon-button" disabled={busy} onClick={()=>open('pause')} aria-label="Pause"><Pause fill="currentColor" size={18}/></button></div><div className="game-layout"><aside className="objectives-panel"><span className="label">A LITTLE MISSION</span><h2>Make it sweet.</h2><Objective objectives={frame.objectives}/><div className="level-tip"><Lightbulb size={19}/><p>{level.tip}</p></div><button className="text-button how-to" onClick={()=>open('help')} disabled={busy}>Cara main <ArrowRight size={15}/></button></aside><div className="board-column"><div className="mobile-hud"><MovesCounter moves={frame.moves}/><Score score={frame.score} thresholds={level.stars}/></div><GameBoard frame={frame} busy={busy||!!modal} hint={hint} selected={selected} onSelect={choose} onSwap={(a,b)=>{audio.current?.unlock();void act({type:'swap',a,b});}} reducedMotion={reducedMotion} booster={booster}/><div className="board-caption">{booster?<button onClick={()=>setBooster(null)}>{booster==='hammer'?'Pilih tile untuk dihancurkan':'Pilih warna untuk dihapus'} <span>· Batal</span></button>:<><Sparkles size={13}/>{busy?'A little magic in the making…':'Cocokkan 3 atau lebih. Buat sedikit keajaiban.'}</>}</div></div><aside className="game-sidebar"><div className="desktop-hud"><MovesCounter moves={frame.moves}/><Score score={frame.score} thresholds={level.stars}/></div><div className="boosters-panel"><span className="label">A LITTLE HELP</span><BoosterBar counts={visibleBoosters} selected={booster} disabled={busy||!!modal} onUse={useBooster}/><span className="booster-note">Sedikit bantuan, banyak keajaiban.</span></div><button className="hint-button" disabled={busy} onClick={()=>{setHint(game.current?.hint()??[]);audio.current?.play('click');}}><Lightbulb size={17}/>Beri petunjuk</button></aside></div><div className="game-bottom"><span><ShieldCheck size={14}/> {rankedSession.current?'Sesi online':'Progres tersimpan di perangkat'}</span><span>TAKE YOUR TIME. ENJOY THE LITTLE POPS.</span></div></section>}
 <GameDialogs modal={modal} player={player} frame={frame} level={level} busy={busy} clock={clock} sessionEmail={sessionEmail} quitTarget={quitTarget.current} onClose={closeModal} onOpen={setModal} onStart={()=>void startGame()} onNext={()=>{setLevelId(levelId+1);setModal('intro');}} onMap={toMap} onRetry={()=>askQuit('retry')} onQuit={()=>askQuit('map')} onConfirmQuit={()=>{updatePlayer(loseLife);if(quitTarget.current==='retry')void startGame();else toMap();}} updatePlayer={updatePlayer} notify={notify} audio={audio.current} onSignOut={()=>setSessionEmail('')}/>
 {toast&&<div className="toast" role="status"><Sparkles size={17}/>{toast}<button onClick={()=>setToast('')} aria-label="Tutup pemberitahuan">×</button></div>}
 </main>;
}
