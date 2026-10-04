import { useState } from 'react';
/** Never calls the API: shows a fixed refusal built from local counts only. */
export default function RefusalButton({ total, resolved }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="refusal">
      <button type="button" className="link" onClick={() => setOpen(true)}>Just tell me what to do</button>
      <div aria-live="polite">
        {open && <p className="card">I won't decide this for you.<br />{total ? `But ${total} of your priorities disagree and you've resolved ${resolved}.` : 'But there may still be blind spots worth looking at.'}<br />Want to look at the next one?</p>}
      </div>
    </div>
  );
}
