import { useState } from 'react';
import { api } from '../api.js';

export default function AuthScreen({ onAuth, notice }) {
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', remember: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { onAuth((await api(signup ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body: f })).user); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const input = (id, label, type, extra = {}) => (
    <div className="field"><label htmlFor={id}>{label}</label><input id={id} type={type} value={f[id]} onChange={set(id)} required {...extra} /></div>
  );
  return (
    <section className="card" aria-labelledby="auth-h">
      <h2 id="auth-h">{signup ? 'Create your account' : 'Log in'}</h2>
      <p className="support">See where your own priorities collide — without being told what to choose.</p>
      {notice && <p className="alert" role="status">ℹ {notice}</p>}
      <form onSubmit={submit}>
        {signup && input('name', 'Full name', 'text', { autoComplete: 'name', maxLength: 80 })}
        {input('email', 'Email', 'email', { autoComplete: 'email', maxLength: 254 })}
        {input('password', 'Password', 'password', { autoComplete: signup ? 'new-password' : 'current-password', maxLength: 128 })}
        {signup && <p className="count">At least 10 characters with upper-case, lower-case and a number.</p>}
        {signup && input('confirm', 'Confirm password', 'password', { autoComplete: 'new-password', maxLength: 128 })}
        {!signup && <label className="check"><input type="checkbox" checked={f.remember} onChange={set('remember')} /> Keep me signed in for 7 days</label>}
        <div aria-live="polite">{error && <p className="alert" role="alert">⚠ {error}</p>}</div>
        <div className="row">
          <button type="submit" className="primary" disabled={busy}>{signup ? 'Sign up' : 'Log in'}</button>
          <button type="button" onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'I have an account' : 'Create an account'}</button>
        </div>
      </form>
    </section>
  );
}
