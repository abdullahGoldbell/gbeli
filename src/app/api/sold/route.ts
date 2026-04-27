import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT * FROM sold_vehicles ORDER BY sold_date DESC, id DESC',
    );
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('GET /api/sold error:', error);
    return NextResponse.json({ error: 'Failed to fetch sold list' }, { status: 500 });
  }
}
