import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

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

const FIELDS = [
  'regen_date', 'bat_sn', 'fl', 'model', 'supplier', 'customer',
  'amt', 'supplier_invoice', 'warranty', 'volt', 'ah', 'socket',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPES: Record<string, any> = {
  regen_date: sql.Date,
  bat_sn: sql.VarChar(150),
  fl: sql.VarChar(50),
  model: sql.VarChar(150),
  supplier: sql.VarChar(150),
  customer: sql.VarChar(200),
  amt: sql.Decimal(15, 2),
  supplier_invoice: sql.VarChar(150),
  warranty: sql.VarChar(50),
  volt: sql.VarChar(50),
  ah: sql.VarChar(50),
  socket: sql.VarChar(50),
};

export async function POST(req: NextRequest) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    const pool = await getPool();
    const body = await req.json();

    const cols: string[] = [];
    const request = pool.request();
    for (const f of FIELDS) {
      if (f in body) {
        let v = body[f];
        if (v === '' || v === undefined) v = null;
        if (f === 'amt' && v !== null) {
          const n = Number(v);
          v = Number.isFinite(n) ? n : null;
        }
        request.input(f, TYPES[f], v);
        cols.push(f);
      }
    }

    if (cols.length === 0) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    }

    const result = await request.query(
      `INSERT INTO battery_prices (${cols.join(', ')})
       OUTPUT INSERTED.*
       VALUES (${cols.map((c) => `@${c}`).join(', ')})`,
    );

    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/battery error:', error);
    return NextResponse.json({ error: 'Failed to add battery record' }, { status: 500 });
  }
}
