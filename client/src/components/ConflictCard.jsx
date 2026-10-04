import { useEffect, useRef, useState } from 'react';
const Zigzag = () => (
  <svg className="zigzag" viewBox="0 0 200 12" aria-hidden="true" focusable="false"><polyline points="0,6 20,0 40,12 60,0 80,12 100,0 120,12 140,0 160,12 180,0 200,6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
);
export default function ConflictCard({ conflict, index, total, busy, onChoose }) {
  const heading = useRef(null);
  const [both, setBoth] = useState(false);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(null);
  const pick = (c, t) => { setPicked(c); onChoose(c, t); };
  const btn = (c) => ({ type: 'button', disabled: busy, 'aria-pressed': picked === c, className: picked === c ? 'picked' : '' });
  useEffect(() => { heading.current?.focus(); }, [index]);
  return (
    <section aria-labelledby="conflict-h" className="card">
      <p className="progress">Conflict {index + 1} of {total}</p>
      <h2 id="conflict-h" tabIndex={-1} ref={heading} className="badge">⚡ CONTRADICTION DETECTED</h2>
      <blockquote className="quote"><span>You said</span>“{conflict.quote_a}”</blockquote>
      <div className="vs" aria-hidden="true"><Zigzag /><span>VS</span></div>
      <blockquote className="quote"><span>But you also said</span>“{conflict.quote_b}”</blockquote>
      <dl className="goals">
        <div><dt>Goal A</dt><dd>{conflict.goal_a}</dd></div>
        <div><dt>Goal B</dt><dd>{conflict.goal_b}</dd></div>
      </dl>
      <p><strong>Why they may collide:</strong> {conflict.why_they_collide}</p>
      <p className="prompt">{conflict.choice_prompt}</p>
      {!both ? (
        <div className="choices">
          <button {...btn('a')} onClick={() => pick('a')}>{picked === 'a' && '✔ '}{conflict.goal_a} matters more</button>
          <button {...btn('b')} onClick={() => pick('b')}>{picked === 'b' && '✔ '}{conflict.goal_b} matters more</button>
          <button type="button" disabled={busy} onClick={() => setBoth(true)}>Both, I can reconcile them</button>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="reconcile">How would you reconcile them?</label>
          <textarea id="reconcile" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <button type="button" className="primary" disabled={busy || !text.trim()} onClick={() => pick('both', text)}>Continue</button>
        </div>
      )}
    </section>
  );
}
