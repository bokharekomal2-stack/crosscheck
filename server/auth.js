import { randomBytes, scrypt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret');
if (!SECRET) throw new Error('SESSION_SECRET is required in production');

// scrypt is a memory-hard password KDF built into Node, so no native dependency is needed.
export async function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scryptAsync(password, salt, 64)).toString('hex')}`;
}
let dummy; // verified against when the email is unknown so response timing does not reveal which emails exist
export async function verifyPassword(password, stored) {
  const [, saltHex, keyHex] = (stored || (dummy ??= await hashPassword('x'))).split('$');
  const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'), 64);
  return Boolean(stored) && timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

export const newToken = () => randomBytes(32).toString('base64url');
/** Only an HMAC of the session token is stored, so a leaked database cannot be replayed as cookies. */
export const tokenHash = (token) => createHmac('sha256', SECRET).update(token).digest('hex');

export const normEmail = (e) => String(e).trim().toLowerCase();
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const passwordProblem = (p) =>
  typeof p === 'string' && p.length >= 10 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)
    ? null : 'Password must be 10–128 characters and include upper-case, lower-case and a number.';
export const nameProblem = (n) => (typeof n === 'string' && n.trim().length >= 1 && n.trim().length <= 80 ? null : 'Please enter your name (up to 80 characters).');

export function validateSignup({ name, email, password, confirm } = {}) {
  if (nameProblem(name)) return nameProblem(name);
  if (typeof email !== 'string' || !EMAIL.test(email.trim())) return 'Please enter a valid email address.';
  if (passwordProblem(password)) return passwordProblem(password);
  return password === confirm ? null : 'Passwords do not match.';
}
