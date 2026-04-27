import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT * FROM battery_prices ORDER BY regen_date DESC, id DESC',
    );
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('GET /api/battery error:', error);
    return NextResponse.json({ error: 'Failed to fetch battery prices' }, { status: 500 });
  }
}
