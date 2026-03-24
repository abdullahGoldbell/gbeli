import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);
    const fleetType = searchParams.get('fleet_type');

    let query = 'SELECT * FROM fleet';
    const request = pool.request();
    if (fleetType) {
      query += ' WHERE fleet_type = @fleetType';
      request.input('fleetType', sql.VarChar, fleetType);
    }
    query += ' ORDER BY fleet_type, category, veh_no';

    const result = await request.query(query);
    const data = result.recordset;

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

    const wb = XLSX.utils.book_new();

    const electrical = data.filter((r: Record<string, unknown>) => r.fleet_type === 'ELECTRICAL');
    const diesel = data.filter((r: Record<string, unknown>) => r.fleet_type === 'DIESEL');

    if (!fleetType || fleetType === 'ELECTRICAL') {
      const ws = XLSX.utils.json_to_sheet(filterColumns(electrical));
      XLSX.utils.book_append_sheet(wb, ws, 'ELECTRICAL');
    }
    if (!fleetType || fleetType === 'DIESEL') {
      const ws = XLSX.utils.json_to_sheet(filterColumns(diesel));
      XLSX.utils.book_append_sheet(wb, ws, 'Diesel');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="FMS_Fleet_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('GET /api/export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
