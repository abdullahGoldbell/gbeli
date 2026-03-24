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
