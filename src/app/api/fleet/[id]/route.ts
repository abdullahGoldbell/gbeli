import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const body = await req.json();

    // Build dynamic SET clause from provided fields
    const allowedFields = [
      'fleet_type', 'category', 'in_out_date', 'brand', 'model', 'model2',
      'replace_ref', 'veh_no', 'container_mast', 'chassis', 'mast', 'attachment',
      'yor', 'yom', 'battery', 'lta_reg', 'customer_name', 'rental', 'sales',
      'scrap', 'repair_cost', 'condition', 'remarks', 'customer_requirements',
      'location', 'postal_code', 'volts', 'equipment_type', 'serviceable', 'salesman_name', 'updated_by',
    ];

    const setClauses: string[] = ['updated_at = GETDATE()'];
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlTypes: Record<string, any> = {
      fleet_type: sql.VarChar(20),
      category: sql.VarChar(50),
      in_out_date: sql.Date,
      brand: sql.VarChar(50),
      model: sql.VarChar(100),
      model2: sql.VarChar(100),
      replace_ref: sql.VarChar(50),
      veh_no: sql.VarChar(20),
      container_mast: sql.VarChar(50),
      chassis: sql.VarChar(50),
      mast: sql.VarChar(20),
      attachment: sql.VarChar(20),
      yor: sql.Int,
      yom: sql.Int,
      battery: sql.VarChar(50),
      lta_reg: sql.VarChar(20),
      customer_name: sql.VarChar(200),
      rental: sql.Bit,
      sales: sql.Bit,
      scrap: sql.Bit,
      repair_cost: sql.Decimal(10, 2),
      condition: sql.VarChar(50),
      remarks: sql.NVarChar(500),
      customer_requirements: sql.NVarChar(500),
      location: sql.VarChar(100),
      postal_code: sql.VarChar(20),
      volts: sql.VarChar(10),
      equipment_type: sql.VarChar(50),
      serviceable: sql.VarChar(50),
      salesman_name: sql.VarChar(100),
      updated_by: sql.VarChar(50),
    };

    for (const field of allowedFields) {
      if (field in body) {
        let value = body[field];
        if (value === '' || value === undefined) value = null;
        if ((field === 'rental' || field === 'sales' || field === 'scrap') && value !== null) {
          value = value ? 1 : 0;
        }
        request.input(field, sqlTypes[field], value);
        setClauses.push(`${field} = @${field}`);
      }
    }

    const query = `UPDATE fleet SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id`;
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json(result.recordset[0]);
  } catch (error) {
    console.error('PUT /api/fleet/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM fleet OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.recordset[0] });
  } catch (error) {
    console.error('DELETE /api/fleet/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
