import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

const ALLOWED = ['out_date', 'brand', 'model', 'name', 'veh_no', 'container_mast', 'chassis', 'mast', 'attachment', 'yor', 'yom', 'customer_name', 'condition', 'supplier', 'remarks', 'lta_reg', 'category'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPES: Record<string, any> = {
  out_date: sql.Date,
  brand: sql.VarChar(100),
  model: sql.VarChar(150),
  name: sql.VarChar(150),
  veh_no: sql.VarChar(50),
  container_mast: sql.VarChar(100),
  chassis: sql.VarChar(100),
  mast: sql.VarChar(100),
  attachment: sql.VarChar(100),
  yor: sql.Int,
  yom: sql.Int,
  customer_name: sql.VarChar(200),
  condition: sql.VarChar(100),
  supplier: sql.VarChar(150),
  remarks: sql.NVarChar(sql.MAX),
  lta_reg: sql.VarChar(50),
  category: sql.VarChar(50),
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
    const result = await request.query(`UPDATE out_vehicles SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
    if (result.recordset.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error('PUT /api/out/[id] error:', error);
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
      .query('DELETE FROM out_vehicles OUTPUT DELETED.* WHERE id = @id');
    if (result.recordset.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/out/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
