const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const CORS_HEADERS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-max-age': '86400' };
const encoder = new TextEncoder();
function json(data, init = {}) { return new Response(JSON.stringify(data), { ...init, headers: { ...JSON_HEADERS, ...(init.headers || {}) } }); }
function cors(init = {}) { return new Response(null, { ...init, headers: { ...CORS_HEADERS, ...(init.headers || {}) } }); }
function now() { return new Date().toISOString(); }
function normalizeUsername(s) { return String(s || '').trim().slice(0, 32); }
function parseBody(req) { return req.json().catch(() => ({})); }
function bearer(req) { return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim(); }
function tokenHash(token) { return crypto.subtle.digest('SHA-256', encoder.encode(token)).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')); }
function randomToken() { const a = new Uint8Array(24); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeJson(value, fallback) { try { return JSON.parse(value || fallback); } catch { return JSON.parse(fallback); } }
function toUser(row) { return row ? { userid: row.userid, username: row.username, balance: row.balance, inventory: safeJson(row.inventory_json, '[]'), stats: safeJson(row.stats_json, '{}') } : null; }
function tokenEnvelope(event, data = {}) { return { type: event, event, data, payload: data, ts: Date.now() }; }
function socketEnvelope(event, data = {}) { return JSON.stringify(tokenEnvelope(event, data)); }

function router() { const routes = []; return { add: (m, p, h) => routes.push({ m, p, h }), match: (m, p) => routes.find(r => r.m === m && r.p === p) }; }

async function exec(db, sql, ...bind) { return await db.prepare(sql).bind(...bind).run(); }
async function first(db, sql, ...bind) { return await db.prepare(sql).bind(...bind).first(); }
async function all(db, sql, ...bind) { return await db.prepare(sql).bind(...bind).all(); }

async function auth(env, req) {
  const token = bearer(req);
  if (!token) return null;
  const hash = await tokenHash(token);
  return await first(env.DB, `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`, hash);
}

async function authOrFail(env, req) { const user = await auth(env, req); return user || null; }

async function realtime(env, event, data) {
  if (!env.REALTIME_HUB) return;
  const id = env.REALTIME_HUB.idFromName('hub');
  await env.REALTIME_HUB.get(id).fetch('https://realtime/emit', { method: 'POST', body: JSON.stringify({ event, data }), headers: { 'content-type': 'application/json' } });
}

async function withTx(env, fn) {
  // D1 has no Mongo-style transaction callback. Multi-statement atomic
  // operations must use DB.batch; this helper keeps simple single-statement
  // handlers on the same Worker-native database interface.
  return fn(env.DB);
}

async function createGame(tx, game, kind, ownerId, payload) {
  const r = await tx.prepare(`INSERT INTO game_matches (game, kind, owner_id, payload_json) VALUES (?,?,?,?)`).bind(game, kind, ownerId, JSON.stringify(payload)).run();
  return r.meta.last_row_id;
}

async function listGames(db, game) {
  const r = await all(db, `SELECT * FROM game_matches WHERE game=? AND status='open' ORDER BY id DESC`, game);
  return r.results.map(x => ({ id: x.id, game: x.game, kind: x.kind, status: x.status, ownerId: x.owner_id, payload: safeJson(x.payload_json, '{}'), createdAt: x.created_at }));
}

const rt = router();
rt.add('OPTIONS', '*', async () => cors());
rt.add('GET', '/ping', async () => json({ success: true, message: 'pong', data: { timestamp: now() } }));
rt.add('GET', '/__cloudflare/health', async () => json({ ok: true, service: 'native-api', timestamp: now() }));

rt.add('POST', '/api/login', async (env, req) => {
  const body = await parseBody(req);
  const username = normalizeUsername(body.username || body.user || body.name);
  if (!username) return json({ success: false, message: 'Username required' }, { status: 400 });
  const phase = body.phase || body.code ? 'complete' : 'challenge';
  if (phase === 'challenge') {
    const code = randomToken().slice(0, 8);
    return json({ success: true, phase: 'challenge', code, message: 'Send code to complete login' });
  }
  const token = randomToken();
  let user = await first(env.DB, `SELECT * FROM users WHERE username=?`, username);
  if (!user) {
    const userid = body.userid ? String(body.userid) : `u_${randomToken().slice(0, 12)}`;
    await exec(env.DB, `INSERT INTO users (userid, username, password_hash) VALUES (?,?,?)`, userid, username, body.password ? await tokenHash(String(body.password)) : null);
    user = await first(env.DB, `SELECT * FROM users WHERE username=?`, username);
  }
  await exec(env.DB, `INSERT INTO sessions (user_id, token_hash) VALUES (?,?)`, user.id, await tokenHash(token));
  return json({ success: true, phase: 'complete', hash: token, token, data: toUser(user) });
});

rt.add('POST', '/api/me', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true, data: toUser(u) }) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('POST', '/api/me/inventory', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true, data: { inventory: safeJson(u.inventory_json, '[]') } }) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('GET', '/api/normal-wallet', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true, data: { balance: u.balance } }) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('GET', '/api/stats/all', async env => json({ success: true, data: { users: (await first(env.DB, `SELECT COUNT(*) c FROM users`)).c, games: (await first(env.DB, `SELECT COUNT(*) c FROM game_matches`)).c, volume: (await first(env.DB, `SELECT COALESCE(SUM(balance),0) s FROM users`)).s } }));
rt.add('GET', '/api/users/leaderboard', async env => json({ success: true, data: (await all(env.DB, `SELECT userid, username, balance FROM users ORDER BY balance DESC LIMIT 50`)).results }));
rt.add('GET', '/api/items/search', async env => json({ success: true, items: (await all(env.DB, `SELECT itemid, itemname, itemvalue, itemimage, game FROM items ORDER BY itemname LIMIT 50`)).results }));
rt.add('GET', '/api/chat/latest', async env => json({ success: true, data: (await all(env.DB, `SELECT id, username, message, created_at FROM chat_messages ORDER BY id DESC LIMIT 50`)).results.reverse() }));
rt.add('POST', '/api/chat/latest', async env => json({ success: true, data: (await all(env.DB, `SELECT id, username, message, created_at FROM chat_messages ORDER BY id DESC LIMIT 50`)).results.reverse() }));
rt.add('POST', '/api/chat/send', async (env, req) => {
  const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await parseBody(req); const message = String(body.message || '').trim(); if (!message) return json({ success: false, message: 'Message required' }, { status: 400 });
  await withTx(env, async tx => { await exec(tx, `INSERT INTO chat_messages (user_id, username, message) VALUES (?,?,?)`, u.id, u.username, message); await exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, 'chat.message', JSON.stringify({ user: toUser(u), message })); });
  await realtime(env, 'chat.message', tokenEnvelope('chat.message', { user: toUser(u), message }));
  return json({ success: true, message: 'OK' });
});

for (const game of ['coinflips', 'rps', 'dice', 'blackjack']) {
  rt.add('GET', `/api/${game}/games`, async env => json({ success: true, data: await listGames(env.DB, game) }));
  rt.add('POST', `/api/${game}/create`, async (env, req) => {
    const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const body = await parseBody(req);
    const id = await withTx(env, async tx => createGame(tx, game, 'create', u.id, body));
    await realtime(env, `${game}.created`, tokenEnvelope(`${game}.created`, { id }));
    return json({ success: true, data: { id } });
  });
  rt.add('POST', `/api/${game}/join`, async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); await withTx(env, async tx => exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, `${game}.join`, JSON.stringify({ user: toUser(u), body })) ); await realtime(env, `${game}.join`, tokenEnvelope(`${game}.join`, { user: toUser(u), body })); return json({ success: true, data: { joined: true } }); });
  rt.add('POST', `/api/${game}/cancel`, async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); await withTx(env, async tx => exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, `${game}.cancel`, JSON.stringify({ user: toUser(u), body })) ); await realtime(env, `${game}.cancel`, tokenEnvelope(`${game}.cancel`, { user: toUser(u), body })); return json({ success: true, data: { cancelled: true } }); });
}
rt.add('POST', '/api/blackjack/hit', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true }) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('POST', '/api/blackjack/stand', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true }) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('GET', '/api/jackpot', async env => json({ success: true, data: (await all(env.DB, `SELECT * FROM game_matches WHERE game='jackpot' ORDER BY id DESC LIMIT 1`)).results[0] || null }));
rt.add('POST', '/api/jackpot/join', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); await withTx(env, async tx => exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, 'jackpot.join', JSON.stringify({ user: toUser(u) })) ); return json({ success: true }); });
rt.add('GET', '/api/giveaways/latest', async env => json({ success: true, data: (await all(env.DB, `SELECT * FROM game_matches WHERE game='giveaway' ORDER BY id DESC LIMIT 1`)).results[0] || null }));
rt.add('POST', '/api/giveaways/join', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); return json({ success: true }); });
rt.add('GET', '/api/trades', async env => json({ success: true, data: (await all(env.DB, `SELECT * FROM trades WHERE status='open' ORDER BY id DESC`)).results }));
rt.add('GET', '/api/trades/mine', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true, data: (await all(env.DB, `SELECT * FROM trades WHERE owner_id=? ORDER BY id DESC`, u.id)).results } ) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('POST', '/api/trades/create', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); const id = await withTx(env, async tx => { const r = await tx.prepare(`INSERT INTO trades (owner_id, payload_json) VALUES (?,?)`).bind(u.id, JSON.stringify(body)).run(); return r.meta.last_row_id; }); return json({ success: true, data: { id } }); });
rt.add('POST', '/api/trades/cancel', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); await withTx(env, async tx => exec(tx, `UPDATE trades SET status='cancelled' WHERE owner_id=?`, u.id)); return json({ success: true }); });
rt.add('POST', '/api/trades/request', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); await withTx(env, async tx => exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, 'trade.request', JSON.stringify({ user: toUser(u), body })) ); return json({ success: true }); });
rt.add('POST', '/api/trades/respond', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); await withTx(env, async tx => exec(tx, `INSERT INTO realtime_events (event_type, payload_json) VALUES (?,?)`, 'trade.respond', JSON.stringify({ user: toUser(u), body })) ); return json({ success: true }); });
rt.add('GET', '/api/support/tickets', async (env, req) => { const u = await authOrFail(env, req); return u ? json({ success: true, data: (await all(env.DB, `SELECT * FROM support_tickets WHERE user_id=? ORDER BY id DESC`, u.id)).results } ) : json({ success: false, message: 'Unauthorized' }, { status: 401 }); });
rt.add('POST', '/api/support/tickets', async (env, req) => { const u = await authOrFail(env, req); if (!u) return json({ success: false, message: 'Unauthorized' }, { status: 401 }); const body = await parseBody(req); const id = await withTx(env, async tx => { const r = await tx.prepare(`INSERT INTO support_tickets (user_id, subject, payload_json) VALUES (?,?,?)`).bind(u.id, String(body.subject || 'Support'), JSON.stringify(body)).run(); return r.meta.last_row_id; }); return json({ success: true, data: { id } }); });

export class RealtimeHub {
  constructor(state, env) { this.state = state; this.env = env; this.subscribers = new Set(); }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get('upgrade') === 'websocket' || url.pathname === '/realtime') {
      const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
      server.accept(); this.subscribers.add(server);
      server.addEventListener('close', () => this.subscribers.delete(server));
      server.addEventListener('message', e => { try { const msg = JSON.parse(e.data); if (msg?.type === 'ping') server.send(socketEnvelope('pong', { ts: Date.now() })); } catch {} });
      return new Response(null, { status: 101, webSocket: client });
    }
    const body = await request.json().catch(() => ({}));
    await this.state.blockConcurrencyWhile(async () => { await this.state.storage.put(`event:${Date.now()}:${randomToken()}`, body); });
    const envelope = JSON.stringify(tokenEnvelope(body.event || body.type || 'event', body.data || body.payload || body));
    for (const ws of this.subscribers) try { ws.send(envelope); } catch {}
    return json({ success: true });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/realtime') return env.REALTIME_HUB.get(env.REALTIME_HUB.idFromName('hub')).fetch(request);
    if (request.method === 'OPTIONS') return cors();
    const route = rt.match(request.method, url.pathname);
    const isApiRequest = url.pathname.startsWith('/api/');
    const isSystemRequest = url.pathname === '/ping' || url.pathname === '/__cloudflare/health';
    if (isApiRequest || isSystemRequest) {
      if (!route) return json({ success: false, message: 'Not found' }, { status: 404 });
      const res = await route.h(env, request);
      return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...CORS_HEADERS, 'cache-control': 'no-store' } });
    }
    return env.ASSETS.fetch(request);
  }
};
