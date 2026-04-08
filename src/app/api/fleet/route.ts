import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';


export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);

    const fleetType = searchParams.get('fleet_type');
    const condition = searchParams.get('condition');
    const search = searchParams.get('search');
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');

    const isAdmin = req.headers.get('x-user-is-admin') === 'true';

    let query = 'SELECT * FROM fleet WHERE 1=1';
    const request = pool.request();

    // Non-admin users can only see Release vehicles
    if (!isAdmin) {
      query += " AND release_status = 'Release'";
    }

    if (fleetType) {
      query += ' AND fleet_type = @fleetType';
      request.input('fleetType', sql.VarChar, fleetType);
    }
    if (condition) {
      query += ' AND condition = @condition';
      request.input('condition', sql.VarChar, condition);
    }
    if (brand) {
      query += ' AND brand = @brand';
      request.input('brand', sql.VarChar, brand);
    }
    if (category) {
      query += ' AND category = @category';
      request.input('category', sql.VarChar, category);
    }
    if (search) {
      query += ` AND (veh_no LIKE @search OR customer_name LIKE @search OR model LIKE @search
        OR brand LIKE @search OR chassis LIKE @search OR remarks LIKE @search
        OR location LIKE @search OR equipment_type LIKE @search OR salesman_name LIKE @search)`;
      request.input('search', sql.VarChar, `%${search}%`);
    }

    query += ' ORDER BY fleet_type, category, veh_no';
    const result = await request.query(query);
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error('GET /api/fleet error:', error);
    return NextResponse.json({ error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();

    const result = await pool.request()
      .input('fleet_type', sql.VarChar, body.fleet_type)
      .input('category', sql.VarChar, body.category || null)
      .input('in_out_date', sql.Date, body.in_out_date || null)
      .input('brand', sql.VarChar, body.brand || null)
      .input('model', sql.VarChar, body.model || null)
      .input('model2', sql.VarChar, body.model2 || null)
      .input('replace_ref', sql.VarChar, body.replace_ref || null)
      .input('veh_no', sql.VarChar, body.veh_no)
      .input('container_mast', sql.VarChar, body.container_mast || null)
      .input('chassis', sql.VarChar, body.chassis || null)
      .input('mast', sql.VarChar, body.mast || null)
      .input('attachment', sql.VarChar, body.attachment || null)
      .input('yor', sql.Int, body.yor || null)
      .input('yom', sql.Int, body.yom || null)
      .input('battery', sql.VarChar, body.battery || null)
      .input('lta_reg', sql.VarChar, body.lta_reg || null)
      .input('customer_name', sql.VarChar, body.customer_name || null)
      .input('repair_cost', sql.Decimal(10, 2), body.repair_cost || null)
      .input('condition', sql.VarChar, body.condition || null)
      .input('remarks', sql.NVarChar, body.remarks || null)
      .input('customer_requirements', sql.NVarChar, body.customer_requirements || null)
      .input('location', sql.VarChar, body.location || null)
      .input('postal_code', sql.VarChar, body.postal_code || null)
      .input('volts', sql.VarChar, body.volts || null)
      .input('equipment_type', sql.VarChar, body.equipment_type || null)
      .input('serviceable', sql.VarChar, body.serviceable || null)
      .input('salesman_name', sql.VarChar, body.salesman_name || null)
      .input('release_status', sql.VarChar, body.release_status || 'Release')
      .input('reservation_date', sql.Date, body.reservation_date || null)
      .input('reserved_by', sql.VarChar, body.reserved_by || null)
      .input('updated_by', sql.VarChar, body.updated_by || null)
      .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, model2, replace_ref,
        veh_no, container_mast, chassis, mast, attachment, yor, yom, battery, lta_reg,
        customer_name, repair_cost, condition, remarks,
        customer_requirements, location, postal_code, volts, equipment_type, serviceable, salesman_name,
        release_status, reservation_date, reserved_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @model2, @replace_ref,
        @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom, @battery, @lta_reg,
        @customer_name, @repair_cost, @condition, @remarks,
        @customer_requirements, @location, @postal_code, @volts, @equipment_type, @serviceable, @salesman_name,
        @release_status, @reservation_date, @reserved_by, @updated_by)`);

    return NextResponse.json(result.recordset[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/fleet error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}
