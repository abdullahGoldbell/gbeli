import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

const ALLOWED = ['regen_date', 'bat_sn', 'fl', 'model', 'supplier', 'customer', 'amt', 'supplier_invoice', 'warranty', 'volt', 'ah', 'socket'];

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    const { id } = await params;
    const pool = await getPool();
    const body = await req.json();
    const setClauses: string[] = ['updated_at = GETDATE()'];
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));
    for (const f of ALLOWED) {
      if (f in body) {
        let v = body[f];
        if (v === '' || v === undefined) v = null;
        request.input(f, TYPES[f], v);
        setClauses.push(`${f} = @${f}`);
      }
    }
    const result = await request.query(`UPDATE battery_prices SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error('PUT /api/battery/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  try {
    const { id } = await params;
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, parseInt(id))
      .query('DELETE FROM battery_prices OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/battery/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
