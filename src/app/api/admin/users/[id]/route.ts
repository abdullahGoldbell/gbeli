import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { hashPassword, verifyAdminFromDb } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUserId = req.headers.get('x-user-id');
    if (!currentUserId || !(await verifyAdminFromDb(currentUserId))) {
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
    if (!currentUserId || !(await verifyAdminFromDb(currentUserId))) {
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
