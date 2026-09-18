import { database } from './database';
import type { Action } from '../game/Game';
import type { Player } from '../types/Player';
export interface LeaderboardEntry{username:string;score:number;level:number;stars:number}
export async function getLeaderboard():Promise<LeaderboardEntry[]>{const db=database();if(!db)return [];const {data,error}=await db.from('leaderboard').select('username,score,level,stars').order('score',{ascending:false}).limit(50);if(error)throw error;return data??[];}
export async function syncProgress(player:Player){const db=database();if(!db)return;const {data:{user}}=await db.auth.getUser();if(!user)return;const {error}=await db.from('player_progress').upsert({user_id:user.id,progress:player,updated_at:new Date().toISOString()});if(error)throw error;}
export async function cloudProgress():Promise<Player|null>{const db=database();if(!db)return null;const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data,error}=await db.from('player_progress').select('progress').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?.progress??null;}
export async function startRankedGame(level:number):Promise<{sessionId:string;seed:number}|null>{const db=database();if(!db)return null;const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data,error}=await db.functions.invoke('game-session',{body:{action:'start',level}});if(error)throw error;return data;}
export async function submitRankedGame(sessionId:string,actions:Action[],username:string){const db=database();if(!db)return;const {data,error}=await db.functions.invoke('game-session',{body:{action:'finish',sessionId,actions,username}});if(error)throw error;return data;}
