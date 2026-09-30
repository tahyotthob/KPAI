-- KPAI! schema. Secrets live in game_secrets and are never readable by clients.

create table public.players (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 3 and 16 and nickname ~ '^[A-Za-z0-9_]+$'),
  is_anonymous boolean not null default true,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create unique index players_nickname_lower_key on public.players (lower(nickname));

create table public.games (
  id            uuid primary key default gen_random_uuid(),
  room_code     text unique check (room_code is null or room_code ~ '^[A-Z0-9]{6}$'),
  mode          text not null check (mode in ('computer', 'practice', 'pass', 'online')),
  digit_length  smallint not null default 4 check (digit_length between 3 and 5),
  status        text not null default 'waiting' check (status in ('waiting', 'setting_secrets', 'playing', 'finished')),
  player1_id    uuid not null references public.players (id) on delete cascade,
  player2_id    uuid references public.players (id) on delete set null,
  -- slot (0 = player1, 1 = player2) whose turn it is
  current_turn  smallint not null default 0 check (current_turn in (0, 1)),
  -- player 1 cracked the code; player 2 is playing their fairness-rule last turn
  final_turn    boolean not null default false,
  turn_seconds  smallint not null default 0 check (turn_seconds in (0, 30, 60)),
  turn_started_at timestamptz,
  winner_id     uuid references public.players (id) on delete set null,
  result        text check (result in ('win', 'draw', 'forfeit')),
  ai_level      text check (ai_level in ('easy', 'medium', 'hard')),
  rematch_game_id uuid,
  last_seen_p1  timestamptz not null default now(),
  last_seen_p2  timestamptz,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
create index games_player1_idx on public.games (player1_id);
create index games_player2_idx on public.games (player2_id);
create index games_stale_idx on public.games (created_at) where status = 'waiting';

-- Service-role only. One row per player per game.
create table public.game_secrets (
  game_id   uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  secret    text not null check (secret ~ '^[0-9]{3,5}$'),
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table public.moves (
  id          bigint generated always as identity primary key,
  game_id     uuid not null references public.games (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  guess       text not null check (guess ~ '^[0-9]{3,5}$'),
  dead        smallint not null check (dead between 0 and 5),
  wounded     smallint not null check (wounded between 0 and 5),
  move_number int not null check (move_number >= 1),
  created_at  timestamptz not null default now(),
  unique (game_id, move_number)
);
create index moves_game_idx on public.moves (game_id, move_number);

create table public.score_events (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references public.players (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete cascade,
  points      int not null,
  reason      text not null,
  mode        text not null,
  outcome     text not null check (outcome in ('win', 'lose', 'draw')),
  guesses     int,   -- null for forfeits / disconnect claims
  opponent_id uuid,
  cap_group   text,
  counted     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (player_id, game_id)
);
create index score_events_time_idx on public.score_events (created_at desc);
create index score_events_player_day_idx on public.score_events (player_id, cap_group, created_at desc);

-- Updated server-side only when a game finishes.
create table public.leaderboard (
  player_id     uuid primary key references public.players (id) on delete cascade,
  nickname      text not null,
  points        int not null default 0,
  wins          int not null default 0,
  losses        int not null default 0,
  draws         int not null default 0,
  games         int not null default 0,
  win_rate      numeric(5, 2) not null default 0,
  guess_total   int not null default 0,
  guess_count   int not null default 0,
  avg_guesses   numeric(5, 2),
  best_guesses  int,
  title         text not null default 'Learner',
  updated_at    timestamptz not null default now()
);
create index leaderboard_points_idx on public.leaderboard (points desc, wins desc);
