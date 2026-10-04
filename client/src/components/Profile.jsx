import { useState } from 'react';
import { api, fmtDate } from '../api.js';

export default function Profile({ user, onUser }) {
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const run = async (fn, ok) => { setMsg(''); try { await fn(); setMsg(`✔ ${ok}`); } catch (e) { setMsg(`⚠ ${e.message}`); } };
  return (
    <section aria-labelledby="prof-h" className="card">
      <h2 id="prof-h">Profile</h2>
      <p><strong>Email:</strong> {user.email}<br /><strong>Member since:</strong> {fmtDate(user.created_at)}</p>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => onUser((await api('/api/profile', { method: 'PUT', body: { name } })).user), 'Name updated.'); }}>
        <div className="field"><label htmlFor="pname">Name</label><input id="pname" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required /></div>
        <button type="submit">Save name</button>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/api/profile/password', { method: 'PUT', body: pw }); setPw({ currentPassword: '', newPassword: '' }); }, 'Password changed.'); }}>
        <h3>Change password</h3>
        <div className="field"><label htmlFor="cur">Current password</label><input id="cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></div>
        <div className="field"><label htmlFor="new">New password</label><input id="new" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></div>
        <button type="submit">Change password</button>
      </form>
      <div aria-live="polite">{msg && <p className="alert">{msg}</p>}</div>
    </section>
  );
}
