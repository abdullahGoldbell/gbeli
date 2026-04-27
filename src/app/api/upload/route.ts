import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { ensureBootstrap } from '@/lib/bootstrap';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function excelDateToISO(serial: unknown): string | null {
  if (serial == null) return null;
  if (typeof serial === 'number' && serial > 1000) {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + serial * 86400000);
    return date.toISOString().slice(0, 10);
  }
  if (typeof serial === 'string') {
    const d = new Date(serial);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function cleanVal(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'number') return val === 0 ? null : String(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' || trimmed === '0' ? null : trimmed;
  }
  return String(val);
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === '' || val === 0 || val === '0') return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
}

interface ParsedVehicle {
  fleet_type: string;
  category: string | null;
  in_out_date: string | null;
  brand: string | null;
  model: string | null;
  model2: string | null;
  veh_no: string;
  container_mast: string | null;
  chassis: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  customer_name: string | null;
  condition: string | null;
  remarks: string | null;
  lta_reg: string | null;
  reservation_date: string | null;
  reserved_by: string | null;
}

function parseDieselSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  // Headers at row index 3: IN DATE, BRAND, MODEL, MODEL2, STATUS, RESERVATION, RESERVATION DATE, DURATION, VEH NO, CLOSED MAST, CHASSIS, MAST, ATT, YOR, YOM, Customer Name, Condition, SUPPLIER, REMARK, LTA REG
  const vehicles: ParsedVehicle[] = [];
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const vehNo = cleanVal(r[8]);
    if (!vehNo) continue;
    vehicles.push({
      fleet_type: 'DIESEL',
      category: cleanVal(r[2]), // MODEL as category for diesel
      in_out_date: excelDateToISO(r[0]),
      brand: cleanVal(r[1]),
      model: cleanVal(r[2]),
      model2: cleanVal(r[3]),
      veh_no: vehNo,
      container_mast: cleanVal(r[9]),
      chassis: cleanVal(r[10]),
      mast: cleanVal(r[11]),
      attachment: cleanVal(r[12]),
      yor: parseNumber(r[13]) ? Math.round(parseNumber(r[13])!) : null,
      yom: parseNumber(r[14]) ? Math.round(parseNumber(r[14])!) : null,
      customer_name: cleanVal(r[15]),
      condition: cleanVal(r[16]),
      remarks: cleanVal(r[18]),
      lta_reg: cleanVal(r[19]),
      reservation_date: excelDateToISO(r[6]),
      reserved_by: cleanVal(r[5]),
    });
  }
  return vehicles;
}

function parseElectricSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  // Headers at row index 3: IN DATE, BRAND, MODEL, MODEL2, RESERVATION, RESERVATION DATE, DURATION, VEH NO, C.MAST, CHASSIS, MAST, ATT, YOR, YOM, Customer Name, Condition, SUPPLIER, Remarks
  const vehicles: ParsedVehicle[] = [];
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const vehNo = cleanVal(r[7]);
    if (!vehNo) continue;
    vehicles.push({
      fleet_type: 'ELECTRICAL',
      category: cleanVal(r[2]), // MODEL as category
      in_out_date: excelDateToISO(r[0]),
      brand: cleanVal(r[1]),
      model: cleanVal(r[2]),
      model2: cleanVal(r[3]),
      veh_no: vehNo,
      container_mast: cleanVal(r[8]),
      chassis: cleanVal(r[9]),
      mast: cleanVal(r[10]),
      attachment: cleanVal(r[11]),
      yor: parseNumber(r[12]) ? Math.round(parseNumber(r[12])!) : null,
      yom: parseNumber(r[13]) ? Math.round(parseNumber(r[13])!) : null,
      customer_name: cleanVal(r[14]),
      condition: cleanVal(r[15]),
      remarks: cleanVal(r[17]),
      lta_reg: null,
      reservation_date: excelDateToISO(r[5]),
      reserved_by: cleanVal(r[4]),
    });
  }
  return vehicles;
}

function parseOutSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  // Headers at row index 3: OUT DATE, BRAND, MODEL, NAME, VEH NO, C.MAST, CHASSIS, MAST, ATT, YOR, YOM, Customer Name, Condition, SUPPLIER, Customer Requirements, LTA Reg
  const vehicles: ParsedVehicle[] = [];
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const vehNo = cleanVal(r[4]);
    if (!vehNo) continue;
    vehicles.push({
      fleet_type: 'DIESEL', // OUT vehicles can be either — default to DIESEL, can be refined
      category: cleanVal(r[2]),
      in_out_date: excelDateToISO(r[0]),
      brand: cleanVal(r[1]),
      model: cleanVal(r[2]),
      model2: cleanVal(r[3]),
      veh_no: vehNo,
      container_mast: cleanVal(r[5]),
      chassis: cleanVal(r[6]),
      mast: cleanVal(r[7]),
      attachment: cleanVal(r[8]),
      yor: parseNumber(r[9]) ? Math.round(parseNumber(r[9])!) : null,
      yom: parseNumber(r[10]) ? Math.round(parseNumber(r[10])!) : null,
      customer_name: cleanVal(r[11]),
      condition: cleanVal(r[12]),
      remarks: cleanVal(r[14]), // Customer Requirements
      lta_reg: cleanVal(r[15]),
      reservation_date: null,
      reserved_by: null,
    });
  }
  return vehicles;
}

interface SoldRow {
  sold_date: string | null;
  brand: string | null;
  model: string | null;
  customer: string | null;
  veh_no: string | null;
  chassis_no: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  lta_reg: string | null;
  salesman: string | null;
  remarks: string | null;
  do_no: string | null;
}

interface BatteryRow {
  regen_date: string | null;
  bat_sn: string | null;
  fl: string | null;
  model: string | null;
  supplier: string | null;
  customer: string | null;
  amt: number | null;
  supplier_invoice: string | null;
  warranty: string | null;
  volt: string | null;
  ah: string | null;
  socket: string | null;
}

function parseSoldSheet(ws: XLSX.WorkSheet): SoldRow[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  // headers row 3: Sold Date, Brand, Model, Customer, Veh No, [empty], Chassis No., Mast, Attachment, YOR, YOM, LTA Reg, Salesman, Remarks, DO No.
  const rows: SoldRow[] = [];
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    if (!r[0] && !r[1] && !r[2] && !r[3] && !r[4]) continue;
    rows.push({
      sold_date: excelDateToISO(r[0]),
      brand: cleanVal(r[1]),
      model: cleanVal(r[2]),
      customer: cleanVal(r[3]),
      veh_no: cleanVal(r[4]),
      chassis_no: cleanVal(r[6]),
      mast: cleanVal(r[7]),
      attachment: cleanVal(r[8]),
      yor: parseNumber(r[9]) ? Math.round(parseNumber(r[9])!) : null,
      yom: parseNumber(r[10]) ? Math.round(parseNumber(r[10])!) : null,
      lta_reg: cleanVal(r[11]),
      salesman: cleanVal(r[12]),
      remarks: cleanVal(r[13]),
      do_no: cleanVal(r[14]),
    });
  }
  return rows;
}

function parseBatterySheet(ws: XLSX.WorkSheet): BatteryRow[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  // headers row 0: REGENARED, BAT S/N, FL, MODEL, SUPPLIER, CUSTOMER, AMT, SUPPLIER INVOICE, WARRANTY, VOLT, AH, SOCKET
  const rows: BatteryRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    if (!r[0] && !r[1] && !r[2] && !r[3]) continue;
    rows.push({
      regen_date: excelDateToISO(r[0]),
      bat_sn: cleanVal(r[1]),
      fl: cleanVal(r[2]),
      model: cleanVal(r[3]),
      supplier: cleanVal(r[4]),
      customer: cleanVal(r[5]),
      amt: parseNumber(r[6]),
      supplier_invoice: cleanVal(r[7]),
      warranty: cleanVal(r[8]),
      volt: cleanVal(r[9]),
      ah: cleanVal(r[10]),
      socket: cleanVal(r[11]),
    });
  }
  return rows;
}

async function replaceSold(pool: Awaited<ReturnType<typeof getPool>>, rows: SoldRow[]): Promise<number> {
  await pool.request().query('TRUNCATE TABLE sold_vehicles');
  let count = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const r of batch) {
        await new sql.Request(tx)
          .input('sold_date', sql.Date, r.sold_date)
          .input('brand', sql.VarChar, r.brand)
          .input('model', sql.VarChar, r.model)
          .input('customer', sql.VarChar, r.customer)
          .input('veh_no', sql.VarChar, r.veh_no)
          .input('chassis_no', sql.VarChar, r.chassis_no)
          .input('mast', sql.VarChar, r.mast)
          .input('attachment', sql.VarChar, r.attachment)
          .input('yor', sql.Int, r.yor)
          .input('yom', sql.Int, r.yom)
          .input('lta_reg', sql.VarChar, r.lta_reg)
          .input('salesman', sql.VarChar, r.salesman)
          .input('remarks', sql.NVarChar, r.remarks)
          .input('do_no', sql.VarChar, r.do_no)
          .query(`INSERT INTO sold_vehicles (sold_date, brand, model, customer, veh_no, chassis_no, mast, attachment, yor, yom, lta_reg, salesman, remarks, do_no)
                  VALUES (@sold_date, @brand, @model, @customer, @veh_no, @chassis_no, @mast, @attachment, @yor, @yom, @lta_reg, @salesman, @remarks, @do_no)`);
        count++;
      }
      await tx.commit();
    } catch (e) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      console.error('Batch SQL error:', e);
      throw e;
    }
  }
  return count;
}

async function replaceBattery(pool: Awaited<ReturnType<typeof getPool>>, rows: BatteryRow[]): Promise<number> {
  await pool.request().query('TRUNCATE TABLE battery_prices');
  let count = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const r of batch) {
        await new sql.Request(tx)
          .input('regen_date', sql.Date, r.regen_date)
          .input('bat_sn', sql.VarChar, r.bat_sn)
          .input('fl', sql.VarChar, r.fl)
          .input('model', sql.VarChar, r.model)
          .input('supplier', sql.VarChar, r.supplier)
          .input('customer', sql.VarChar, r.customer)
          .input('amt', sql.Decimal(10, 2), r.amt)
          .input('supplier_invoice', sql.VarChar, r.supplier_invoice)
          .input('warranty', sql.VarChar, r.warranty)
          .input('volt', sql.VarChar, r.volt)
          .input('ah', sql.VarChar, r.ah)
          .input('socket', sql.VarChar, r.socket)
          .query(`INSERT INTO battery_prices (regen_date, bat_sn, fl, model, supplier, customer, amt, supplier_invoice, warranty, volt, ah, socket)
                  VALUES (@regen_date, @bat_sn, @fl, @model, @supplier, @customer, @amt, @supplier_invoice, @warranty, @volt, @ah, @socket)`);
        count++;
      }
      await tx.commit();
    } catch (e) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      console.error('Batch SQL error:', e);
      throw e;
    }
  }
  return count;
}

async function bulkInsertFleet(pool: Awaited<ReturnType<typeof getPool>>, vehicles: ParsedVehicle[], updatedBy: string, releaseStatus: string = 'Release'): Promise<number> {
  let count = 0;
  for (let i = 0; i < vehicles.length; i += 100) {
    const batch = vehicles.slice(i, i + 100);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const v of batch) {
        await new sql.Request(tx)
          .input('fleet_type', sql.VarChar, v.fleet_type)
          .input('category', sql.VarChar, v.category)
          .input('in_out_date', sql.Date, v.in_out_date)
          .input('brand', sql.VarChar, v.brand)
          .input('model', sql.VarChar, v.model)
          .input('model2', sql.VarChar, v.model2)
          .input('veh_no', sql.VarChar, v.veh_no)
          .input('container_mast', sql.VarChar, v.container_mast)
          .input('chassis', sql.VarChar, v.chassis)
          .input('mast', sql.VarChar, v.mast)
          .input('attachment', sql.VarChar, v.attachment)
          .input('yor', sql.Int, v.yor)
          .input('yom', sql.Int, v.yom)
          .input('customer_name', sql.VarChar, v.customer_name)
          .input('condition', sql.VarChar, v.condition)
          .input('remarks', sql.NVarChar, v.remarks)
          .input('lta_reg', sql.VarChar, v.lta_reg)
          .input('reservation_date', sql.Date, v.reservation_date)
          .input('reserved_by', sql.VarChar, v.reserved_by)
          .input('updated_by', sql.VarChar, updatedBy)
          .input('release_status', sql.VarChar, releaseStatus)
          .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, model2,
                  veh_no, container_mast, chassis, mast, attachment, yor, yom,
                  customer_name, condition, remarks, lta_reg,
                  reservation_date, reserved_by, updated_by, release_status, updated_at)
                  VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @model2,
                  @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom,
                  @customer_name, @condition, @remarks, @lta_reg,
                  @reservation_date, @reserved_by, @updated_by, @release_status, GETDATE())`);
        count++;
      }
      await tx.commit();
    } catch (e) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      console.error('Fleet insert batch error:', e);
      throw e;
    }
  }
  return count;
}

async function upsertVehicles(pool: Awaited<ReturnType<typeof getPool>>, vehicles: ParsedVehicle[], updatedBy: string, releaseStatus: string | null = null): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < vehicles.length; i += 50) {
    const batch = vehicles.slice(i, i + 50);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const v of batch) {
        const req = new sql.Request(transaction);
        req.input('veh_no', sql.VarChar, v.veh_no);
        req.input('fleet_type', sql.VarChar, v.fleet_type);
        req.input('category', sql.VarChar, v.category);
        req.input('in_out_date', sql.Date, v.in_out_date);
        req.input('brand', sql.VarChar, v.brand);
        req.input('model', sql.VarChar, v.model);
        req.input('model2', sql.VarChar, v.model2);
        req.input('container_mast', sql.VarChar, v.container_mast);
        req.input('chassis', sql.VarChar, v.chassis);
        req.input('mast', sql.VarChar, v.mast);
        req.input('attachment', sql.VarChar, v.attachment);
        req.input('yor', sql.Int, v.yor);
        req.input('yom', sql.Int, v.yom);
        req.input('customer_name', sql.VarChar, v.customer_name);
        req.input('condition', sql.VarChar, v.condition);
        req.input('remarks', sql.NVarChar, v.remarks);
        req.input('lta_reg', sql.VarChar, v.lta_reg);
        req.input('reservation_date', sql.Date, v.reservation_date);
        req.input('reserved_by', sql.VarChar, v.reserved_by);
        req.input('updated_by', sql.VarChar, updatedBy);
        req.input('release_status', sql.VarChar, releaseStatus);

        // Check if record exists before MERGE to track insert vs update
        const exists = await new sql.Request(transaction)
          .input('vn', sql.VarChar, v.veh_no)
          .query(`SELECT 1 as found FROM fleet WHERE veh_no = @vn`);
        const isUpdate = exists.recordset.length > 0;

        await req.query(`
          MERGE fleet AS target
          USING (SELECT @veh_no AS veh_no) AS source
          ON target.veh_no = source.veh_no
          WHEN MATCHED THEN UPDATE SET
            fleet_type = @fleet_type, category = @category, in_out_date = @in_out_date,
            brand = @brand, model = @model, model2 = @model2,
            container_mast = @container_mast, chassis = @chassis, mast = @mast,
            attachment = @attachment, yor = @yor, yom = @yom,
            customer_name = @customer_name, condition = @condition, remarks = @remarks,
            lta_reg = @lta_reg,
            reservation_date = COALESCE(@reservation_date, target.reservation_date),
            reserved_by = COALESCE(@reserved_by, target.reserved_by),
            release_status = COALESCE(@release_status, target.release_status),
            updated_by = @updated_by, updated_at = GETDATE()
          WHEN NOT MATCHED THEN INSERT (
            fleet_type, category, in_out_date, brand, model, model2,
            veh_no, container_mast, chassis, mast, attachment, yor, yom,
            customer_name, condition, remarks, lta_reg,
            reservation_date, reserved_by, updated_by, release_status
          ) VALUES (
            @fleet_type, @category, @in_out_date, @brand, @model, @model2,
            @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom,
            @customer_name, @condition, @remarks, @lta_reg,
            @reservation_date, @reserved_by, @updated_by, COALESCE(@release_status, 'Release')
          );
        `);
        if (isUpdate) updated++;
        else inserted++;
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  return { inserted, updated };
}

export async function POST(req: NextRequest) {
  try {
    await ensureBootstrap();
    // Auth check — must be admin
    const isAdmin = req.headers.get('x-user-is-admin') === 'true';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const username = req.headers.get('x-user-username') || 'UPLOAD';
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return NextResponse.json({ error: 'Only .xlsx and .xls files are allowed' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 });
    }

    // Read and validate buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return NextResponse.json({ error: 'File does not appear to be a valid Excel file' }, { status: 400 });
    }

    // Parse workbook
    const wb = XLSX.read(buffer, { type: 'buffer' });

    // Mode: fleet (default) | sold | battery — restricts which sheets are processed
    const mode = (new URL(req.url).searchParams.get('mode') || 'fleet').toLowerCase();
    const allowFleet = mode === 'fleet';
    const allowSold = mode === 'fleet' || mode === 'sold';
    const allowBattery = mode === 'fleet' || mode === 'battery';

    const dieselWs = allowFleet ? (wb.Sheets['DIESEL'] || wb.Sheets['Diesel'] || wb.Sheets['Diesel ']) : null;
    const electricWs = allowFleet ? (wb.Sheets['ELECTRIC'] || wb.Sheets['ELECTRICAL'] || wb.Sheets['Electrical']) : null;
    const outWs = allowFleet ? (wb.Sheets['OUT'] || wb.Sheets['Out'] || wb.Sheets['out']) : null;
    const soldFallback = mode === 'sold' ? wb.Sheets[wb.SheetNames[0]] : null;
    const batteryFallback = mode === 'battery' ? wb.Sheets[wb.SheetNames[0]] : null;
    const soldWs = allowSold ? (wb.Sheets['SOLD'] || wb.Sheets['Sold'] || wb.Sheets['sold'] || soldFallback) : null;
    const batteryWs = allowBattery ? (wb.Sheets['BATT PRICE'] || wb.Sheets['BATTERY'] || wb.Sheets['Battery'] || wb.Sheets['BATT'] || batteryFallback) : null;

    if (!dieselWs && !electricWs && !outWs && !soldWs && !batteryWs) {
      return NextResponse.json(
        { error: `No recognized sheets found. Expected: DIESEL, ELECTRIC, OUT, SOLD, or BATT PRICE. Found: ${wb.SheetNames.join(', ')}` },
        { status: 400 },
      );
    }

    // Parse each sheet
    const dieselVehicles = dieselWs ? parseDieselSheet(dieselWs) : [];
    const electricVehicles = electricWs ? parseElectricSheet(electricWs) : [];
    const outVehicles = outWs ? parseOutSheet(outWs) : [];
    const soldRows = soldWs ? parseSoldSheet(soldWs) : [];
    const batteryRows = batteryWs ? parseBatterySheet(batteryWs) : [];

    const pool = await getPool();

    let totalInserted = 0;
    const totalUpdated = 0;

    // Fleet mode = full replace: TRUNCATE then bulk insert (overwrites reservations/edits)
    if (mode === 'fleet' && (dieselVehicles.length > 0 || electricVehicles.length > 0 || outVehicles.length > 0)) {
      await pool.request().query('TRUNCATE TABLE fleet');
    }

    if (dieselVehicles.length > 0) {
      totalInserted += await bulkInsertFleet(pool, dieselVehicles, username, 'Release');
    }
    if (electricVehicles.length > 0) {
      totalInserted += await bulkInsertFleet(pool, electricVehicles, username, 'Release');
    }
    if (outVehicles.length > 0) {
      totalInserted += await bulkInsertFleet(pool, outVehicles, username, 'OUT');
    }

    let soldCount = 0;
    let batteryCount = 0;
    if (soldRows.length > 0) soldCount = await replaceSold(pool, soldRows);
    if (batteryRows.length > 0) batteryCount = await replaceBattery(pool, batteryRows);

    return NextResponse.json({
      success: true,
      filename: file.name,
      diesel: dieselVehicles.length,
      electric: electricVehicles.length,
      out: outVehicles.length,
      sold: soldCount,
      battery: batteryCount,
      total: dieselVehicles.length + electricVehicles.length + outVehicles.length + soldCount + batteryCount,
      inserted: totalInserted,
      updated: totalUpdated,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process uploaded file: ${msg}` }, { status: 500 });
  }
}
