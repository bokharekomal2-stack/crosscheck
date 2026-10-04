import { useEffect, useRef } from 'react';
export default function RippleScreen({ ripple, last, onNext }) {
  const h = useRef(null);
  useEffect(() => { h.current?.focus(); }, []);
  return (
    <section aria-labelledby="ripple-h" className="card resolved">
      <h2 id="ripple-h" tabIndex={-1} ref={h}>✔ Your reasoning has changed.</h2>
      <p>{ripple.ripple_text}</p>
      {ripple.still_unresolved && <p className="note">◐ Still unresolved: {ripple.unresolved_note}</p>}
      <h3>Now worth examining</h3>
      <p>{ripple.assumption_to_examine}</p>
      <h3>Questions to take with you</h3>
      <ul>{ripple.questions.map((q) => <li key={q}>{q}</li>)}</ul>
      <button type="button" className="primary" onClick={onNext}>{last ? 'See reflection' : 'Next conflict'}</button>
    </section>
  );
}
