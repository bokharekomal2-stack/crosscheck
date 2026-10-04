import { useEffect, useState } from 'react';
import { api } from './api.js';
import Header from './components/Header.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import Crosscheck from './components/Crosscheck.jsx';
import History from './components/History.jsx';
import Profile from './components/Profile.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined while the session is being restored
  const [view, setView] = useState('dashboard');
  const [openId, setOpenId] = useState(null);
  const [run, setRun] = useState(0);
  const [notice, setNotice] = useState('');
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
    const expired = () => { setUser(null); setNotice('Your session has expired. Please log in again.'); };
    window.addEventListener('cc-expired', expired);
    return () => window.removeEventListener('cc-expired', expired);
  }, []);

  const go = (v, id = null) => { if (v === 'new') setRun((r) => r + 1); setView(v); setOpenId(id); };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); setNotice(''); setView('dashboard'); };

  return (
    <div className={`app ${big ? 'big' : ''} ${contrast ? 'hc' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      <Header user={user} view={view} onNav={go} onLogout={logout} big={big} onBig={setBig} contrast={contrast} onContrast={() => setContrast(!contrast)} />
      <main id="main">
        {user === undefined && <p aria-live="polite">Loading…</p>}
        {user === null && <AuthScreen onAuth={(u) => { setUser(u); setNotice(''); setView('dashboard'); }} notice={notice} />}
        {user && view === 'dashboard' && <Dashboard user={user} onNav={go} />}
        {user && view === 'new' && <Crosscheck key={run} onNav={go} />}
        {user && view === 'history' && <History openId={openId} onOpen={(id) => go('history', id)} />}
        {user && view === 'profile' && <Profile user={user} onUser={setUser} />}
      </main>
    </div>
  );
}
