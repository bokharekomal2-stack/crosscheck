import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db.js';
import { hashPassword, verifyPassword, validateSignup, tokenHash, newToken } from './auth.js';

const mk = () => { const db = openDb(); return { db, a: db.createUser('Asha', 'a@x.io', 'h'), b: db.createUser('Ben', 'b@x.io', 'h') }; };

test('passwords are hashed, verified, and wrong ones rejected', async () => {
  const h = await hashPassword('Str0ngPassw0rd');
  assert.ok(!h.includes('Str0ngPassw0rd'));
  assert.equal(await verifyPassword('Str0ngPassw0rd', h), true);
  assert.equal(await verifyPassword('wrong', h), false);
  assert.equal(await verifyPassword('anything', undefined), false);
});
test('signup validation: weak password, bad email, mismatch, ok', () => {
  const ok = { name: 'A', email: 'a@x.io', password: 'Str0ngPassw0rd', confirm: 'Str0ngPassw0rd' };
  assert.equal(validateSignup(ok), null);
  assert.match(validateSignup({ ...ok, password: 'weak', confirm: 'weak' }), /Password/);
  assert.match(validateSignup({ ...ok, email: 'nope' }), /valid email/);
  assert.match(validateSignup({ ...ok, confirm: 'Different1Passw0rd' }), /match/);
});
test('duplicate email is rejected by the database', () => {
  const { db } = mk();
  assert.throws(() => db.createUser('Dup', 'a@x.io', 'h'));
});
test('sessions: valid, expired, deleted; only an HMAC is stored', () => {
  const { db, a } = mk();
  const t = newToken(), h = tokenHash(t);
  assert.notEqual(t, h);
  db.createSession(h, a, Date.now() + 1000);
  assert.equal(db.sessionUser(h, Date.now()).id, a);
  assert.equal(db.sessionUser(h, Date.now() + 5000), undefined);
  db.deleteSession(h);
  assert.equal(db.sessionUser(h, Date.now()), undefined);
});
test('ownership: user B cannot read, list or modify user A records', () => {
  const { db, a, b } = mk();
  const id = db.saveAnalysis(a, 'my decision text', 'my context', { conflicts: [], no_conflicts_found: true });
  assert.equal(db.getAnalysis(a, id).decision, 'my decision text');
  assert.equal(db.getAnalysis(b, id), undefined);
  assert.equal(db.listAnalyses(b).length, 0);
  assert.equal(db.setResult(b, id, { hacked: true }), false);
  assert.equal(db.getAnalysis(a, id).result.hacked, undefined);
  assert.equal(db.setResult(a, id, { conflicts: [], resolved: [1] }), true);
});
test('SQL injection and XSS strings are stored/queried as plain data', () => {
  const { db, a } = mk();
  assert.equal(db.userByEmail("x' OR '1'='1"), undefined);
  const evil = "<script>alert(1)</script>'); DROP TABLE users;--";
  const id = db.saveAnalysis(a, evil, evil, { conflicts: [] });
  assert.equal(db.getAnalysis(a, id).decision, evil);
  assert.ok(db.userById(a));
});
