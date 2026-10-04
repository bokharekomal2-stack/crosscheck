import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS decisions(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL, context_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_decisions_user ON decisions(user_id, created_at);
CREATE TABLE IF NOT EXISTS analyses(id INTEGER PRIMARY KEY, decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  result_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_analyses_decision ON analyses(decision_id);`;

const ANALYSIS = `SELECT a.id, a.result_json, a.created_at, d.decision_text AS decision, d.context_text AS context
  FROM analyses a JOIN decisions d ON d.id = a.decision_id WHERE d.user_id = ?`;
const withResult = (row) => row && { ...row, result_json: undefined, result: JSON.parse(row.result_json) };

/** All queries are prepared statements. Every analysis query is scoped by user_id (ownership enforced in SQL). */
export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  const p = (sql) => db.prepare(sql);
  const s = {
    addUser: p('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)'),
    byEmail: p('SELECT * FROM users WHERE email = ?'),
    byId: p('SELECT id,name,email,created_at FROM users WHERE id = ?'),
    setName: p('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    setHash: p('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
    addSession: p('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)'),
    purge: p('DELETE FROM sessions WHERE expires_at < ?'),
    session: p('SELECT u.id,u.name,u.email,u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'),
    delSession: p('DELETE FROM sessions WHERE token_hash = ?'),
    delSessions: p('DELETE FROM sessions WHERE user_id = ?'),
    addDecision: p('INSERT INTO decisions(user_id,decision_text,context_text) VALUES(?,?,?)'),
    addAnalysis: p('INSERT INTO analyses(decision_id,result_json) VALUES(?,?)'),
    one: p(`${ANALYSIS} AND a.id = ?`),
    all: p(`${ANALYSIS} ORDER BY a.id DESC LIMIT 100`),
    setResult: p('UPDATE analyses SET result_json = ? WHERE id = ? AND decision_id IN (SELECT id FROM decisions WHERE user_id = ?)'),
  };
  return {
    createUser: (name, email, hash) => Number(s.addUser.run(name, email, hash).lastInsertRowid),
    userByEmail: (email) => s.byEmail.get(email),
    userById: (id) => s.byId.get(id),
    updateName: (id, name) => s.setName.run(name, id),
    updatePasswordHash: (id, hash) => s.setHash.run(hash, id),
    createSession(tokenHash, userId, expiresAt) { s.purge.run(Date.now()); s.addSession.run(tokenHash, userId, expiresAt); },
    sessionUser: (tokenHash, now) => s.session.get(tokenHash, now),
    deleteSession: (tokenHash) => s.delSession.run(tokenHash),
    deleteUserSessions: (userId) => s.delSessions.run(userId),
    saveAnalysis(userId, decision, context, result) {
      db.exec('BEGIN');
      try {
        const did = Number(s.addDecision.run(userId, decision, context).lastInsertRowid);
        const id = Number(s.addAnalysis.run(did, JSON.stringify({ ...result, resolved: [] })).lastInsertRowid);
        db.exec('COMMIT');
        return id;
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    getAnalysis: (userId, id) => withResult(s.one.get(userId, id)),
    listAnalyses: (userId) => s.all.all(userId).map(withResult),
    setResult: (userId, id, result) => Number(s.setResult.run(JSON.stringify(result), id, userId).changes) === 1,
  };
}
