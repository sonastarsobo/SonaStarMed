-- SOBO Medical v4: leaderboards (Anatomy Sprint + Assessments)
-- Run once in the Supabase SQL editor (safe to re-run).
--
--   1. game_scores table: every finished Anatomy Sprint round (until now scores lived only in the browser)
--   2. submit_game_score(): saves a round for the signed-in student, with sanity checks
--   3. game_leaderboard(): best sprint score per student, per body system, this week or all time
--   4. assessment_leaderboard(): best quiz result per student, for one quiz or all quizzes combined
--
-- Students cannot read each other's rows directly; the leaderboard functions return only
-- rank, display name and the numbers shown on the board. Only STUDENT accounts are ranked.

-- ---------- 1. sprint scores ----------
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  system_id uuid references public.anatomy_systems(id) on delete cascade,
  mode text not null default 'spot',
  score int not null check (score >= 0),
  correct int not null default 0 check (correct >= 0),
  answered int not null default 0 check (answered >= correct),
  best_streak int not null default 0 check (best_streak >= 0),
  created_at timestamptz not null default now()
);
create index if not exists game_scores_board_idx on public.game_scores (system_id, mode, score desc);
create index if not exists game_scores_user_idx on public.game_scores (user_id, created_at desc);

alter table public.game_scores enable row level security;
drop policy if exists game_scores_read on public.game_scores;
create policy game_scores_read on public.game_scores for select using (user_id = auth.uid() or is_admin());
drop policy if exists game_scores_admin_delete on public.game_scores;
create policy game_scores_admin_delete on public.game_scores for delete using (is_admin());
-- no insert policy: rounds are saved only through submit_game_score()

-- ---------- 2. save a round ----------
-- Highest possible gain per correct answer in the game is 150 points x3 streak multiplier = 450.
create or replace function public.submit_game_score(
  p_system uuid, p_score int, p_correct int, p_answered int, p_best_streak int, p_mode text default 'spot')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_score < 0 or p_correct < 0 or p_answered < p_correct or p_answered > 200
     or p_best_streak < 0 or p_best_streak > p_correct or p_score > p_correct * 450 then
    raise exception 'Score rejected: the numbers are not possible in a 60 second round';
  end if;
  -- one round per 20 seconds at most (a round lasts 60 s; this only stops scripted spam)
  if exists (select 1 from game_scores where user_id = auth.uid() and created_at > now() - interval '20 seconds') then
    raise exception 'Score rejected: too many rounds in a short time';
  end if;
  insert into game_scores (user_id, system_id, mode, score, correct, answered, best_streak)
  values (auth.uid(), p_system, coalesce(nullif(p_mode, ''), 'spot'), p_score, p_correct, p_answered, p_best_streak)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_game_score(uuid, int, int, int, int, text) from public;
grant execute on function public.submit_game_score(uuid, int, int, int, int, text) to authenticated;

-- ---------- 3. sprint leaderboard ----------
-- p_days: null = all time, 7 = this week. Returns the top p_limit plus the caller's own row.
create or replace function public.game_leaderboard(
  p_system uuid default null, p_days int default null, p_limit int default 10, p_mode text default 'spot')
returns table (rank bigint, user_id uuid, name text, best int, rounds bigint, accuracy numeric, best_streak int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select g.user_id, max(g.score) as best, count(*) as rounds,
           round(100.0 * sum(g.correct) / nullif(sum(g.answered), 0)) as accuracy,
           max(g.best_streak) as best_streak
      from game_scores g
      join profiles p on p.id = g.user_id and p.role::text = 'STUDENT'
     where (p_system is null or g.system_id = p_system)
       and g.mode = coalesce(nullif(p_mode, ''), 'spot')
       and (p_days is null or g.created_at > now() - make_interval(days => p_days))
     group by g.user_id
  ), ranked as (
    select rank() over (order by b.best desc, b.accuracy desc nulls last) as rk, b.* from best b
  )
  select r.rk, r.user_id, p.name, r.best, r.rounds, r.accuracy, r.best_streak, r.user_id = auth.uid()
    from ranked r join profiles p on p.id = r.user_id
   where auth.uid() is not null
     and (r.rk <= least(greatest(coalesce(p_limit, 10), 1), 50) or r.user_id = auth.uid())
   order by r.rk, p.name;
$$;
revoke all on function public.game_leaderboard(uuid, int, int, text) from public;
grant execute on function public.game_leaderboard(uuid, int, int, text) to authenticated;

-- ---------- 4. assessment leaderboard ----------
-- p_quiz given: each student's best finished attempt on that quiz (ties: faster wins).
-- p_quiz null : average of each student's best result per quiz (ties: more quizzes, then less time).
create or replace function public.assessment_leaderboard(p_quiz uuid default null, p_limit int default 10)
returns table (rank bigint, user_id uuid, name text, score numeric, quizzes int, time_s int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (a.user_id, a.quiz_id) a.user_id, a.quiz_id, a.percentage, a.time_taken_seconds
      from assessment_attempts a
      join profiles p on p.id = a.user_id and p.role::text = 'STUDENT'
     where a.status::text not in ('IN_PROGRESS', 'ABANDONED')
       and a.percentage is not null
       and (p_quiz is null or a.quiz_id = p_quiz)
     order by a.user_id, a.quiz_id, a.percentage desc, a.time_taken_seconds asc nulls last
  ), per_user as (
    select b.user_id, round(avg(b.percentage), 1) as score, count(*)::int as quizzes,
           sum(b.time_taken_seconds)::int as time_s
      from best b group by b.user_id
  ), ranked as (
    select rank() over (order by u.score desc, u.quizzes desc, u.time_s asc nulls last) as rk, u.* from per_user u
  )
  select r.rk, r.user_id, p.name, r.score, r.quizzes, r.time_s, r.user_id = auth.uid()
    from ranked r join profiles p on p.id = r.user_id
   where auth.uid() is not null
     and (r.rk <= least(greatest(coalesce(p_limit, 10), 1), 50) or r.user_id = auth.uid())
   order by r.rk, p.name;
$$;
revoke all on function public.assessment_leaderboard(uuid, int) from public;
grant execute on function public.assessment_leaderboard(uuid, int) to authenticated;

notify pgrst, 'reload schema';
