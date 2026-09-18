import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { validateReplay,RANKED_BOOSTER_LIMITS } from '../_shared/validator.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{
  const bearer=req.headers.get('Authorization');if(!bearer?.startsWith('Bearer '))return response({error:'Sign in required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:bearer}}});
  const {data:{user},error:authError}=await userClient.auth.getUser(bearer.slice(7));if(authError||!user)return response({error:'Invalid session'},401);
  if(Number(req.headers.get('content-length')??0)>48000)return response({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>48000)return response({error:'Request too large'},413);const body=JSON.parse(raw);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.action==='start'){
   if(!Number.isInteger(body.level)||body.level<1||body.level>100)return response({error:'Invalid level'},400);
   const {count,error:countError}=await admin.from('game_sessions').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-60000).toISOString());if(countError)throw countError;if((count??0)>=8)return response({error:'Please wait before starting another ranked game'},429);
   const {data:scores,error:scoreError}=await admin.from('verified_scores').select('level').eq('user_id',user.id).order('level',{ascending:false}).limit(1);if(scoreError)throw scoreError;
   if(body.level>(scores?.[0]?.level??0)+1)return response({error:'Complete the previous ranked level first'},403);
   const seed=crypto.getRandomValues(new Uint32Array(1))[0];
   const {data,error}=await admin.from('game_sessions').insert({user_id:user.id,level:body.level,seed}).select('id').single();if(error)throw error;
   return response({sessionId:data.id,seed,boosterBudget:RANKED_BOOSTER_LIMITS});
  }
  if(body.action==='finish'){
   if(typeof body.sessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.sessionId))return response({error:'Invalid session id'},400);
   const {data:run,error}=await admin.from('game_sessions').select('*').eq('id',body.sessionId).eq('user_id',user.id).maybeSingle();if(error)throw error;
   if(!run||run.used||Date.now()-Date.parse(run.created_at)>86400000)return response({error:'Session expired or already submitted'},409);
   const result=validateReplay(run.level,Number(run.seed),body.actions);
   if(Date.now()-Date.parse(run.created_at)<result.movesUsed*120)return response({error:'Invalid session timing'},400);
   const username=typeof body.username==='string'?body.username.trim().slice(0,24):'Candy Explorer';if(username.length<2)return response({error:'Invalid username'},400);
   const {error:writeError}=await admin.rpc('finish_verified_game',{p_session:run.id,p_user:user.id,p_score:result.score,p_stars:result.stars,p_username:username});if(writeError)throw writeError;
   return response({verified:true,...result});
  }
  return response({error:'Unknown action'},400);
 }catch(error){console.error('Game validation error',error instanceof Error?error.message:'Unknown');return response({error:'Game could not be verified. Please retry with a new session.'},400);}
});
