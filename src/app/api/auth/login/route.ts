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
