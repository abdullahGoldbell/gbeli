import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN fleet_type = 'ELECTRICAL' THEN 1 ELSE 0 END) as electrical,
        SUM(CASE WHEN fleet_type = 'DIESEL' THEN 1 ELSE 0 END) as diesel,
        SUM(CASE WHEN condition = 'REPAIRING' THEN 1 ELSE 0 END) as inRepair,
        SUM(CAST(ISNULL(rental, 0) AS INT)) as onRental,
        SUM(CAST(ISNULL(sales, 0) AS INT)) as forSale,
        SUM(CAST(ISNULL(scrap, 0) AS INT)) as scrapped
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
