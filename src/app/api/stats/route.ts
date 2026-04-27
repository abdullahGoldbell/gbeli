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
        0 as onRental,
        0 as forSale,
        0 as scrapped
      FROM fleet
      WHERE release_status IN ('Release', 'Hold') OR release_status IS NULL
    `);

    const conditions = await pool.request().query(`
      SELECT ISNULL(condition, 'UNKNOWN') as condition, COUNT(*) as count
      FROM fleet
      GROUP BY condition
      ORDER BY count DESC
    `);

    // Auxiliary tables — guard each in case table not yet created
    let out = 0, sold = 0, battery = 0, batterySum = 0;
    try {
      const r = await pool.request().query('SELECT COUNT(*) AS n FROM out_vehicles');
      out = r.recordset[0]?.n || 0;
    } catch { /* table may not exist */ }
    try {
      const r = await pool.request().query('SELECT COUNT(*) AS n FROM sold_vehicles');
      sold = r.recordset[0]?.n || 0;
    } catch { /* */ }
    try {
      const r = await pool.request().query('SELECT COUNT(*) AS n, ISNULL(SUM(amt), 0) AS s FROM battery_prices');
      battery = r.recordset[0]?.n || 0;
      batterySum = Number(r.recordset[0]?.s) || 0;
    } catch { /* */ }

    return NextResponse.json({
      ...result.recordset[0],
      out,
      sold,
      battery,
      batterySum,
      conditions: conditions.recordset,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
