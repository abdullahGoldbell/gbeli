import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        SUM(CASE WHEN release_status <> 'OUT' OR release_status IS NULL THEN 1 ELSE 0 END) as total,
        SUM(CASE WHEN fleet_type = 'ELECTRICAL' AND (release_status <> 'OUT' OR release_status IS NULL) THEN 1 ELSE 0 END) as electrical,
        SUM(CASE WHEN fleet_type = 'DIESEL' AND (release_status <> 'OUT' OR release_status IS NULL) THEN 1 ELSE 0 END) as diesel,
        SUM(CASE WHEN release_status = 'OUT' THEN 1 ELSE 0 END) as [out],
        0 as onRental,
        0 as forSale,
        0 as scrapped
      FROM fleet
    `);

    const conditions = await pool.request().query(`
      SELECT ISNULL(condition, 'UNKNOWN') as condition, COUNT(*) as count
      FROM fleet
      GROUP BY condition
      ORDER BY count DESC
    `);

    return NextResponse.json({
      ...result.recordset[0],
      conditions: conditions.recordset,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
