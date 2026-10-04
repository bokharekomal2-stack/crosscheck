import { useState } from 'react';
const MAX = 2000;
const EXAMPLE = {
  decision: "I'm deciding whether to accept a 6-month internship. The stipend is Rs 25,000 a month, the office is 15 minutes from home, and it gives me industry experience. It's 30 hours a week.",
  context: "Academics are my top priority and I want to keep my GPA above 8.5. But I can't miss this internship, it's a great opportunity. I'm sure I can manage both, my classes are mostly in the morning.",
};
function Field({ id, label, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={5} maxLength={MAX} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={`${id}-count`} />
      <span id={`${id}-count`} className="count">{value.length} / {MAX}</span>
    </div>
  );
}
export default function InputScreen({ onSubmit, error, busy }) {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [problem, setProblem] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if ((decision + context).trim().length < 20) return setProblem('Please write at least 20 characters in total.');
    setProblem('');
    onSubmit({ decision, context });
  };
  return (
    <form onSubmit={submit} noValidate>
      <p className="support">See where your own priorities collide — without being told what to choose.</p>
      <Field id="decision" label="What are you deciding?" value={decision} onChange={setDecision} />
      <Field id="context" label="What matters to you here, and what constraints are you under?" value={context} onChange={setContext} />
      {(problem || error) && <p className="alert" role="alert">⚠ {problem || error}</p>}
      <div className="row">
        <button type="submit" className="primary" disabled={busy}>{error ? 'Try again' : 'Crosscheck it'}</button>
        <button type="button" onClick={() => { setDecision(EXAMPLE.decision); setContext(EXAMPLE.context); }}>Try an example</button>
      </div>
      <p className="privacy">Your text is analyzed by Gemini and is not used to make the decision for you.</p>
    </form>
  );
}
