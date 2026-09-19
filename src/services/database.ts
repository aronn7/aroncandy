import { createClient,type SupabaseClient } from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export function database(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;return client??=createClient(url,key);}
export function isDatabaseConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);}
