import { GoogleGenAI, Type } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const str = { type: Type.STRING };
const SCHEMAS = {
  crosscheck: { type: Type.OBJECT, required: ['conflicts', 'no_conflicts_found', 'assumption_worth_testing'], properties: {
    conflicts: { type: Type.ARRAY, items: { type: Type.OBJECT, required: ['id', 'type', 'quote_a', 'quote_b', 'goal_a', 'goal_b', 'why_they_collide', 'choice_prompt'],
      properties: { id: str, type: { type: Type.STRING, enum: ['goal_vs_goal', 'stated_vs_action', 'certainty_vs_evidence'] }, quote_a: str, quote_b: str, goal_a: str, goal_b: str, why_they_collide: str, choice_prompt: str } } },
    no_conflicts_found: { type: Type.BOOLEAN }, assumption_worth_testing: str } },
  ripple: { type: Type.OBJECT, required: ['ripple_text', 'assumption_to_examine', 'questions', 'still_unresolved', 'unresolved_note'], properties: {
    ripple_text: str, assumption_to_examine: str, questions: { type: Type.ARRAY, items: str }, still_unresolved: { type: Type.BOOLEAN }, unresolved_note: str } },
};

let client;
/** One structured Gemini call; retries once on failure or when `accept` rejects the output. */
export async function generate({ system, prompt, schema, accept }) {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.models.generateContent({ model: MODEL, contents: prompt,
        config: { systemInstruction: system, responseMimeType: 'application/json', responseSchema: SCHEMAS[schema], temperature: 0.3, httpOptions: { timeout: 25000 } } });
      const result = accept(JSON.parse(res.text));
      if (result) return result;
    } catch { /* retry once, then fall through */ }
  }
  return null;
}
