import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { sendReservationNotification } from '@/lib/email';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = await getPool();
    const body = await req.json();

    const isAdmin = req.headers.get('x-user-is-admin') === 'true';
    const userName = req.headers.get('x-user-name') || 'Unknown';

    // Build dynamic SET clause from provided fields
    const allowedFields = [
      'fleet_type', 'category', 'in_out_date', 'brand', 'model', 'name',
      'veh_no', 'container_mast', 'chassis', 'mast', 'attachment',
      'yor', 'yom', 'lta_reg', 'customer_name', 'location', 'salesman_name',
      'condition', 'supplier', 'remarks', 'lease_period', 'updated_by',
      'release_status', 'reservation_date', 'reserved_by',
    ];

    // Non-admin enforcement: only allow reservation_date and lease_period
    if (!isAdmin) {
      const nonAdminAllowed = new Set(['reservation_date', 'lease_period', 'updated_by']);
      const requestedFields = allowedFields.filter((f) => f in body);
      const disallowedFields = requestedFields.filter((f) => !nonAdminAllowed.has(f));
      if (disallowedFields.length > 0) {
        return NextResponse.json(
          { error: `Sales users can only edit reservation_date and lease_period. Disallowed: ${disallowedFields.join(', ')}` },
          { status: 403 },
        );
      }

      // Block overwrite: if reservation_date already set, non-admin cannot change/clear it
      if ('reservation_date' in body) {
        const existing = await pool.request()
          .input('id', sql.Int, parseInt(id))
          .query('SELECT reservation_date FROM fleet WHERE id = @id');
        if (existing.recordset.length === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        if (existing.recordset[0].reservation_date) {
          return NextResponse.json(
            { error: 'Vehicle already reserved. Contact admin to modify reservation.' },
            { status: 403 },
          );
        }
        // Auto-set reservation_date to today (ignore client-provided date)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        body.reservation_date = `${yyyy}-${mm}-${dd}`;
        body.reserved_by = userName;
      }
    }

    const setClauses: string[] = ['updated_at = GETDATE()'];
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlTypes: Record<string, any> = {
      fleet_type: sql.VarChar(20),
      category: sql.VarChar(50),
      in_out_date: sql.Date,
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
      lta_reg: sql.VarChar(50),
      customer_name: sql.VarChar(200),
      location: sql.VarChar(200),
      salesman_name: sql.VarChar(150),
      condition: sql.VarChar(100),
      supplier: sql.VarChar(150),
      lease_period: sql.VarChar(50),
      remarks: sql.NVarChar(sql.MAX),
      updated_by: sql.VarChar(50),
      release_status: sql.VarChar(20),
      reservation_date: sql.Date,
      reserved_by: sql.VarChar(100),
    };

    for (const field of allowedFields) {
      if (field in body) {
        let value = body[field];
        if (value === '' || value === undefined) value = null;
        request.input(field, sqlTypes[field], value);
        setClauses.push(`${field} = @${field}`);
      }
    }

    const query = `UPDATE fleet SET ${setClauses.join(', ')} OUTPUT INSERTED.* WHERE id = @id`;
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updated = result.recordset[0];

    // Auto-move to out_vehicles when status set to 'Out'
    if (body.release_status === 'Out') {
      try {
        const outDate = body.out_date || updated.in_out_date;
        await pool.request()
          .input('out_date', sql.Date, outDate)
          .input('brand', sql.VarChar, updated.brand)
          .input('model', sql.VarChar, updated.model)
          .input('name', sql.VarChar, updated.name)
          .input('veh_no', sql.VarChar, updated.veh_no)
          .input('container_mast', sql.VarChar, updated.container_mast)
          .input('chassis', sql.VarChar, updated.chassis)
          .input('mast', sql.VarChar, updated.mast)
          .input('attachment', sql.VarChar, updated.attachment)
          .input('yor', sql.Int, updated.yor)
          .input('yom', sql.Int, updated.yom)
          .input('customer_name', sql.VarChar, updated.customer_name)
          .input('condition', sql.VarChar, updated.condition)
          .input('supplier', sql.VarChar, updated.supplier)
          .input('remarks', sql.NVarChar(sql.MAX), updated.remarks)
          .input('lta_reg', sql.VarChar, updated.lta_reg)
          .input('category', sql.VarChar, updated.category)
          .query(`INSERT INTO out_vehicles (out_date, brand, model, name, veh_no, container_mast, chassis, mast, attachment, yor, yom, customer_name, condition, supplier, remarks, lta_reg, category)
                  VALUES (@out_date, @brand, @model, @name, @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom, @customer_name, @condition, @supplier, @remarks, @lta_reg, @category)`);
        await pool.request().input('id', sql.Int, parseInt(id))
          .query('DELETE FROM fleet WHERE id = @id');
        return NextResponse.json({ moved: true, to: 'out', id: parseInt(id), veh_no: updated.veh_no });
      } catch (e) {
        console.error('Auto-move to out_vehicles failed:', e);
        return NextResponse.json({ error: 'Failed to move to Out' }, { status: 500 });
      }
    }

    // Auto-move to sold_vehicles when status set to 'Sold'
    if (body.release_status === 'Sold') {
      try {
        const soldDate = body.sold_date || updated.in_out_date;
        await pool.request()
          .input('sold_date', sql.Date, soldDate)
          .input('brand', sql.VarChar, updated.brand)
          .input('model', sql.VarChar, updated.model)
          .input('customer', sql.VarChar, updated.customer_name)
          .input('veh_no', sql.VarChar, updated.veh_no)
          .input('chassis_no', sql.VarChar, updated.chassis)
          .input('mast', sql.VarChar, updated.mast)
          .input('attachment', sql.VarChar, updated.attachment)
          .input('yor', sql.Int, updated.yor)
          .input('yom', sql.Int, updated.yom)
          .input('lta_reg', sql.VarChar, updated.lta_reg)
          .input('salesman', sql.VarChar, updated.salesman_name)
          .input('remarks', sql.NVarChar(sql.MAX), updated.remarks)
          .query(`INSERT INTO sold_vehicles (sold_date, brand, model, customer, veh_no, chassis_no, mast, attachment, yor, yom, lta_reg, salesman, remarks)
                  VALUES (@sold_date, @brand, @model, @customer, @veh_no, @chassis_no, @mast, @attachment, @yor, @yom, @lta_reg, @salesman, @remarks)`);
        await pool.request().input('id', sql.Int, parseInt(id))
          .query('DELETE FROM fleet WHERE id = @id');
        return NextResponse.json({ moved: true, to: 'sold', id: parseInt(id), veh_no: updated.veh_no });
      } catch (e) {
        console.error('Auto-move to sold_vehicles failed:', e);
        return NextResponse.json({ error: 'Failed to move to Sold' }, { status: 500 });
      }
    }

    // Send email notification when reservation is made
    if ('reservation_date' in body && body.reservation_date) {
      sendReservationNotification(
        updated.veh_no,
        updated.reserved_by || userName,
        body.reservation_date,
      );
    }

    return NextResponse.json(updated);
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
