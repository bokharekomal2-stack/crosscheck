/** Same-origin JSON helper. The session lives in an HTTP-only cookie, so no token is ever handled in JS. */
export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('cc-expired'));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const fmtDate = (s) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
