-- Guest/cloud saves are intentionally separate from verified ranked scores.
create table public.player_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 progress jsonb not null check (jsonb_typeof(progress) = 'object' and pg_column_size(progress) < 65536),
 updated_at timestamptz not null default now()
);
alter table public.player_progress enable row level security;
create policy "Read own progress" on public.player_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own progress" on public.player_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own progress" on public.player_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.player_progress to authenticated;

create table public.public_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (char_length(username) between 2 and 24)
);
alter table public.public_profiles enable row level security;
create policy "Read public player names" on public.public_profiles for select to anon, authenticated using (true);
grant select on public.public_profiles to anon, authenticated;

create table public.verified_scores (
 user_id uuid not null references auth.users(id) on delete cascade,
 level integer not null check (level between 1 and 10000),
 score integer not null check (score between 0 and 10000000),
 stars integer not null check (stars between 1 and 3),
 updated_at timestamptz not null default now(),
 primary key (user_id, level)
);
alter table public.verified_scores enable row level security;
create policy "Read verified scores" on public.verified_scores for select to anon, authenticated using (true);
grant select on public.verified_scores to anon, authenticated;

create table public.game_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 level integer not null check (level between 1 and 10000),
 seed bigint not null check (seed between 0 and 4294967295),
 used boolean not null default false,
 created_at timestamptz not null default now()
);
create index game_sessions_rate_limit on public.game_sessions(user_id, created_at desc);
alter table public.game_sessions enable row level security;
-- No client policies: only the authenticated Edge Function's service client can access sessions.
revoke all on public.game_sessions from anon, authenticated;
revoke insert, update, delete on public.verified_scores, public.public_profiles from anon, authenticated;
grant all on public.player_progress,public.public_profiles,public.verified_scores,public.game_sessions to service_role;

create view public.leaderboard with (security_invoker = true) as
 select p.username, sum(s.score)::bigint as score, max(s.level) as level, sum(s.stars)::bigint as stars
 from public.verified_scores s join public.public_profiles p on p.user_id = s.user_id
 group by s.user_id, p.username;
grant select on public.leaderboard to anon, authenticated;

-- Atomic consume + score write prevents concurrent duplicate submissions.
create function public.finish_verified_game(p_session uuid,p_user uuid,p_score integer,p_stars integer,p_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare run public.game_sessions;
begin
 select * into run from public.game_sessions where id=p_session and user_id=p_user for update;
 if not found or run.used or run.created_at < now()-interval '24 hours' then
  raise exception 'Session unavailable';
 end if;
 update public.game_sessions set used=true where id=run.id;
 insert into public.public_profiles(user_id,username) values(p_user,p_username)
 on conflict(user_id) do update set username=excluded.username;
 insert into public.verified_scores(user_id,level,score,stars) values(p_user,run.level,p_score,p_stars)
 on conflict(user_id,level) do update set score=greatest(public.verified_scores.score,excluded.score),stars=greatest(public.verified_scores.stars,excluded.stars),updated_at=now();
end; $$;
revoke all on function public.finish_verified_game(uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.finish_verified_game(uuid,uuid,integer,integer,text) to service_role;
