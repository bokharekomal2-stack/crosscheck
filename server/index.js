import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate } from './gemini.js';
import { CROSSCHECK_SYSTEM, RIPPLE_SYSTEM, wrap, ripplePrompt } from './prompts.js';
import { validateInput, hasCrisisSignal, filterConflicts, validateRipple, validateChoice, isId } from './validate.js';
import { openDb } from './db.js';
import { hashPassword, verifyPassword, validateSignup, passwordProblem, nameProblem, normEmail, newToken, tokenHash } from './auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.env.NODE_ENV === 'production';
const dbFile = process.env.DATABASE_URL || path.join(here, 'data/crosscheck.db');
mkdirSync(path.dirname(dbFile), { recursive: true });
const db = openDb(dbFile);

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '20kb' }));

const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });
app.use('/api', limiter(300));
const aiLimit = limiter(20);
const authLimit = limiter(10);

const fail = (res, status, message) => res.status(status).json({ error: message });
const AI_FAIL = "We couldn't analyze this right now. Please try again.";
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next); // Express 4 does not catch async errors itself

// CSRF: cookies are SameSite=Strict; additionally require a JSON body and a same-host Origin on every write.
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  const origin = req.headers.origin;
  if ((origin && origin.replace(/^https?:\/\//, '') !== req.headers.host) || !req.is('application/json')) return fail(res, 403, 'Invalid request.');
  next();
});

// ---- sessions (HTTP-only cookie holding a random token; only its HMAC is stored server-side)
const sessionToken = (req) => /(?:^|; )cc_session=([\w-]+)/.exec(req.headers.cookie || '')?.[1];
const setCookie = (res, value, maxAge) =>
  res.setHeader('Set-Cookie', `cc_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${PROD ? '; Secure' : ''}`);
function startSession(res, userId, remember) {
  const token = newToken();
  const ttl = remember ? 7 * 86400 : 12 * 3600;
  db.createSession(tokenHash(token), userId, Date.now() + ttl * 1000);
  setCookie(res, token, ttl);
}
const requireAuth = (req, res, next) => {
  const t = sessionToken(req);
  req.user = t && db.sessionUser(tokenHash(t), Date.now());
  return req.user ? next() : fail(res, 401, 'Your session has expired. Please log in again.');
};

// ---- auth
app.post('/api/auth/signup', authLimit, ah(async (req, res) => {
  const b = req.body ?? {};
  const problem = validateSignup(b);
  if (problem) return fail(res, 400, problem);
  const email = normEmail(b.email);
  if (db.userByEmail(email)) return fail(res, 409, 'An account with this email already exists.');
  const id = db.createUser(b.name.trim(), email, await hashPassword(b.password));
  startSession(res, id, true);
  res.status(201).json({ user: db.userById(id) });
}));

app.post('/api/auth/login', authLimit, ah(async (req, res) => {
  const { email, password, remember } = req.body ?? {};
  const user = typeof email === 'string' ? db.userByEmail(normEmail(email)) : undefined;
  const ok = await verifyPassword(String(password ?? '').slice(0, 128), user?.password_hash);
  if (!user || !ok) return fail(res, 401, 'Invalid email or password.');
  startSession(res, user.id, remember === true);
  res.json({ user: db.userById(user.id) });
}));

app.post('/api/auth/logout', (req, res) => {
  const t = sessionToken(req);
  if (t) db.deleteSession(tokenHash(t));
  setCookie(res, '', 0);
  res.json({ ok: true });
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ---- crosscheck (Gemini) — results are saved per user
app.post('/api/crosscheck', requireAuth, aiLimit, ah(async (req, res) => {
  const problem = validateInput(req.body);
  if (problem) return fail(res, 400, problem);
  const { decision, context } = req.body;
  if (hasCrisisSignal(`${decision} ${context}`)) return res.json({ crisis: true }); // crisis text is neither sent to Gemini nor stored
  const result = await generate({ system: CROSSCHECK_SYSTEM, prompt: wrap(decision, context), schema: 'crosscheck',
    accept: (raw) => { const f = filterConflicts(raw, `${decision}\n${context}`); return f.conflicts.length || (raw.no_conflicts_found && f.assumption_worth_testing) ? f : null; } });
  if (!result) return fail(res, 502, AI_FAIL);
  res.json({ ...result, analysisId: db.saveAnalysis(req.user.id, decision, context, result) });
}));

// The conflict is loaded from the database by id (ownership-checked), never trusted from the client.
app.post('/api/ripple', requireAuth, aiLimit, ah(async (req, res) => {
  const { analysisId, conflictId, choice, explanation = '' } = req.body ?? {};
  if (validateChoice({ choice, explanation }) || !isId(analysisId)) return fail(res, 400, 'Invalid request.');
  const rec = db.getAnalysis(req.user.id, Number(analysisId));
  const conflict = rec?.result.conflicts.find((c) => c.id === conflictId);
  if (!conflict) return fail(res, 404, 'Not found.');
  if (hasCrisisSignal(explanation)) return res.json({ crisis: true });
  const ripple = await generate({ system: RIPPLE_SYSTEM, prompt: ripplePrompt({ decision: rec.decision, context: rec.context, conflict, choice, explanation }), schema: 'ripple', accept: validateRipple });
  if (!ripple) return fail(res, 502, AI_FAIL);
  const resolved = [...rec.result.resolved.filter((r) => r.conflict_id !== conflictId), { conflict_id: conflictId, choice, explanation, ripple }];
  db.setResult(req.user.id, rec.id, { ...rec.result, resolved });
  res.json(ripple);
}));

// ---- history (every query is scoped to the signed-in user; other users' ids simply return 404)
app.get('/api/history', requireAuth, (req, res) => res.json({ items: db.listAnalyses(req.user.id).map((a) => ({
  id: a.id, title: a.decision.slice(0, 90), created_at: a.created_at, conflicts: a.result.conflicts.length, resolved: a.result.resolved.length,
  status: a.result.resolved.length >= a.result.conflicts.length ? 'Complete' : 'In progress' })) }));
app.get('/api/history/:id', requireAuth, (req, res) => {
  const rec = isId(req.params.id) && db.getAnalysis(req.user.id, Number(req.params.id));
  return rec ? res.json(rec) : fail(res, 404, 'Not found.');
});

// ---- profile
app.put('/api/profile', requireAuth, (req, res) => {
  const problem = nameProblem(req.body?.name);
  if (problem) return fail(res, 400, problem);
  db.updateName(req.user.id, req.body.name.trim());
  res.json({ user: db.userById(req.user.id) });
});
app.put('/api/profile/password', authLimit, requireAuth, ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const problem = passwordProblem(newPassword);
  if (problem) return fail(res, 400, problem);
  const row = db.userByEmail(req.user.email);
  if (!(await verifyPassword(String(currentPassword ?? '').slice(0, 128), row.password_hash))) return fail(res, 403, 'Current password is incorrect.');
  db.updatePasswordHash(req.user.id, await hashPassword(newPassword));
  db.deleteUserSessions(req.user.id); // sign out every other device
  startSession(res, req.user.id, true);
  res.json({ ok: true });
}));

app.use('/api', (_req, res) => fail(res, 404, 'Not found.'));
const dist = path.join(here, '../client/dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
// Never leak stack traces, SQL errors or paths: 4xx body-parser errors are the client's fault, all else is generic.
app.use((err, _req, res, _next) => (err.status >= 400 && err.status < 500 ? fail(res, err.status, 'Invalid request.') : fail(res, 500, 'Something went wrong. Please try again.')));

app.listen(process.env.PORT || 8080);
