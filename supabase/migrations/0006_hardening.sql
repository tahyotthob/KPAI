-- Hardening: race-free scoring caps, atomic guess application, broader cleanup, player privacy.
-- Idempotent; safe to run on top of 0001-0005.

-- ---------------------------------------------------------------------------
-- record_score: serialised per player, caps count ALL outcomes, daily ceilings.
-- ---------------------------------------------------------------------------
create or replace function public.record_score(
  p_player uuid, p_game uuid, p_mode text, p_outcome text, p_points int, p_reason text,
  p_guesses int, p_opponent uuid, p_ai_level text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_group text;
  v_cap int;
  v_used int;
  v_wins int;
  v_offline_used int;
  v_counted boolean := true;
  v_points int := p_points;
  v_nick text;
  v_day timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_player::text, 0));

  if exists (select 1 from score_events where player_id = p_player and game_id = p_game) then
    return 0;
  end if;
  select nickname into v_nick from players where id = p_player;
  if v_nick is null then raise exception 'unknown player'; end if;

  v_day := public.lagos_day_start();

  -- Anti-farming groups: every outcome counts towards the cap.
  if p_mode = 'practice' then
    v_group := 'practice'; v_cap := 10;
  elsif p_mode = 'computer' then
    v_group := 'ai:' || coalesce(p_ai_level, '?');
    v_cap := case p_ai_level when 'easy' then 10 when 'medium' then 15 when 'hard' then 15 else 10 end;
  elsif p_mode = 'pass' then
    v_group := 'pass'; v_cap := 8;
  elsif p_mode = 'online' then
    v_group := 'online:' || coalesce(p_opponent::text, '?'); v_cap := 12;
  end if;

  if v_group is not null then
    select count(*) into v_used from score_events
      where player_id = p_player and cap_group = v_group and counted and created_at >= v_day;
    if v_used >= v_cap then v_counted := false; end if;
  end if;

  -- Spec rule: at most 5 counted online WINS per day against the same human.
  if v_counted and p_mode = 'online' and p_outcome = 'win' then
    select count(*) into v_wins from score_events
      where player_id = p_player and cap_group = v_group and counted and outcome = 'win' and created_at >= v_day;
    if v_wins >= 5 then v_counted := false; end if;
  end if;

  -- Overall daily ceilings.
  if v_counted and p_mode in ('computer', 'pass', 'practice') then
    select coalesce(sum(points), 0) into v_offline_used from score_events
      where player_id = p_player and counted and mode in ('computer', 'pass', 'practice') and created_at >= v_day;
    v_points := greatest(0, least(p_points, 120 - v_offline_used));
    if v_points = 0 and p_points > 0 then v_counted := false; end if;
  elsif v_counted and p_mode = 'online' then
    select count(*) into v_used from score_events
      where player_id = p_player and counted and mode = 'online' and created_at >= v_day;
    if v_used >= 40 then v_counted := false; end if;
  end if;

  if not v_counted then v_points := 0; end if;

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

-- ---------------------------------------------------------------------------
-- apply_guess: atomically validates status + turn, inserts the move, flips the turn.
-- ---------------------------------------------------------------------------
create or replace function public.apply_guess(
  p_game uuid, p_player uuid, p_guess text, p_dead int, p_wounded int, p_next_turn smallint, p_final boolean
) returns table (move_number int, turn_started_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  g games%rowtype;
  v_slot smallint;
  v_n int;
  v_now timestamptz := now();
begin
  select * into g from games where id = p_game for update;
  if not found then raise exception 'not_found'; end if;
  if g.status <> 'playing' then raise exception 'not_playing'; end if;
  if g.player1_id = p_player then v_slot := 0;
  elsif g.player2_id = p_player then v_slot := 1;
  else raise exception 'not_member'; end if;
  if g.current_turn <> v_slot then raise exception 'not_your_turn'; end if;

  select coalesce(max(m.move_number), 0) + 1 into v_n from moves m where m.game_id = p_game;
  insert into moves (game_id, player_id, guess, dead, wounded, move_number)
  values (p_game, p_player, p_guess, p_dead, p_wounded, v_n);
  update games set current_turn = p_next_turn, final_turn = p_final, turn_started_at = v_now where id = p_game;
  return query select v_n, v_now;
end $$;

-- ---------------------------------------------------------------------------
-- cleanup_stale_games: waiting rooms, abandoned live rooms, abandoned offline games.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_stale_games() returns int
language plpgsql security definer set search_path = public as $$
declare n int; total int := 0;
begin
  delete from games where mode = 'online' and status = 'waiting' and created_at < now() - interval '24 hours';
  get diagnostics n = row_count; total := total + n;

  delete from games where mode = 'online' and status in ('setting_secrets', 'playing')
    and greatest(last_seen_p1, coalesce(last_seen_p2, last_seen_p1)) < now() - interval '1 day';
  get diagnostics n = row_count; total := total + n;

  delete from games where mode <> 'online' and status <> 'finished' and created_at < now() - interval '1 day';
  get diagnostics n = row_count; total := total + n;
  return total;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.record_score(uuid, uuid, text, text, int, text, int, uuid, text) from public, anon, authenticated;
revoke all on function public.apply_guess(uuid, uuid, text, int, int, smallint, boolean) from public, anon, authenticated;
revoke all on function public.cleanup_stale_games() from public, anon, authenticated;
grant execute on function public.record_score(uuid, uuid, text, text, int, text, int, uuid, text) to service_role;
grant execute on function public.apply_guess(uuid, uuid, text, int, int, smallint, boolean) to service_role;
grant execute on function public.cleanup_stale_games() to service_role;

-- ---------------------------------------------------------------------------
-- Privacy: browsers may read only id + nickname of players (policy players_read stays).
-- ---------------------------------------------------------------------------
revoke select on public.players from anon, authenticated;
grant select (id, nickname) on public.players to anon, authenticated;
