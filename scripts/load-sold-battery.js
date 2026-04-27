const sql = require('mssql');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const config = {
  server: process.env.MSSQL_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.MSSQL_DATABASE || 'FMS',
  user: process.env.MSSQL_USER || 'ReadUser',
  password: process.env.MSSQL_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};

const FILE = process.argv[2] || '/Users/eliyazar/Desktop/FMS LIST OWN(SOLD, BATTERY) COPY 210426.xlsx';

function excelDateToISO(serial) {
  if (serial == null) return null;
  if (typeof serial === 'number' && serial > 1000) {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + serial * 86400000).toISOString().slice(0, 10);
  }
  if (typeof serial === 'string') {
    const d = new Date(serial);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}
function cleanVal(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v === 0 ? null : String(v);
  if (typeof v === 'string') { const t = v.trim(); return t === '' || t === '0' ? null : t; }
  return String(v);
}
function parseNumber(v) {
  if (v == null || v === '' || v === 0 || v === '0') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
function norm(s) { return typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : ''; }

function detectHeader(data, aliases, requireKey, minMatches) {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const r = data[i];
    if (!Array.isArray(r)) continue;
    const map = {}; let m = 0;
    for (let j = 0; j < r.length; j++) {
      const k = aliases[norm(r[j])];
      if (k && map[k] === undefined) { map[k] = j; m++; }
    }
    if (map[requireKey] !== undefined && m >= minMatches) return { headerRow: i, map };
  }
  return null;
}

const SOLD_ALIASES = {solddate:'sold_date',date:'sold_date',brand:'brand',model:'model',customer:'customer',customername:'customer',vehno:'veh_no',vehicleno:'veh_no',chassisno:'chassis_no',chassisnumber:'chassis_no',chassis:'chassis_no',mast:'mast',attachment:'attachment',att:'attachment',yor:'yor',yom:'yom',ltareg:'lta_reg',ltaregistration:'lta_reg',ltaregistrationno:'lta_reg',salesman:'salesman',remarks:'remarks',remark:'remarks',dono:'do_no',donumber:'do_no'};

const BATT_ALIASES = {regenared:'regen_date',regenerated:'regen_date',regendate:'regen_date',date:'regen_date',batsn:'bat_sn',batterysn:'bat_sn',batserialno:'bat_sn',fl:'fl',flno:'fl',model:'model',supplier:'supplier',customer:'customer',amt:'amt',amount:'amt',price:'amt',supplierinvoice:'supplier_invoice',supplierinv:'supplier_invoice',supplierinv0ice:'supplier_invoice',invoice:'supplier_invoice',warranty:'warranty',volt:'volt',voltage:'volt',ah:'ah',socket:'socket'};

function parseSold(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const det = detectHeader(data, SOLD_ALIASES, 'veh_no', 4);
  if (!det) return [];
  const get = (r, k) => det.map[k] !== undefined ? r[det.map[k]] : null;
  const rows = [];
  for (let i = det.headerRow + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    if (r.filter((c) => c != null && c !== '').length === 0) continue;
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

function parseBattery(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const det = detectHeader(data, BATT_ALIASES, 'fl', 4);
  if (!det) return [];
  const get = (r, k) => det.map[k] !== undefined ? r[det.map[k]] : null;
  const rows = [];
  for (let i = det.headerRow + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    if (r.filter((c) => c != null && c !== '').length === 0) continue;
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

(async () => {
  try {
    console.log('Loading file:', FILE);
    const wb = XLSX.readFile(FILE);
    const soldWs = wb.Sheets['SOLD'] || wb.Sheets['Sold'];
    const battWs = wb.Sheets['BATT PRICE'] || wb.Sheets['BATTERY'] || wb.Sheets['BATT'];
    const soldRows = soldWs ? parseSold(soldWs) : [];
    const battRows = battWs ? parseBattery(battWs) : [];
    console.log('Parsed:', soldRows.length, 'sold,', battRows.length, 'battery');

    const pool = await sql.connect(config);
    // Ensure tables
    await pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sold_vehicles')
      CREATE TABLE sold_vehicles (id INT IDENTITY(1,1) PRIMARY KEY, sold_date DATE NULL, brand VARCHAR(100) NULL, model VARCHAR(150) NULL, customer VARCHAR(200) NULL, veh_no VARCHAR(50) NULL, chassis_no VARCHAR(100) NULL, mast VARCHAR(100) NULL, attachment VARCHAR(100) NULL, yor INT NULL, yom INT NULL, lta_reg VARCHAR(50) NULL, salesman VARCHAR(100) NULL, remarks NVARCHAR(MAX) NULL, do_no VARCHAR(50) NULL, updated_at DATETIME NOT NULL DEFAULT GETDATE())`);
    await pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'battery_prices')
      CREATE TABLE battery_prices (id INT IDENTITY(1,1) PRIMARY KEY, regen_date DATE NULL, bat_sn VARCHAR(150) NULL, fl VARCHAR(50) NULL, model VARCHAR(150) NULL, supplier VARCHAR(150) NULL, customer VARCHAR(200) NULL, amt DECIMAL(15,2) NULL, supplier_invoice VARCHAR(150) NULL, warranty VARCHAR(50) NULL, volt VARCHAR(50) NULL, ah VARCHAR(50) NULL, socket VARCHAR(50) NULL, updated_at DATETIME NOT NULL DEFAULT GETDATE())`);
    await pool.request().query(`ALTER TABLE battery_prices ALTER COLUMN amt DECIMAL(15,2) NULL`).catch(() => {});

    if (soldRows.length > 0) {
      await pool.request().query('TRUNCATE TABLE sold_vehicles');
      let n = 0;
      for (let i = 0; i < soldRows.length; i += 100) {
        const batch = soldRows.slice(i, i + 100);
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
              .query(`INSERT INTO sold_vehicles (sold_date, brand, model, customer, veh_no, chassis_no, mast, attachment, yor, yom, lta_reg, salesman, remarks, do_no) VALUES (@sold_date, @brand, @model, @customer, @veh_no, @chassis_no, @mast, @attachment, @yor, @yom, @lta_reg, @salesman, @remarks, @do_no)`);
            n++;
          }
          await tx.commit();
          process.stdout.write(`\rSold ${n}/${soldRows.length}`);
        } catch (e) { try { await tx.rollback(); } catch {} console.error('\n', e.message); throw e; }
      }
      console.log('\nSold inserted:', n);
    }

    if (battRows.length > 0) {
      await pool.request().query('TRUNCATE TABLE battery_prices');
      let n = 0;
      for (let i = 0; i < battRows.length; i += 100) {
        const batch = battRows.slice(i, i + 100);
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
              .query(`INSERT INTO battery_prices (regen_date, bat_sn, fl, model, supplier, customer, amt, supplier_invoice, warranty, volt, ah, socket) VALUES (@regen_date, @bat_sn, @fl, @model, @supplier, @customer, @amt, @supplier_invoice, @warranty, @volt, @ah, @socket)`);
            n++;
          }
          await tx.commit();
          process.stdout.write(`\rBattery ${n}/${battRows.length}`);
        } catch (e) { try { await tx.rollback(); } catch {} console.error('\n', e.message); throw e; }
      }
      console.log('\nBattery inserted:', n);
    }

    await pool.close();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
