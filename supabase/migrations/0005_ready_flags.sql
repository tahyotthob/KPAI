-- Lets each client know whether they (and the opponent) have locked a secret,
-- without ever exposing the secrets themselves.
alter table public.games add column p1_ready boolean not null default false;
alter table public.games add column p2_ready boolean not null default false;
