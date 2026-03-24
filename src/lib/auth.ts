import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'fms_token';

// --- JWT ---

export interface JwtPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

// --- Password ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- Rate Limiter ---

interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(username: string): { allowed: boolean; retryAfterMs?: number } {
  const entry = attempts.get(username);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil) {
    const now = Date.now();
    if (now < entry.lockedUntil) {
      return { allowed: false, retryAfterMs: entry.lockedUntil - now };
    }
    // Lockout expired
    attempts.delete(username);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(username: string): void {
  const entry = attempts.get(username) || { count: 0, lockedUntil: null };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  attempts.set(username, entry);
}

export function resetLoginAttempts(username: string): void {
  attempts.delete(username);
}

// --- Admin verification (checks DB, not just JWT) ---

export async function verifyAdminFromDb(userId: string): Promise<boolean> {
  // Dynamic import to avoid circular dependency with db
  const { getPool, sql } = await import('./db');
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, parseInt(userId))
    .query('SELECT is_admin FROM users WHERE id = @id');
  return !!result.recordset[0]?.is_admin;
}
