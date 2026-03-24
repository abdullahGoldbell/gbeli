# Login & User Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password authentication and admin-managed column visibility to the FMS Fleet Dashboard.

**Architecture:** JWT-based auth with httpOnly cookies, validated by Next.js middleware. Two new MSSQL tables (`users`, `user_hidden_columns`). Admin panel as a modal in the dashboard header. Column visibility is a UI preference — API returns all data, FleetTable filters columns client-side. Export also respects hidden columns.

**Tech Stack:** Next.js 16, React 19, MSSQL, jose (JWT), bcryptjs (password hashing), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-24-login-user-access-design.md`

---

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                    (NEW - login page)
│   ├── components/
│   │   ├── Dashboard.tsx               (MODIFY - integrate auth context, pass hiddenColumns)
│   │   ├── FleetTable.tsx              (MODIFY - accept hiddenColumns prop, filter columns)
│   │   ├── AdminPanel.tsx              (NEW - modal with Users + Column Access tabs)
│   │   └── AuthProvider.tsx            (NEW - auth context provider)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts          (NEW - POST login)
│   │   │   ├── logout/route.ts         (NEW - POST logout)
│   │   │   └── me/route.ts             (NEW - GET current user)
│   │   └── admin/
│   │       └── users/
│   │           ├── route.ts            (NEW - GET list / POST create)
│   │           └── [id]/route.ts       (NEW - PUT update / DELETE)
│   ├── api/export/route.ts             (MODIFY - filter hidden columns from export)
│   ├── layout.tsx                      (MODIFY - call bootstrap, wrap in AuthProvider)
│   └── page.tsx                        (UNCHANGED)
├── lib/
│   ├── auth.ts                         (NEW - JWT helpers, password helpers, rate limiter)
│   ├── bootstrap.ts                    (NEW - create admin on first startup)
│   ├── db.ts                           (UNCHANGED)
│   ├── types.ts                        (MODIFY - add User, AuthUser types)
│   └── socket.ts                       (MODIFY - pass JWT auth token)
├── middleware.ts                        (NEW - route protection)
server.js                               (MODIFY - verify JWT on socket connection)
```

---

### Task 1: Install Dependencies & Add Types

**Files:**
- Modify: `package.json`
- Modify: `src/lib/types.ts:1-46`

- [ ] **Step 1: Install jose and bcryptjs**

```bash
cd "/Users/eliyazar/Documents/MX Project/fms-dashboard"
npm install jose bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Add User and AuthUser types to types.ts**

Append to `src/lib/types.ts` after the existing `FleetStats` interface (after line 46):

```typescript
export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  userId: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  hiddenColumns: string[];
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/types.ts
git commit -m "feat: add auth dependencies (jose, bcryptjs) and User types"
```

---

### Task 2: Create Database Tables

**Files:**
- Create: `src/lib/bootstrap.ts`

- [ ] **Step 1: Create bootstrap.ts with table creation and admin seeding**

Create `src/lib/bootstrap.ts`:

```typescript
import { getPool, sql } from './db';
import bcrypt from 'bcryptjs';

let bootstrapPromise: Promise<void> | null = null;

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = doBootstrap();
  }
  return bootstrapPromise;
}

async function doBootstrap(): Promise<void> {
  const pool = await getPool();

  // Create users table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
    CREATE TABLE users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(200) NULL,
      is_admin BIT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME NOT NULL DEFAULT GETDATE()
    )
  `);

  // Create user_hidden_columns table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_hidden_columns')
    CREATE TABLE user_hidden_columns (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      column_key VARCHAR(50) NOT NULL,
      CONSTRAINT UQ_user_column UNIQUE (user_id, column_key)
    )
  `);

  // Seed admin user from env vars
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not set — skipping admin bootstrap');
    return;
  }

  const existing = await pool.request()
    .input('username', sql.VarChar, adminUsername)
    .query('SELECT id FROM users WHERE username = @username');

  if (existing.recordset.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.request()
      .input('username', sql.VarChar, adminUsername)
      .input('password_hash', sql.VarChar, hash)
      .input('display_name', sql.VarChar, 'Administrator')
      .input('is_admin', sql.Bit, true)
      .query(`
        INSERT INTO users (username, password_hash, display_name, is_admin)
        VALUES (@username, @password_hash, @display_name, @is_admin)
      `);
    console.log(`Admin user "${adminUsername}" created`);
  }
}
```

- [ ] **Step 2: Add env vars to .env.local**

Append to `.env.local`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
JWT_SECRET=replace-this-with-a-random-64-char-string-for-production-use!!
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bootstrap.ts
git commit -m "feat: add bootstrap for users tables and admin seeding"
```

---

### Task 3: Auth Library (JWT + Password Helpers)

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Create auth.ts with JWT sign/verify, password helpers, and rate limiter**

Create `src/lib/auth.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add auth library with JWT, password hashing, and rate limiter"
```

---

### Task 4: Next.js Middleware (Route Protection)

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware.ts**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const COOKIE_NAME = 'fms_token';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
    || pathname.startsWith('/_next')
    || pathname === '/favicon.ico';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const isAdmin = payload.isAdmin as boolean;

    // Admin-only routes
    if (pathname.startsWith('/api/admin') && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Attach user info to request headers for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(userId));
    requestHeaders.set('x-user-is-admin', String(isAdmin));
    requestHeaders.set('x-user-name', payload.username as string);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for JWT route protection"
```

---

### Task 5: Auth API Routes (Login, Logout, Me)

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`

- [ ] **Step 1: Create login route**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import {
  comparePassword,
  signToken,
  COOKIE_NAME,
  checkRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Rate limit check
    const rateCheck = checkRateLimit(username);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429 }
      );
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT id, username, password_hash, display_name, is_admin FROM users WHERE username = @username');

    const user = result.recordset[0];
    if (!user) {
      recordFailedLogin(username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      recordFailedLogin(username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    resetLoginAttempts(username);

    const token = await signToken({
      userId: user.id,
      username: user.username,
      isAdmin: !!user.is_admin,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        displayName: user.display_name,
        isAdmin: !!user.is_admin,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create logout route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
```

- [ ] **Step 3: Create me route**

Create `src/app/api/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = await getPool();
    const userResult = await pool.request()
      .input('id', sql.Int, parseInt(userId))
      .query('SELECT id, username, display_name, is_admin FROM users WHERE id = @id');

    const user = userResult.recordset[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const colsResult = await pool.request()
      .input('userId', sql.Int, user.id)
      .query('SELECT column_key FROM user_hidden_columns WHERE user_id = @userId');

    const hiddenColumns = colsResult.recordset.map((r: { column_key: string }) => r.column_key);

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      isAdmin: !!user.is_admin,
      hiddenColumns,
    });
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add auth API routes (login, logout, me)"
```

---

### Task 6: Admin API Routes (Users CRUD)

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create admin users list/create route**

Create `src/app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { hashPassword, verifyAdminFromDb } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId || !(await verifyAdminFromDb(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pool = await getPool();
    const users = await pool.request().query(`
      SELECT u.id, u.username, u.display_name, u.is_admin, u.created_at,
        (SELECT STRING_AGG(column_key, ',') FROM user_hidden_columns WHERE user_id = u.id) as hidden_cols
      FROM users u
      ORDER BY u.created_at
    `);

    const result = users.recordset.map((u: Record<string, unknown>) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      isAdmin: !!u.is_admin,
      createdAt: u.created_at,
      hiddenColumns: u.hidden_cols ? (u.hidden_cols as string).split(',') : [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId || !(await verifyAdminFromDb(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { username, password, displayName, isAdmin, hiddenColumns } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const pool = await getPool();
    const hash = await hashPassword(password);

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password_hash', sql.VarChar, hash)
      .input('display_name', sql.VarChar, displayName || null)
      .input('is_admin', sql.Bit, isAdmin ? 1 : 0)
      .query(`
        INSERT INTO users (username, password_hash, display_name, is_admin)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.display_name, INSERTED.is_admin, INSERTED.created_at
        VALUES (@username, @password_hash, @display_name, @is_admin)
      `);

    const created = result.recordset[0];

    // Insert hidden columns if provided
    if (hiddenColumns && hiddenColumns.length > 0) {
      for (const col of hiddenColumns) {
        await pool.request()
          .input('userId', sql.Int, created.id)
          .input('columnKey', sql.VarChar, col)
          .query('INSERT INTO user_hidden_columns (user_id, column_key) VALUES (@userId, @columnKey)');
      }
    }

    return NextResponse.json({
      id: created.id,
      username: created.username,
      displayName: created.display_name,
      isAdmin: !!created.is_admin,
      createdAt: created.created_at,
      hiddenColumns: hiddenColumns || [],
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNIQUE') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create admin users update/delete route**

Create `src/app/api/admin/users/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { hashPassword, verifyAdminFromDb } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUserId = req.headers.get('x-user-id');
    if (!currentUserId || !(await verifyAdmin(currentUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const targetId = parseInt(id);
    const body = await req.json();

    const pool = await getPool();
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Build dynamic update
      const setClauses: string[] = ['updated_at = GETDATE()'];
      const request = transaction.request();
      request.input('id', sql.Int, targetId);

      if (body.username !== undefined) {
        setClauses.push('username = @username');
        request.input('username', sql.VarChar, body.username);
      }
      if (body.password !== undefined) {
        if (body.password.length < 6) {
          await transaction.rollback();
          return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }
        const hash = await hashPassword(body.password);
        setClauses.push('password_hash = @password_hash');
        request.input('password_hash', sql.VarChar, hash);
      }
      if (body.displayName !== undefined) {
        setClauses.push('display_name = @display_name');
        request.input('display_name', sql.VarChar, body.displayName);
      }
      if (body.isAdmin !== undefined) {
        setClauses.push('is_admin = @is_admin');
        request.input('is_admin', sql.Bit, body.isAdmin ? 1 : 0);
      }

      const updateResult = await request.query(`
        UPDATE users SET ${setClauses.join(', ')} WHERE id = @id;
        SELECT id, username, display_name, is_admin, created_at FROM users WHERE id = @id;
      `);

      const updated = updateResult.recordset[0];
      if (!updated) {
        await transaction.rollback();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update hidden columns if provided
      let hiddenColumns: string[] = [];
      if (body.hiddenColumns !== undefined) {
        await transaction.request()
          .input('userId', sql.Int, targetId)
          .query('DELETE FROM user_hidden_columns WHERE user_id = @userId');

        for (const col of body.hiddenColumns) {
          await transaction.request()
            .input('userId', sql.Int, targetId)
            .input('columnKey', sql.VarChar, col)
            .query('INSERT INTO user_hidden_columns (user_id, column_key) VALUES (@userId, @columnKey)');
        }
        hiddenColumns = body.hiddenColumns;
      } else {
        const colsResult = await transaction.request()
          .input('userId', sql.Int, targetId)
          .query('SELECT column_key FROM user_hidden_columns WHERE user_id = @userId');
        hiddenColumns = colsResult.recordset.map((r: { column_key: string }) => r.column_key);
      }

      await transaction.commit();

      return NextResponse.json({
        id: updated.id,
        username: updated.username,
        displayName: updated.display_name,
        isAdmin: !!updated.is_admin,
        createdAt: updated.created_at,
        hiddenColumns,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNIQUE') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('PUT /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUserId = req.headers.get('x-user-id');
    if (!currentUserId || !(await verifyAdmin(currentUserId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const targetId = parseInt(id);

    if (parseInt(currentUserId) === targetId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, targetId)
      .query('DELETE FROM users WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat: add admin API routes for user CRUD with column access"
```

---

### Task 7: Login Page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create the login page**

Create `src/app/login/page.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-8 w-[380px] shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#f8fafc] tracking-tight">FMS Dashboard</h1>
          <p className="text-sm text-[#64748b] mt-1">Fleet Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs text-[#94a3b8] font-medium mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2.5 text-sm text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter username"
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-[#94a3b8] font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2.5 text-sm text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page with dark centered card design"
```

---

### Task 8: Auth Context Provider

**Files:**
- Create: `src/app/components/AuthProvider.tsx`

- [ ] **Step 1: Create AuthProvider.tsx**

Create `src/app/components/AuthProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/AuthProvider.tsx
git commit -m "feat: add AuthProvider context for user state management"
```

---

### Task 9: Integrate Auth into Layout and Dashboard

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/components/Dashboard.tsx:1-222`

- [ ] **Step 1: Update layout.tsx to call bootstrap and wrap in AuthProvider**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ensureBootstrap } from '@/lib/bootstrap';
import AuthProvider from './components/AuthProvider';

export const metadata: Metadata = {
  title: 'FMS Fleet Dashboard',
  description: 'Fleet Management System - Real-time Dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureBootstrap();

  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update Dashboard.tsx header to show user info, logout, and admin gear**

In `src/app/components/Dashboard.tsx`:

Add import at top (after line 1):
```typescript
import { useAuth } from './AuthProvider';
```

Add inside the `Dashboard` function (after line 28, before `searchTimeoutRef`):
```typescript
const { user, logout } = useAuth();
const [showAdmin, setShowAdmin] = useState(false);
```

Add import for AdminPanel at top (after line 10):
```typescript
import AdminPanel from './AdminPanel';
```

Replace the header section (lines 184-196) with:
```tsx
      {/* Header */}
      <header className="bg-neutral-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">FMS Fleet Dashboard</h1>
            <p className="text-neutral-400 text-sm">Fleet Management System &middot; {data.length} vehicles</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-neutral-400">Live</span>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-300">{user.displayName || user.username}</span>
                {user.isAdmin && (
                  <button
                    onClick={() => setShowAdmin(true)}
                    className="text-neutral-400 hover:text-white transition-colors text-lg"
                    title="Admin Panel"
                  >
                    ⚙
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-xs text-neutral-400 hover:text-white border border-neutral-600 hover:border-neutral-400 px-2.5 py-1 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
```

Pass `hiddenColumns` to FleetTable (update line 215):
```tsx
          <FleetTable data={data} onUpdate={handleUpdate} onDelete={handleDelete} updatedRowIds={updatedRowIds} hiddenColumns={user?.hiddenColumns || []} />
```

Add AdminPanel modal before closing `</div>` (before line 221):
```tsx
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/components/Dashboard.tsx
git commit -m "feat: integrate auth context into layout and dashboard header"
```

---

### Task 10: FleetTable Column Filtering

**Files:**
- Modify: `src/app/components/FleetTable.tsx:17-22,32-209`

- [ ] **Step 1: Update FleetTable to accept and apply hiddenColumns**

In `src/app/components/FleetTable.tsx`:

Update the Props interface (lines 17-22) to add `hiddenColumns`:
```typescript
interface Props {
  data: FleetRecord[];
  onUpdate: (id: number, field: string, value: string | number | boolean | null) => void;
  onDelete: (id: number, vehNo: string) => void;
  updatedRowIds: Set<number>;
  hiddenColumns: string[];
}
```

Update the component signature (line 26):
```typescript
export default function FleetTable({ data, onUpdate, onDelete, updatedRowIds, hiddenColumns }: Props) {
```

After the `columns` useMemo (after line 209), add filtered columns:
```typescript
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      // Display columns (like 'actions') have no accessorKey — always show them
      if (!('accessorKey' in col)) return true;
      return !hiddenColumns.includes(col.accessorKey as string);
    });
  }, [columns, hiddenColumns]);
```

Update `useReactTable` call (line 213) to use `visibleColumns` instead of `columns`:
```typescript
  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: { sorting },
    onSortingChange: setSorting,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/FleetTable.tsx
git commit -m "feat: filter FleetTable columns based on user's hiddenColumns"
```

---

### Task 11: Admin Panel Modal Component

**Files:**
- Create: `src/app/components/AdminPanel.tsx`

- [ ] **Step 1: Create AdminPanel.tsx**

Create `src/app/components/AdminPanel.tsx`. This is a larger component with two tabs — Users and Column Access.

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

interface UserRecord {
  id: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
  hiddenColumns: string[];
}

const COLUMN_GROUPS = [
  {
    label: 'Vehicle Info',
    columns: [
      { key: 'fleet_type', label: 'Type' },
      { key: 'veh_no', label: 'Veh No' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'model2', label: 'Model 2' },
      { key: 'category', label: 'Category' },
      { key: 'chassis', label: 'Chassis' },
      { key: 'mast', label: 'Mast' },
      { key: 'container_mast', label: 'Container/Mast' },
      { key: 'attachment', label: 'Attachment' },
      { key: 'yor', label: 'YOR' },
      { key: 'yom', label: 'YOM' },
    ],
  },
  {
    label: 'Status & Assignment',
    columns: [
      { key: 'condition', label: 'Condition' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'salesman_name', label: 'Salesman' },
      { key: 'location', label: 'Location' },
      { key: 'postal_code', label: 'Postal Code' },
    ],
  },
  {
    label: 'Financial',
    columns: [
      { key: 'rental', label: 'Rental' },
      { key: 'sales', label: 'Sales' },
      { key: 'scrap', label: 'Scrap' },
      { key: 'repair_cost', label: 'Repair Cost' },
    ],
  },
  {
    label: 'Technical',
    columns: [
      { key: 'battery', label: 'Battery' },
      { key: 'lta_reg', label: 'LTA Reg' },
      { key: 'volts', label: 'Volts' },
      { key: 'equipment_type', label: 'Equipment Type' },
      { key: 'serviceable', label: 'Serviceable' },
    ],
  },
  {
    label: 'Other',
    columns: [
      { key: 'remarks', label: 'Remarks' },
      { key: 'customer_requirements', label: 'Customer Req.' },
      { key: 'replace_ref', label: 'Replace Ref' },
      { key: 'in_out_date', label: 'In/Out Date' },
    ],
  },
];

const ALL_COLUMN_KEYS = COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key));

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'columns'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User form state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', displayName: '', isAdmin: false });

  // Column access state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [savingCols, setSavingCols] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaveUser = async () => {
    setError('');
    const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';
    const body: Record<string, unknown> = {
      username: formData.username,
      displayName: formData.displayName || null,
      isAdmin: formData.isAdmin,
    };
    if (formData.password) body.password = formData.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', displayName: '', isAdmin: false });
      fetchUsers();
    } catch {
      setError('Network error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const openEditForm = (u: UserRecord) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', displayName: u.displayName || '', isAdmin: u.isAdmin });
    setShowForm(true);
    setError('');
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', displayName: '', isAdmin: false });
    setShowForm(true);
    setError('');
  };

  const selectUserForColumns = (u: UserRecord) => {
    setSelectedUserId(u.id);
    setHiddenCols(new Set(u.hiddenColumns));
  };

  const toggleColumn = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveColumnAccess = async () => {
    if (!selectedUserId) return;
    setSavingCols(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenColumns: Array.from(hiddenCols) }),
      });
      if (res.ok) {
        fetchUsers();
        // If we changed our own columns, refresh the auth context
        if (selectedUserId === currentUser?.userId) {
          refreshUser();
        }
      }
    } catch (err) {
      console.error('Failed to save columns:', err);
    } finally {
      setSavingCols(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1e293b] border border-[#334155] rounded-xl w-[580px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <h2 className="text-lg font-bold text-[#f8fafc]">Admin Panel</h2>
          <button onClick={onClose} className="text-[#64748b] hover:text-white text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#334155]">
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              tab === 'users'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('columns')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              tab === 'columns'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Column Access
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'users' && (
            <>
              {loading ? (
                <p className="text-[#64748b] text-sm">Loading...</p>
              ) : showForm ? (
                /* User Form */
                <div>
                  <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">
                    {editingUser ? `Edit: ${editingUser.username}` : 'Add User'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">
                        Password{editingUser ? ' (leave blank to keep)' : ''}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Display Name</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-[#f8fafc]">Admin</span>
                    </label>
                  </div>
                  {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => { setShowForm(false); setError(''); }}
                      className="px-4 py-2 text-sm text-[#94a3b8] border border-[#334155] rounded-md hover:border-[#475569]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveUser}
                      className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
                    >
                      {editingUser ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                /* User List */
                <div>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between py-2.5 border-b border-[#334155]/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#f8fafc] font-medium">{u.username}</span>
                        {u.displayName && (
                          <span className="text-xs text-[#64748b]">({u.displayName})</span>
                        )}
                        {u.isAdmin && (
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditForm(u)}
                          className="text-xs text-[#64748b] hover:text-[#f8fafc]"
                        >
                          Edit
                        </button>
                        {u.id !== currentUser?.userId && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={openAddForm}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-md"
                  >
                    + Add User
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'columns' && (
            <div>
              {/* User selector */}
              <div className="mb-4">
                <label className="block text-xs text-[#94a3b8] mb-1.5">Select User</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => {
                    const u = users.find((u) => u.id === parseInt(e.target.value));
                    if (u) selectUserForColumns(u);
                  }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}{u.displayName ? ` (${u.displayName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUserId && (
                <>
                  {/* Select all / Deselect all */}
                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => setHiddenCols(new Set())}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setHiddenCols(new Set(ALL_COLUMN_KEYS))}
                      className="text-xs text-[#64748b] hover:text-[#94a3b8]"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Column groups */}
                  {COLUMN_GROUPS.map((group) => (
                    <div key={group.label} className="mb-4">
                      <h4 className="text-[11px] text-[#64748b] uppercase tracking-wider mb-2">
                        {group.label}
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.columns.map((col) => {
                          const visible = !hiddenCols.has(col.key);
                          return (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-[#0f172a]"
                            >
                              <input
                                type="checkbox"
                                checked={visible}
                                onChange={() => toggleColumn(col.key)}
                                className="rounded"
                              />
                              <span className={`text-sm ${visible ? 'text-[#f8fafc]' : 'text-[#64748b] line-through'}`}>
                                {col.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={saveColumnAccess}
                    disabled={savingCols}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-semibold py-2 rounded-md mt-2"
                  >
                    {savingCols ? 'Saving...' : 'Save Column Access'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/AdminPanel.tsx
git commit -m "feat: add AdminPanel modal with Users and Column Access tabs"
```

---

### Task 12: Export Filtering by Hidden Columns

**Files:**
- Modify: `src/app/api/export/route.ts:1-48`

- [ ] **Step 1: Update export route to filter hidden columns**

In `src/app/api/export/route.ts`, add hidden column filtering. After getting the data (line 20), add:

```typescript
    // Get user's hidden columns
    const userId = req.headers.get('x-user-id');
    let hiddenColumns: string[] = [];
    if (userId) {
      const colsResult = await pool.request()
        .input('userId', sql.Int, parseInt(userId))
        .query('SELECT column_key FROM user_hidden_columns WHERE user_id = @userId');
      hiddenColumns = colsResult.recordset.map((r: { column_key: string }) => r.column_key);
    }

    // Filter out hidden columns from data
    const filterColumns = (records: Record<string, unknown>[]) => {
      if (hiddenColumns.length === 0) return records;
      return records.map((r) => {
        const filtered: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(r)) {
          if (!hiddenColumns.includes(key)) filtered[key] = val;
        }
        return filtered;
      });
    };
```

Then update the sheet creation to use `filterColumns()`:
- Line 28: `const ws = XLSX.utils.json_to_sheet(filterColumns(electrical));`
- Line 32: `const ws = XLSX.utils.json_to_sheet(filterColumns(diesel));`

- [ ] **Step 2: Commit**

```bash
git add src/app/api/export/route.ts
git commit -m "feat: filter hidden columns from Excel export per user"
```

---

### Task 13: Socket.io Authentication

**Files:**
- Modify: `server.js:1-33`
- Modify: `src/lib/socket.ts:1-13`

- [ ] **Step 1: Update server.js to verify JWT on connection**

Replace `server.js` with:

```javascript
const { createServer } = require('http');
const { Server } = require('socket.io');

const port = parseInt(process.env.SOCKET_PORT || '3001', 10);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

// jose is ESM-only — use dynamic import
let jwtVerify;
async function loadJose() {
  const jose = await import('jose');
  jwtVerify = jose.jwtVerify;
}

async function start() {
  await loadJose();

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      await jwtVerify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('fleet:updated', (data) => {
      socket.broadcast.emit('fleet:updated', data);
    });

    socket.on('fleet:created', (data) => {
      socket.broadcast.emit('fleet:created', data);
    });

    socket.on('fleet:deleted', (data) => {
      socket.broadcast.emit('fleet:deleted', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Socket.io server ready on http://0.0.0.0:${port}`);
  });
}

start().catch(console.error);
```

- [ ] **Step 2: Update socket.ts to pass JWT token**

Replace `src/lib/socket.ts` with:

```typescript
'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function setSocketToken(token: string | null): void {
  currentToken = token;
  // If token changed and socket exists, reconnect with new token
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket {
  if (!socket) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    socket = io(`http://${host}:3001`, {
      auth: { token: currentToken },
    });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

Since the JWT is in an httpOnly cookie (invisible to JS), add a new API route to provide the token to the socket client.

Create `src/app/api/auth/token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('fms_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }
  return NextResponse.json({ token });
}
```

Then update `src/app/components/AuthProvider.tsx` to fetch the token and pass it to the socket on login. Add after the `refreshUser` callback:

```typescript
  // Fetch socket token after auth is confirmed
  useEffect(() => {
    if (user) {
      fetch('/api/auth/token')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            const { setSocketToken } = require('@/lib/socket');
            setSocketToken(data.token);
          }
        })
        .catch(() => {});
    }
  }, [user]);
```

Note: the `/api/auth/token` route is protected by middleware (only authenticated users can call it), and the JWT is already validated. This endpoint simply exposes the token value so the Socket.io client can include it in the handshake. The token is the same JWT that the server already has in the cookie — this does not create a new security surface.

- [ ] **Step 3: Commit**

```bash
git add server.js src/lib/socket.ts
git commit -m "feat: add JWT authentication to Socket.io connections"
```

---

### Task 14: Manual Smoke Test

- [ ] **Step 1: Build and start the app**

```bash
cd "/Users/eliyazar/Documents/MX Project/fms-dashboard"
npm run build
```

Verify no build errors.

- [ ] **Step 2: Test the login flow**

1. Start the app: `npm run start` and `npm run socket` (in separate terminals)
2. Open `http://localhost:3005` — should redirect to `/login`
3. Log in with the admin credentials from `.env.local`
4. Verify the dashboard loads with username and gear icon in header
5. Click gear icon — verify admin panel opens with Users and Column Access tabs

- [ ] **Step 3: Test user management**

1. Create a new user via admin panel
2. Log out, log in as the new user
3. Verify no gear icon (non-admin)
4. Log back in as admin

- [ ] **Step 4: Test column visibility**

1. Open admin panel → Column Access tab
2. Select the test user, uncheck some columns
3. Save, log in as that user
4. Verify hidden columns don't appear in the table
5. Export to Excel — verify hidden columns excluded

- [ ] **Step 5: Test brute force protection**

1. Try logging in with wrong password 5 times
2. Verify 6th attempt returns "Too many attempts" error
