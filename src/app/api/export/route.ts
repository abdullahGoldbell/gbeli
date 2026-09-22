import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);
    const fleetType = searchParams.get('fleet_type');
    const type = (searchParams.get('type') || 'fleet').toLowerCase();

    const isAdmin = req.headers.get('x-user-is-admin') === 'true';

    // Auxiliary ledgers (Out / Sold / Battery) are admin-only exports.
    if (type !== 'fleet') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }

      const ledgers: Record<string, { table: string; order: string; sheet: string; file: string }> = {
        out: { table: 'out_vehicles', order: 'out_date DESC, id DESC', sheet: 'OUT', file: 'FMS_Out' },
        sold: { table: 'sold_vehicles', order: 'sold_date DESC, id DESC', sheet: 'SOLD', file: 'FMS_Sold' },
        battery: { table: 'battery_prices', order: 'regen_date DESC, id DESC', sheet: 'BATTERY', file: 'FMS_Battery' },
      };

      const cfg = ledgers[type];
      if (!cfg) {
        return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
      }

      const rows = await pool.request().query(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.order}`);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.recordset), cfg.sheet);
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${cfg.file}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    let query = 'SELECT * FROM fleet WHERE 1=1';
    const request = pool.request();
    if (fleetType) {
      query += ' AND fleet_type = @fleetType';
      request.input('fleetType', sql.VarChar, fleetType);
    }
    // Non-admin users can only see Release vehicles
    if (!isAdmin) {
      query += " AND release_status = 'Release'";
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
    const hiddenSet = new Set(hiddenColumns);

    // Filter out hidden columns from data
    const filterColumns = (records: Record<string, unknown>[]) => {
      if (hiddenColumns.length === 0) return records;
      return records.map((r) => {
        const filtered: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(r)) {
          if (!hiddenSet.has(key)) filtered[key] = val;
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
