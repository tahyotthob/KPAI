/* Minimal in-memory stand-in for the Supabase admin client, used only by route-handler tests. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

const UNIQUE: Record<string, string[][]> = {
  moves: [["game_id", "move_number"]],
  game_secrets: [["game_id", "player_id"]],
  games: [["room_code"]],
  players: [["id"]],
};

export function makeFakeAdmin() {
  const tables: Record<string, Row[]> = { players: [], games: [], game_secrets: [], moves: [], score_events: [], leaderboard: [] };
  const rpcCalls: { name: string; args: Row }[] = [];
  let seq = 0;

  const defaults = (table: string): Row =>
    table === "games"
      ? {
          id: crypto.randomUUID(), status: "waiting", current_turn: 0, final_turn: false, turn_seconds: 0, turn_started_at: null,
          player2_id: null, p1_ready: false, p2_ready: false, last_seen_p1: new Date().toISOString(), last_seen_p2: null,
          created_at: new Date().toISOString(), started_at: null, rematch_game_id: null, winner_id: null, result: null, ai_level: null,
        }
      : table === "moves" ? { id: ++seq } : {};

  class Q {
    op = "select"; filters: Filter[] = []; payload: any; ret = false; head = false; count = false; ord: string | null = null;
    constructor(private table: string) {}
    select(_c?: string, o?: { count?: string; head?: boolean }) {
      if (this.op === "select") { this.head = !!o?.head; this.count = !!o?.count; } else this.ret = true;
      return this;
    }
    insert(p: Row) { this.op = "insert"; this.payload = p; return this; }
    update(p: Row) { this.op = "update"; this.payload = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
    neq(k: string, v: any) { this.filters.push((r) => r[k] !== v); return this; }
    is(k: string, v: any) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
    in(k: string, v: any[]) { this.filters.push((r) => v.includes(r[k])); return this; }
    order(k: string) { this.ord = k; return this; }
    single() { return this.run("single"); }
    maybeSingle() { return this.run("maybe"); }
    then(res?: (v: any) => any, rej?: (e: any) => any) { return this.run().then(res, rej); }
    private async run(mode?: "single" | "maybe") {
      const rows = tables[this.table];
      const match = () => rows.filter((r) => this.filters.every((f) => f(r)));
      let out: Row[] = [];
      let error: any = null;
      if (this.op === "insert") {
        const r = { ...defaults(this.table), ...this.payload };
        const dup = (UNIQUE[this.table] ?? []).some((cols) => rows.some((x) => cols.every((c) => x[c] === r[c] && r[c] != null)));
        if (dup) error = { code: "23505", message: "duplicate" };
        else { rows.push(r); out = [r]; }
      } else if (this.op === "update") {
        out = match();
        out.forEach((r) => Object.assign(r, this.payload));
      } else if (this.op === "delete") {
        out = match();
        tables[this.table] = rows.filter((r) => !out.includes(r));
      } else {
        out = match();
        if (this.ord) out = out.slice().sort((a, b) => a[this.ord!] - b[this.ord!]);
      }
      const shown = this.op === "select" || this.ret ? out.map((r) => ({ ...r })) : null;
      if (error) return { data: null, error, count: null };
      if (mode === "single") return shown?.[0] ? { data: shown[0], error: null } : { data: null, error: { code: "PGRST116" } };
      if (mode === "maybe") return { data: shown?.[0] ?? null, error: null };
      return { data: this.head ? null : shown, error: null, count: this.count ? out.length : null };
    }
  }

  const admin = {
    from: (t: string) => new Q(t),
    rpc: async (name: string, args: Row) => { rpcCalls.push({ name, args }); return { data: args.p_points ?? 0, error: null }; },
    auth: {
      getUser: async (token: string) =>
        token.startsWith("tok-") ? { data: { user: { id: token.slice(4), is_anonymous: true } }, error: null } : { data: { user: null }, error: { message: "bad" } },
    },
  };
  return { admin, tables, rpcCalls };
}
