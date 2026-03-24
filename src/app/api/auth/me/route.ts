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
