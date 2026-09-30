-- Server-side scoring and leaderboard queries.

create or replace function public.lagos_day_start() returns timestamptz
language sql stable as $$
  select date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos'
$$;

create or replace function public.lagos_week_start() returns timestamptz
language sql stable as $$
  select date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos'
$$;

create or replace function public.title_for(p int) returns text
language sql immutable as $$
  select case
    when p >= 5000 then 'Kpai Master'
    when p >= 1500 then 'Oga'
    when p >= 500  then 'Area Champion'
    when p >= 100  then 'Street Sharp'
    else 'Learner' end
$$;

-- Records one scored game for one player and updates the leaderboard, applying the
-- anti-farming daily caps. Idempotent per (player, game). Returns the points awarded.
create or replace function public.record_score(
  p_player uuid, p_game uuid, p_mode text, p_outcome text, p_points int, p_reason text,
  p_guesses int, p_opponent uuid, p_ai_level text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_group text;
  v_cap int;
  v_used int;
  v_counted boolean := true;
  v_points int := p_points;
  v_nick text;
begin
  if exists (select 1 from score_events where player_id = p_player and game_id = p_game) then
    return 0;
  end if;
  select nickname into v_nick from players where id = p_player;
  if v_nick is null then raise exception 'unknown player'; end if;

  -- Anti-farming groups
  if p_mode = 'practice' then
    v_group := 'practice'; v_cap := 10;
  elsif p_outcome = 'win' and p_mode = 'computer' and p_ai_level = 'easy' then
    v_group := 'easy'; v_cap := 10;
  elsif p_outcome = 'win' and p_mode = 'online' then
    v_group := 'human:' || coalesce(p_opponent::text, '?'); v_cap := 5;
  elsif p_outcome = 'win' and p_mode = 'pass' then
    v_group := 'human:pass'; v_cap := 5;
  end if;

  if v_group is not null then
    select count(*) into v_used from score_events
      where player_id = p_player and cap_group = v_group and counted
        and created_at >= public.lagos_day_start();
    if v_used >= v_cap then v_counted := false; v_points := 0; end if;
  end if;

  insert into score_events (player_id, game_id, points, reason, mode, outcome, guesses, opponent_id, cap_group, counted)
  values (p_player, p_game, v_points, p_reason, p_mode, p_outcome, p_guesses, p_opponent, v_group, v_counted);

  if v_counted then
    insert into leaderboard (player_id, nickname) values (p_player, v_nick) on conflict do nothing;
    update leaderboard l set
      points      = l.points + v_points,
      wins        = l.wins   + case when p_mode <> 'practice' and p_outcome = 'win'  then 1 else 0 end,
      losses      = l.losses + case when p_mode <> 'practice' and p_outcome = 'lose' then 1 else 0 end,
      draws       = l.draws  + case when p_mode <> 'practice' and p_outcome = 'draw' then 1 else 0 end,
      games       = l.games  + case when p_mode <> 'practice' then 1 else 0 end,
      guess_total = l.guess_total + case when p_outcome = 'win' and p_guesses is not null then p_guesses else 0 end,
      guess_count = l.guess_count + case when p_outcome = 'win' and p_guesses is not null then 1 else 0 end,
      best_guesses = case when p_outcome = 'win' and p_guesses is not null then least(coalesce(l.best_guesses, p_guesses), p_guesses) else l.best_guesses end,
      updated_at  = now()
    where l.player_id = p_player;
    update leaderboard l set
      win_rate    = case when l.games > 0 then round(100.0 * l.wins / l.games, 2) else 0 end,
      avg_guesses = case when l.guess_count > 0 then round(l.guess_total::numeric / l.guess_count, 2) end,
      title       = public.title_for(l.points)
    where l.player_id = p_player;
  end if;
  return v_points;
end $$;

-- Board rows for a time window. 'all' reads the pre-computed leaderboard table (fast, indexed);
-- 'week' / 'today' aggregate score_events. p_player (optional) is always included with its true rank.
create or replace function public.leaderboard_board(p_window text, p_limit int default 100, p_player uuid default null)
returns table (rank bigint, player_id uuid, nickname text, points bigint, wins bigint, games bigint,
               win_rate numeric, avg_guesses numeric, best_guesses int, title text)
language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz;
begin
  p_limit := least(greatest(p_limit, 1), 100);
  if p_window = 'all' then
    return query
      with top as (
        select l.*, rank() over (order by l.points desc, l.wins desc) as rk
        from leaderboard l
        order by l.points desc, l.wins desc limit p_limit
      ), me as (
        select l.*, (select count(*) from leaderboard x where x.points > l.points or (x.points = l.points and x.wins > l.wins)) + 1 as rk
        from leaderboard l where l.player_id = p_player
      ), u as (
        select * from top union select * from me
      )
      select u.rk, u.player_id, u.nickname, u.points::bigint, u.wins::bigint, u.games::bigint,
             u.win_rate, u.avg_guesses, u.best_guesses, u.title
      from u order by u.rk, u.nickname;
    return;
  end if;

  v_since := case p_window when 'week' then public.lagos_week_start() when 'today' then public.lagos_day_start()
             else null end;
  if v_since is null then raise exception 'bad window'; end if;

  return query
    with agg as (
      select e.player_id,
             sum(e.points)::bigint as pts,
             count(*) filter (where e.mode <> 'practice' and e.outcome = 'win')::bigint as w,
             count(*) filter (where e.mode <> 'practice')::bigint as g,
             avg(e.guesses) filter (where e.outcome = 'win') as ag,
             min(e.guesses) filter (where e.outcome = 'win') as bg
      from score_events e
      where e.counted and e.created_at >= v_since
      group by e.player_id
    ), ranked as (
      select a.*, rank() over (order by a.pts desc, a.w desc) as rk from agg a
    )
    select r.rk, r.player_id, p.nickname, r.pts, r.w, r.g,
           case when r.g > 0 then round(100.0 * r.w / r.g, 2) else 0 end,
           round(r.ag, 2), r.bg::int, coalesce(l.title, 'Learner')
    from ranked r
    join players p on p.id = r.player_id
    left join leaderboard l on l.player_id = r.player_id
    where r.rk <= p_limit or r.player_id = p_player
    order by r.rk, p.nickname;
end $$;

-- Delete rooms that have been sitting in "waiting" for over 24 hours.
create or replace function public.cleanup_stale_games() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from games where status = 'waiting' and mode = 'online' and created_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  return n;
end $$;

-- Only the server (service role) may call scoring / maintenance; the board query is public.
revoke all on function public.record_score(uuid, uuid, text, text, int, text, int, uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_stale_games() from public, anon, authenticated;
grant execute on function public.record_score(uuid, uuid, text, text, int, text, int, uuid, text) to service_role;
grant execute on function public.cleanup_stale_games() to service_role;
grant execute on function public.leaderboard_board(text, int, uuid) to anon, authenticated;
