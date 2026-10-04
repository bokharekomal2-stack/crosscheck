import { useEffect, useRef } from 'react';
export const sideLabel = (choice, c) => (choice === 'a' ? `${c.goal_a} matters more` : choice === 'b' ? `${c.goal_b} matters more` : 'Both, reconciled by you');
export default function ReflectionScreen({ results, total, onNav }) {
  const h = useRef(null);
  useEffect(() => { h.current?.focus(); }, []);
  return (
    <section aria-labelledby="refl-h" className="card resolved">
      <h2 id="refl-h" tabIndex={-1} ref={h}>✔ CROSSCHECK COMPLETE</h2>
      <p>Conflicts identified: {total}<br />Conflicts resolved: {results.length}</p>
      <h3>You resolved</h3>
      <ul>{results.map(({ conflict, choice }) => <li key={conflict.id}>“{conflict.quote_a}” vs “{conflict.quote_b}” → <strong>{sideLabel(choice, conflict)}</strong></li>)}</ul>
      <h3>Now deserves examination</h3>
      <ul>{results.map(({ conflict, ripple }) => <li key={conflict.id}>{ripple.assumption_to_examine}</li>)}</ul>
      <h3>Questions to take with you</h3>
      <ul>{results.flatMap(({ ripple }) => ripple.questions).slice(0, 3).map((q) => <li key={q}>{q}</li>)}</ul>
      <p className="closing">We didn't tell you what to choose.<br />We showed you where your own priorities disagree.</p>
      <div className="row">
        <button type="button" className="primary" onClick={() => onNav('new')}>Start New Crosscheck</button>
        <button type="button" onClick={() => onNav('history')}>View History</button>
        <button type="button" onClick={() => onNav('dashboard')}>Dashboard</button>
      </div>
    </section>
  );
}
