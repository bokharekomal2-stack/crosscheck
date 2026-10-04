import { useState } from 'react';
import { api } from '../api.js';
import InputScreen from './InputScreen.jsx';
import ConflictCard from './ConflictCard.jsx';
import RippleScreen from './RippleScreen.jsx';
import ReflectionScreen from './ReflectionScreen.jsx';
import RefusalButton from './RefusalButton.jsx';

const CRISIS_MSG = "It sounds like you may be going through something heavy. Please reach out to someone you trust, or to a local emergency or mental-health helpline, right now. This tool can't help with that, and you deserve real support.";
const post = (url, body) => api(url, { method: 'POST', body });

export default function Crosscheck({ onNav }) {
  const [screen, setScreen] = useState('input'); // input | conflict | ripple | reflection | none | crisis
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [ripple, setRipple] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const restart = () => { setScreen('input'); setData(null); setIdx(0); setResults([]); setRipple(null); setError(''); };

  const crosscheck = (body) => run(async () => {
    const d = await post('/api/crosscheck', body);
    if (d.crisis) return setScreen('crisis');
    setData(d); setIdx(0); setResults([]);
    setScreen(d.no_conflicts_found ? 'none' : 'conflict');
  });
  const choose = (choice, explanation = '') => run(async () => {
    const conflict = data.conflicts[idx];
    const r = await post('/api/ripple', { analysisId: data.analysisId, conflictId: conflict.id, choice, explanation });
    if (r.crisis) return setScreen('crisis');
    setRipple(r); setResults((prev) => [...prev, { conflict, choice, ripple: r }]); setScreen('ripple');
  });
  const next = () => { if (idx + 1 < data.conflicts.length) { setIdx(idx + 1); setScreen('conflict'); } else setScreen('reflection'); };

  const total = data?.conflicts?.length ?? 0;
  return (
    <>
      <div>
        <div aria-live="polite" className="status">{busy ? (screen === 'input' ? 'Comparing your statements against each other...' : 'Checking your reasoning...') : ''}</div>
        {error && screen !== 'input' && (
          <p className="alert" role="alert">⚠ {error} <button type="button" onClick={() => setError('')}>Try again</button></p>
        )}
        {screen === 'input' && <InputScreen onSubmit={crosscheck} error={error} busy={busy} />}
        {screen === 'crisis' && <section className="card" role="alert"><p>{CRISIS_MSG}</p><button type="button" onClick={restart}>Start over</button></section>}
        {screen === 'none' && (
          <section className="card" aria-labelledby="none-h">
            <h2 id="none-h">We couldn't find a clear contradiction in what you wrote.</h2>
            <p>That doesn't mean there are no blind spots.</p>
            <h3>One assumption worth testing</h3><p>{data.assumption_worth_testing}</p>
            <button type="button" className="primary" onClick={restart}>Start over</button>
          </section>
        )}
        {screen === 'conflict' && <ConflictCard key={idx} conflict={data.conflicts[idx]} index={idx} total={total} busy={busy} onChoose={choose} />}
        {screen === 'ripple' && <RippleScreen ripple={ripple} last={idx + 1 >= total} onNext={next} />}
        {screen === 'reflection' && <ReflectionScreen results={results} total={total} onNav={onNav} />}
        {['conflict', 'ripple', 'reflection'].includes(screen) && <RefusalButton total={total} resolved={results.length} />}
      </div>
    </>
  );
}
