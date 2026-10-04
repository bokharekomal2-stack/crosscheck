const NAV = [['dashboard', 'Dashboard'], ['new', 'New Crosscheck'], ['history', 'History'], ['profile', 'Profile']];
export default function Header({ user, view, onNav, onLogout, big, onBig, contrast, onContrast }) {
  return (
    <header className="header">
      <div>
        <h1 className="logo">CROSSCHECK</h1>
        <p className="tagline">When your own reasoning disagrees with itself.</p>
      </div>
      <div className="controls" role="group" aria-label="Display settings">
        <button type="button" onClick={() => onBig(false)} aria-label="Decrease text size" disabled={!big}>A-</button>
        <button type="button" onClick={() => onBig(true)} aria-label="Increase text size" disabled={big}>A+</button>
        <button type="button" aria-pressed={contrast} onClick={onContrast}>High contrast</button>
      </div>
      {user && (
        <nav aria-label="Main" className="nav">
          {NAV.map(([id, label]) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => onNav(id)}>{label}</button>)}
          <button type="button" onClick={onLogout}>Logout</button>
        </nav>
      )}
    </header>
  );
}
