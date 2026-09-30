-- Row Level Security. Clients only ever READ; every write goes through Next.js route
-- handlers using the service role key (which bypasses RLS).

alter table public.players       enable row level security;
alter table public.games         enable row level security;
alter table public.game_secrets  enable row level security;
alter table public.moves         enable row level security;
alter table public.score_events  enable row level security;
alter table public.leaderboard   enable row level security;

-- Defence in depth: no write privileges for browser roles at all.
revoke all on public.players, public.games, public.game_secrets, public.moves,
              public.score_events, public.leaderboard from anon, authenticated;
grant select on public.players, public.games, public.moves, public.score_events, public.leaderboard
  to anon, authenticated;
-- game_secrets: nothing granted, no policy -> unreadable by clients (service role only).
revoke select on public.game_secrets from anon, authenticated;

-- Nicknames are public (shown on the leaderboard and next to opponents).
create policy players_read on public.players for select using (true);

-- A game (and its moves) is visible only to the two people playing it.
create policy games_read_own on public.games for select to authenticated
  using ((select auth.uid()) in (player1_id, player2_id));

create policy moves_read_own on public.moves for select to authenticated
  using (exists (
    select 1 from public.games g
    where g.id = moves.game_id and (select auth.uid()) in (g.player1_id, g.player2_id)
  ));

create policy score_events_read_own on public.score_events for select to authenticated
  using (player_id = (select auth.uid()));

create policy leaderboard_read on public.leaderboard for select using (true);

-- Realtime: live board, live turns.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.games, public.moves, public.leaderboard;
  end if;
end $$;
