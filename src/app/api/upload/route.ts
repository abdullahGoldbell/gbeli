import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
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
  name: string | null;
  veh_no: string;
  container_mast: string | null;
  chassis: string | null;
  mast: string | null;
  attachment: string | null;
  yor: number | null;
  yom: number | null;
  customer_name: string | null;
  condition: string | null;
  supplier: string | null;
  remarks: string | null;
  lta_reg: string | null;
}

// Header alias map → canonical field. All keys lowercased, trimmed, non-alphanumeric stripped.
const HEADER_ALIASES: Record<string, string> = {
  indate: 'in_out_date',
  outdate: 'in_out_date',
  inoutdate: 'in_out_date',
  date: 'in_out_date',
  brand: 'brand',
  model: 'model',
  name: 'name',
  vehno: 'veh_no',
  vehicleno: 'veh_no',
  vehiclenumber: 'veh_no',
  closedmast: 'container_mast',
  cmast: 'container_mast',
  containermast: 'container_mast',
  chassis: 'chassis',
  chassisno: 'chassis',
  mast: 'mast',
  att: 'attachment',
  attachment: 'attachment',
  yor: 'yor',
  yearofreg: 'yor',
  yom: 'yom',
  yearofmfg: 'yom',
  customer: 'customer_name',
  customername: 'customer_name',
  condition: 'condition',
  supplier: 'supplier',
  remark: 'remarks',
  remarks: 'remarks',
  customerrequirements: 'remarks',
  customerrequirement: 'remarks',
  ltareg: 'lta_reg',
  ltaregistration: 'lta_reg',
  ltaregistrationno: 'lta_reg',
};

function normalizeHeader(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectHeaderRow(data: unknown[][]): { headerRow: number; map: Record<string, number> } | null {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const r = data[i];
    if (!Array.isArray(r)) continue;
    const map: Record<string, number> = {};
    let matches = 0;
    for (let j = 0; j < r.length; j++) {
      const key = HEADER_ALIASES[normalizeHeader(r[j])];
      if (key && map[key] === undefined) { map[key] = j; matches++; }
    }
    // Need at least veh_no + a few common fields to lock the header row
    if (map.veh_no !== undefined && matches >= 5) {
      return { headerRow: i, map };
    }
  }
  return null;
}

function parseFleetSheet(ws: XLSX.WorkSheet, fleetType: 'DIESEL' | 'ELECTRICAL'): ParsedVehicle[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const detected = detectHeaderRow(data);
  if (!detected) return [];
  const { headerRow, map } = detected;
  const get = (r: unknown[], key: string): unknown => {
    const idx = map[key];
    return idx !== undefined ? r[idx] : null;
  };
  const vehicles: ParsedVehicle[] = [];
  let currentCategory: string | null = null;
  for (let i = headerRow + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const filled = r.filter((c) => c != null && c !== '').length;
    const vehNo = cleanVal(get(r, 'veh_no'));
    // Category separator: a row with only one cell filled and no veh_no
    if (!vehNo && filled === 1) {
      const firstStr = r.find((c) => typeof c === 'string') as string | undefined;
      if (firstStr) currentCategory = firstStr.trim();
      continue;
    }
    if (!vehNo) continue;
    const yor = parseNumber(get(r, 'yor'));
    const yom = parseNumber(get(r, 'yom'));
    vehicles.push({
      fleet_type: fleetType,
      category: currentCategory,
      in_out_date: excelDateToISO(get(r, 'in_out_date')),
      brand: cleanVal(get(r, 'brand')),
      model: cleanVal(get(r, 'model')),
      name: cleanVal(get(r, 'name')),
      veh_no: vehNo,
      container_mast: cleanVal(get(r, 'container_mast')),
      chassis: cleanVal(get(r, 'chassis')),
      mast: cleanVal(get(r, 'mast')),
      attachment: cleanVal(get(r, 'attachment')),
      yor: yor != null ? Math.round(yor) : null,
      yom: yom != null ? Math.round(yom) : null,
      customer_name: cleanVal(get(r, 'customer_name')),
      condition: cleanVal(get(r, 'condition')),
      supplier: cleanVal(get(r, 'supplier')),
      remarks: cleanVal(get(r, 'remarks')),
      lta_reg: cleanVal(get(r, 'lta_reg')),
    });
  }
  return vehicles;
}

function parseDieselSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  return parseFleetSheet(ws, 'DIESEL');
}

function parseElectricSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  return parseFleetSheet(ws, 'ELECTRICAL');
}

function parseOutSheet(ws: XLSX.WorkSheet): ParsedVehicle[] {
  return parseFleetSheet(ws, 'DIESEL');
}

async function replaceOutTable(pool: Awaited<ReturnType<typeof getPool>>, vehicles: ParsedVehicle[]): Promise<number> {
  await pool.request().query('TRUNCATE TABLE out_vehicles');
  let count = 0;
  for (let i = 0; i < vehicles.length; i += 50) {
    const batch = vehicles.slice(i, i + 50);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const v of batch) {
        await new sql.Request(tx)
          .input('out_date', sql.Date, v.in_out_date)
          .input('brand', sql.VarChar, v.brand)
          .input('model', sql.VarChar, v.model)
          .input('name', sql.VarChar, v.name)
          .input('veh_no', sql.VarChar, v.veh_no)
          .input('container_mast', sql.VarChar, v.container_mast)
          .input('chassis', sql.VarChar, v.chassis)
          .input('mast', sql.VarChar, v.mast)
          .input('attachment', sql.VarChar, v.attachment)
          .input('yor', sql.Int, v.yor)
          .input('yom', sql.Int, v.yom)
          .input('customer_name', sql.VarChar, v.customer_name)
          .input('condition', sql.VarChar, v.condition)
          .input('supplier', sql.VarChar, v.supplier)
          .input('remarks', sql.NVarChar(sql.MAX), v.remarks)
          .input('lta_reg', sql.VarChar, v.lta_reg)
          .input('category', sql.VarChar, v.category)
          .query(`INSERT INTO out_vehicles (out_date, brand, model, name, veh_no, container_mast, chassis, mast, attachment, yor, yom, customer_name, condition, supplier, remarks, lta_reg, category)
                  VALUES (@out_date, @brand, @model, @name, @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom, @customer_name, @condition, @supplier, @remarks, @lta_reg, @category)`);
        count++;
      }
      await tx.commit();
    } catch (err) {
      try { await tx.rollback(); } catch { /* */ }
      console.error('OUT batch error:', err);
      throw err;
    }
  }
  return count;
}

// ============ SOLD ============
const SOLD_ALIASES: Record<string, string> = {
  solddate: 'sold_date',
  date: 'sold_date',
  brand: 'brand',
  model: 'model',
  customer: 'customer',
  customername: 'customer',
  vehno: 'veh_no',
  vehicleno: 'veh_no',
  chassisno: 'chassis_no',
  chassisnumber: 'chassis_no',
  chassis: 'chassis_no',
  mast: 'mast',
  attachment: 'attachment',
  att: 'attachment',
  yor: 'yor',
  yom: 'yom',
  ltareg: 'lta_reg',
  ltaregistration: 'lta_reg',
  ltaregistrationno: 'lta_reg',
  salesman: 'salesman',
  remarks: 'remarks',
  remark: 'remarks',
  dono: 'do_no',
  donumber: 'do_no',
};

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

function detectHeaderRowGeneric(data: unknown[][], aliases: Record<string, string>, requireKey: string, minMatches: number): { headerRow: number; map: Record<string, number> } | null {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const r = data[i];
    if (!Array.isArray(r)) continue;
    const map: Record<string, number> = {};
    let matches = 0;
    for (let j = 0; j < r.length; j++) {
      const k = aliases[normalizeHeader(r[j])];
      if (k && map[k] === undefined) { map[k] = j; matches++; }
    }
    if (map[requireKey] !== undefined && matches >= minMatches) return { headerRow: i, map };
  }
  return null;
}

function parseSoldSheet(ws: XLSX.WorkSheet): SoldRow[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const detected = detectHeaderRowGeneric(data, SOLD_ALIASES, 'veh_no', 4);
  if (!detected) return [];
  const { headerRow, map } = detected;
  const get = (r: unknown[], key: string) => map[key] !== undefined ? r[map[key]] : null;
  const rows: SoldRow[] = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const filled = r.filter((c) => c != null && c !== '').length;
    if (filled === 0) continue;
    const yor = parseNumber(get(r, 'yor'));
    const yom = parseNumber(get(r, 'yom'));
    rows.push({
      sold_date: excelDateToISO(get(r, 'sold_date')),
      brand: cleanVal(get(r, 'brand')),
      model: cleanVal(get(r, 'model')),
      customer: cleanVal(get(r, 'customer')),
      veh_no: cleanVal(get(r, 'veh_no')),
      chassis_no: cleanVal(get(r, 'chassis_no')),
      mast: cleanVal(get(r, 'mast')),
      attachment: cleanVal(get(r, 'attachment')),
      yor: yor != null ? Math.round(yor) : null,
      yom: yom != null ? Math.round(yom) : null,
      lta_reg: cleanVal(get(r, 'lta_reg')),
      salesman: cleanVal(get(r, 'salesman')),
      remarks: cleanVal(get(r, 'remarks')),
      do_no: cleanVal(get(r, 'do_no')),
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
          .input('remarks', sql.NVarChar(sql.MAX), r.remarks)
          .input('do_no', sql.VarChar, r.do_no)
          .query(`INSERT INTO sold_vehicles (sold_date, brand, model, customer, veh_no, chassis_no, mast, attachment, yor, yom, lta_reg, salesman, remarks, do_no)
                  VALUES (@sold_date, @brand, @model, @customer, @veh_no, @chassis_no, @mast, @attachment, @yor, @yom, @lta_reg, @salesman, @remarks, @do_no)`);
        count++;
      }
      await tx.commit();
    } catch (e) {
      try { await tx.rollback(); } catch { /* */ }
      console.error('Sold batch error:', e);
      throw e;
    }
  }
  return count;
}

// ============ BATTERY ============
const BATTERY_ALIASES: Record<string, string> = {
  regenared: 'regen_date',
  regenerated: 'regen_date',
  regendate: 'regen_date',
  date: 'regen_date',
  batsn: 'bat_sn',
  batterysn: 'bat_sn',
  batserialno: 'bat_sn',
  fl: 'fl',
  flno: 'fl',
  model: 'model',
  supplier: 'supplier',
  customer: 'customer',
  amt: 'amt',
  amount: 'amt',
  price: 'amt',
  supplierinvoice: 'supplier_invoice',
  supplierinv: 'supplier_invoice',
  supplierinv0ice: 'supplier_invoice',
  invoice: 'supplier_invoice',
  warranty: 'warranty',
  volt: 'volt',
  voltage: 'volt',
  ah: 'ah',
  socket: 'socket',
};

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

function parseBatterySheet(ws: XLSX.WorkSheet): BatteryRow[] {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const detected = detectHeaderRowGeneric(data, BATTERY_ALIASES, 'fl', 4);
  if (!detected) return [];
  const { headerRow, map } = detected;
  const get = (r: unknown[], key: string) => map[key] !== undefined ? r[map[key]] : null;
  const rows: BatteryRow[] = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const filled = r.filter((c) => c != null && c !== '').length;
    if (filled === 0) continue;
    rows.push({
      regen_date: excelDateToISO(get(r, 'regen_date')),
      bat_sn: cleanVal(get(r, 'bat_sn')),
      fl: cleanVal(get(r, 'fl')),
      model: cleanVal(get(r, 'model')),
      supplier: cleanVal(get(r, 'supplier')),
      customer: cleanVal(get(r, 'customer')),
      amt: parseNumber(get(r, 'amt')),
      supplier_invoice: cleanVal(get(r, 'supplier_invoice')),
      warranty: cleanVal(get(r, 'warranty')),
      volt: cleanVal(get(r, 'volt')),
      ah: cleanVal(get(r, 'ah')),
      socket: cleanVal(get(r, 'socket')),
    });
  }
  return rows;
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
          .input('amt', sql.Decimal(15, 2), r.amt)
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
      try { await tx.rollback(); } catch { /* */ }
      console.error('Battery batch error:', e);
      throw e;
    }
  }
  return count;
}

async function bulkInsertFleet(pool: Awaited<ReturnType<typeof getPool>>, vehicles: ParsedVehicle[], updatedBy: string): Promise<number> {
  let count = 0;
  for (let i = 0; i < vehicles.length; i += 50) {
    const batch = vehicles.slice(i, i + 50);
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
          .input('name', sql.VarChar, v.name)
          .input('veh_no', sql.VarChar, v.veh_no)
          .input('container_mast', sql.VarChar, v.container_mast)
          .input('chassis', sql.VarChar, v.chassis)
          .input('mast', sql.VarChar, v.mast)
          .input('attachment', sql.VarChar, v.attachment)
          .input('yor', sql.Int, v.yor)
          .input('yom', sql.Int, v.yom)
          .input('customer_name', sql.VarChar, v.customer_name)
          .input('condition', sql.VarChar, v.condition)
          .input('supplier', sql.VarChar, v.supplier)
          .input('remarks', sql.NVarChar(sql.MAX), v.remarks)
          .input('lta_reg', sql.VarChar, v.lta_reg)
          .input('updated_by', sql.VarChar, updatedBy)
          .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, name,
                  veh_no, container_mast, chassis, mast, attachment, yor, yom,
                  customer_name, condition, supplier, remarks, lta_reg,
                  release_status, updated_by, updated_at)
                  VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @name,
                  @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom,
                  @customer_name, @condition, @supplier, @remarks, @lta_reg,
                  'Release', @updated_by, GETDATE())`);
        count++;
      }
      await tx.commit();
    } catch (err) {
      try { await tx.rollback(); } catch { /* already rolled back */ }
      console.error('Fleet insert batch error:', err);
      throw err;
    }
  }
  return count;
}

export async function POST(req: NextRequest) {
  try {
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
    const mode = (new URL(req.url).searchParams.get('mode') || 'fleet').toLowerCase();
    const pool = await getPool();

    if (mode === 'sold') {
      const ws = wb.Sheets['SOLD'] || wb.Sheets['Sold'] || wb.Sheets['sold'] || wb.Sheets[wb.SheetNames[0]];
      if (!ws) return NextResponse.json({ error: 'No sheet found' }, { status: 400 });
      const rows = parseSoldSheet(ws);
      const inserted = await replaceSold(pool, rows);
      return NextResponse.json({ success: true, filename: file.name, sold: inserted, total: inserted, inserted, updated: 0, diesel: 0, electric: 0 });
    }

    if (mode === 'battery') {
      const ws = wb.Sheets['BATT PRICE'] || wb.Sheets['BATTERY'] || wb.Sheets['Battery'] || wb.Sheets['BATT'] || wb.Sheets[wb.SheetNames[0]];
      if (!ws) return NextResponse.json({ error: 'No sheet found' }, { status: 400 });
      const rows = parseBatterySheet(ws);
      const inserted = await replaceBattery(pool, rows);
      return NextResponse.json({ success: true, filename: file.name, battery: inserted, total: inserted, inserted, updated: 0, diesel: 0, electric: 0 });
    }

    if (mode === 'out') {
      const ws = wb.Sheets['OUT'] || wb.Sheets['Out'] || wb.Sheets['out'] || wb.Sheets[wb.SheetNames[0]];
      if (!ws) return NextResponse.json({ error: 'No sheet found' }, { status: 400 });
      const rows = parseOutSheet(ws);
      const inserted = await replaceOutTable(pool, rows);
      return NextResponse.json({ success: true, filename: file.name, out: inserted, total: inserted, inserted, updated: 0, diesel: 0, electric: 0 });
    }

    // Default mode: fleet
    const dieselWs = wb.Sheets['DIESEL'] || wb.Sheets['Diesel'] || wb.Sheets['Diesel '];
    const electricWs = wb.Sheets['ELECTRIC'] || wb.Sheets['ELECTRICAL'] || wb.Sheets['Electrical'];

    if (!dieselWs && !electricWs) {
      return NextResponse.json(
        { error: `No recognized sheets found. Expected: DIESEL or ELECTRIC. Found: ${wb.SheetNames.join(', ')}` },
        { status: 400 },
      );
    }

    const dieselVehicles = dieselWs ? parseDieselSheet(dieselWs) : [];
    const electricVehicles = electricWs ? parseElectricSheet(electricWs) : [];

    let totalInserted = 0;
    if (dieselVehicles.length > 0 || electricVehicles.length > 0) {
      await pool.request().query('TRUNCATE TABLE fleet');
    }
    if (dieselVehicles.length > 0) {
      totalInserted += await bulkInsertFleet(pool, dieselVehicles, username);
    }
    if (electricVehicles.length > 0) {
      totalInserted += await bulkInsertFleet(pool, electricVehicles, username);
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      diesel: dieselVehicles.length,
      electric: electricVehicles.length,
      total: dieselVehicles.length + electricVehicles.length,
      inserted: totalInserted,
      updated: 0,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process uploaded file: ${msg}` }, { status: 500 });
  }
}
