export const MAX_FIELD = 2000;
export const MIN_TOTAL = 20;
const CRISIS = /\b(kill myself|suicide|suicidal|end my life|want to die|self[- ]harm|hurt myself)\b/i;

const RECOMMEND = /\b(you should|i recommend|the best (choice|option)|better option)\b/i;
const MAX_LEN = 600;

export const norm = (s) => String(s).toLowerCase().replace(/[“”"‘’']/g, '').replace(/\s+/g, ' ').trim();

export function validateInput({ decision, context } = {}) {
  if (typeof decision !== 'string' || typeof context !== 'string') return 'Please fill in both fields.';
  if (decision.length > MAX_FIELD || context.length > MAX_FIELD) return `Each field can have at most ${MAX_FIELD} characters.`;
  if ((decision + context).trim().length < MIN_TOTAL) return `Please write at least ${MIN_TOTAL} characters in total.`;
  return null;
}
export const hasCrisisSignal = (text) => CRISIS.test(text);

/** Keep only conflicts whose quotes literally appear in the user's text. Max 3. */
export function filterConflicts(raw, source) {
  const src = norm(source);
  const list = Array.isArray(raw?.conflicts) ? raw.conflicts : [];
  const ok = list.filter((c) =>
    ['quote_a', 'quote_b', 'goal_a', 'goal_b', 'why_they_collide', 'choice_prompt'].every((k) => typeof c?.[k] === 'string' && c[k] && c[k].length <= MAX_LEN && !RECOMMEND.test(c[k])) &&
    norm(c.quote_a).length > 3 && norm(c.quote_b).length > 3 && norm(c.quote_a) !== norm(c.quote_b) &&
    src.includes(norm(c.quote_a)) && src.includes(norm(c.quote_b))
  ).slice(0, 3).map((c, i) => ({ ...c, id: `c${i + 1}` }));
  return { conflicts: ok, no_conflicts_found: ok.length === 0, assumption_worth_testing: String(raw?.assumption_worth_testing ?? '').slice(0, MAX_LEN) };
}

export function validateRipple(r) {
  const qs = Array.isArray(r?.questions) ? r.questions.filter((q) => typeof q === 'string' && /^(what|how|where)\b/i.test(q.trim())).slice(0, 2) : [];
  const texts = [r?.ripple_text, r?.assumption_to_examine, ...qs, r?.unresolved_note].map(String);
  if (typeof r?.ripple_text !== 'string' || typeof r?.assumption_to_examine !== 'string' || !qs.length || texts.some((t) => RECOMMEND.test(t))) return null;
  return { ripple_text: r.ripple_text, assumption_to_examine: r.assumption_to_examine, questions: qs, still_unresolved: r.still_unresolved === true, unresolved_note: String(r.unresolved_note ?? '') };
}

export const isId = (v) => /^\d{1,12}$/.test(String(v));
export const validateChoice = ({ choice, explanation = '' } = {}) =>
  ['a', 'b', 'both'].includes(choice) && typeof explanation === 'string' && explanation.length <= MAX_FIELD ? null : 'Invalid request.';
