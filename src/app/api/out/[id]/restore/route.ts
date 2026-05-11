import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = req.headers.get('x-user-is-admin') === 'true';
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const userName = req.headers.get('x-user-name') || 'Unknown';

  try {
    const { id } = await params;
    const body = await req.json();
    const inDate: string | null = body.in_date || null;
    const fleetType: string | null = body.fleet_type || null;

    if (!inDate || !fleetType) {
      return NextResponse.json({ error: 'in_date and fleet_type are required' }, { status: 400 });
    }
    if (!['ELECTRICAL', 'DIESEL'].includes(fleetType)) {
      return NextResponse.json({ error: 'fleet_type must be ELECTRICAL or DIESEL' }, { status: 400 });
    }

    const pool = await getPool();
    const outRowRes = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM out_vehicles WHERE id = @id');
    if (outRowRes.recordset.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const o = outRowRes.recordset[0];

    const inserted = await pool.request()
      .input('fleet_type', sql.VarChar(20), fleetType)
      .input('category', sql.VarChar(50), o.category || null)
      .input('in_out_date', sql.Date, inDate)
      .input('brand', sql.VarChar(100), o.brand || null)
      .input('model', sql.VarChar(150), o.model || null)
      .input('name', sql.VarChar(150), o.name || null)
      .input('veh_no', sql.VarChar(50), o.veh_no || null)
      .input('container_mast', sql.VarChar(100), o.container_mast || null)
      .input('chassis', sql.VarChar(100), o.chassis || null)
      .input('mast', sql.VarChar(100), o.mast || null)
      .input('attachment', sql.VarChar(100), o.attachment || null)
      .input('yor', sql.Int, o.yor || null)
      .input('yom', sql.Int, o.yom || null)
      .input('lta_reg', sql.VarChar(50), o.lta_reg || null)
      .input('customer_name', sql.VarChar(200), o.customer_name || null)
      .input('condition', sql.VarChar(100), o.condition || null)
      .input('supplier', sql.VarChar(150), o.supplier || null)
      .input('remarks', sql.NVarChar(sql.MAX), o.remarks || null)
      .input('release_status', sql.VarChar(20), 'Hold')
      .input('updated_by', sql.VarChar(50), userName)
      .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, name, veh_no,
        container_mast, chassis, mast, attachment, yor, yom, lta_reg, customer_name,
        condition, supplier, remarks, release_status, updated_by)
        OUTPUT INSERTED.*
        VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @name, @veh_no,
        @container_mast, @chassis, @mast, @attachment, @yor, @yom, @lta_reg, @customer_name,
        @condition, @supplier, @remarks, @release_status, @updated_by)`);

    await pool.request().input('id', sql.Int, parseInt(id))
      .query('DELETE FROM out_vehicles WHERE id = @id');

    return NextResponse.json({ moved: true, fleet: inserted.recordset[0] });
  } catch (error) {
    console.error('POST /api/out/[id]/restore error:', error);
    return NextResponse.json({ error: 'Failed to restore to fleet' }, { status: 500 });
  }
}
