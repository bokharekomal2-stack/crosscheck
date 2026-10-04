import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { sideLabel } from './ReflectionScreen.jsx';

export function useHistory() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/history').then((d) => setItems(d.items)).catch((e) => setError(e.message)); }, []);
  return { items, error };
}

export function HistoryList({ items, error, onOpen }) {
  if (error) return <p className="alert" role="alert">⚠ {error}</p>;
  if (!items) return <p>Loading…</p>;
  if (!items.length) return <p>No crosschecks yet.</p>;
  return (
    <ul className="list">
      {items.map((i) => (
        <li key={i.id}>
          <button type="button" onClick={() => onOpen(i.id)}>
            <strong>{i.title}</strong>
            <span>{fmtDate(i.created_at)} · {i.conflicts} conflict{i.conflicts === 1 ? '' : 's'} · {i.status === 'Complete' ? '✔' : '◐'} {i.status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Detail({ id, onBack }) {
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/api/history/${id}`).then(setRec).catch((e) => setError(e.message)); }, [id]);
  if (error) return <p className="alert" role="alert">⚠ {error} <button type="button" onClick={onBack}>Back</button></p>;
  if (!rec) return <p>Loading…</p>;
  const { conflicts, resolved, assumption_worth_testing: aw } = rec.result;
  return (
    <section className="card" aria-labelledby="det-h">
      <button type="button" onClick={onBack}>← History</button>
      <h2 id="det-h">{fmtDate(rec.created_at)}</h2>
      <p><strong>Deciding:</strong> {rec.decision}</p>
      <p><strong>What matters:</strong> {rec.context}</p>
      {!conflicts.length && <p>No clear contradiction found. One assumption worth testing: {aw}</p>}
      {conflicts.map((c) => {
        const r = resolved.find((x) => x.conflict_id === c.id);
        return (
          <article key={c.id} className="card">
            <p>“{c.quote_a}” vs “{c.quote_b}”</p>
            <p>{r ? <>✔ <strong>{sideLabel(r.choice, c)}</strong></> : '◐ Not yet resolved'}</p>
            {r && <><p>Now worth examining: {r.ripple.assumption_to_examine}</p><ul>{r.ripple.questions.map((q) => <li key={q}>{q}</li>)}</ul></>}
          </article>
        );
      })}
    </section>
  );
}

export default function History({ openId, onOpen }) {
  const { items, error } = useHistory();
  if (openId) return <Detail id={openId} onBack={() => onOpen(null)} />;
  return <section aria-labelledby="hist-h"><h2 id="hist-h">History</h2><HistoryList items={items} error={error} onOpen={onOpen} /></section>;
}
