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
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};

const FILE = process.argv[2] || '/Users/eliyazar/Desktop/FMS LIST OWN(OUT) COPY 210426.xlsx';

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
  return isNaN(n) ? null : Math.round(n);
}
function norm(s) { return typeof s === 'string' ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : ''; }

const ALIASES = {
  indate: 'in_out_date', outdate: 'in_out_date', inoutdate: 'in_out_date', date: 'in_out_date',
  brand: 'brand', model: 'model', name: 'name',
  vehno: 'veh_no', vehicleno: 'veh_no',
  closedmast: 'container_mast', cmast: 'container_mast', containermast: 'container_mast',
  chassis: 'chassis', chassisno: 'chassis',
  mast: 'mast', att: 'attachment', attachment: 'attachment',
  yor: 'yor', yom: 'yom',
  customer: 'customer_name', customername: 'customer_name',
  condition: 'condition', supplier: 'supplier',
  remark: 'remarks', remarks: 'remarks',
  customerrequirements: 'remarks', customerrequirement: 'remarks',
  ltareg: 'lta_reg', ltaregistration: 'lta_reg', ltaregistrationno: 'lta_reg',
};

function parseSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  let header = null;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const r = data[i];
    if (!Array.isArray(r)) continue;
    const map = {}; let m = 0;
    for (let j = 0; j < r.length; j++) {
      const k = ALIASES[norm(r[j])];
      if (k && map[k] === undefined) { map[k] = j; m++; }
    }
    if (map.veh_no !== undefined && m >= 5) { header = { row: i, map }; break; }
  }
  if (!header) return [];
  const get = (r, k) => header.map[k] !== undefined ? r[header.map[k]] : null;
  const rows = [];
  let cat = null;
  for (let i = header.row + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const filled = r.filter((c) => c != null && c !== '').length;
    const vehNo = cleanVal(get(r, 'veh_no'));
    if (!vehNo && filled === 1) {
      const s = r.find((c) => typeof c === 'string');
      if (s) cat = s.trim();
      continue;
    }
    if (!vehNo) continue;
    rows.push({
      out_date: excelDateToISO(get(r, 'in_out_date')),
      brand: cleanVal(get(r, 'brand')),
      model: cleanVal(get(r, 'model')),
      name: cleanVal(get(r, 'name')),
      veh_no: vehNo,
      container_mast: cleanVal(get(r, 'container_mast')),
      chassis: cleanVal(get(r, 'chassis')),
      mast: cleanVal(get(r, 'mast')),
      attachment: cleanVal(get(r, 'attachment')),
      yor: parseNumber(get(r, 'yor')),
      yom: parseNumber(get(r, 'yom')),
      customer_name: cleanVal(get(r, 'customer_name')),
      condition: cleanVal(get(r, 'condition')),
      supplier: cleanVal(get(r, 'supplier')),
      remarks: cleanVal(get(r, 'remarks')),
      lta_reg: cleanVal(get(r, 'lta_reg')),
      category: cat,
    });
  }
  return rows;
}

(async () => {
  try {
    console.log('Loading file:', FILE);
    const wb = XLSX.readFile(FILE);
    const ws = wb.Sheets['OUT'] || wb.Sheets['Out'] || wb.Sheets['out'] || wb.Sheets[wb.SheetNames[0]];
    const rows = parseSheet(ws);
    console.log('Parsed:', rows.length, 'OUT rows');
    if (rows.length > 0) {
      console.log('Sample row 1:', rows[0]);
    }

    const pool = await sql.connect(config);
    await pool.request().query('TRUNCATE TABLE out_vehicles');
    let n = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        for (const r of batch) {
          await new sql.Request(tx)
            .input('out_date', sql.Date, r.out_date)
            .input('brand', sql.VarChar, r.brand)
            .input('model', sql.VarChar, r.model)
            .input('name', sql.VarChar, r.name)
            .input('veh_no', sql.VarChar, r.veh_no)
            .input('container_mast', sql.VarChar, r.container_mast)
            .input('chassis', sql.VarChar, r.chassis)
            .input('mast', sql.VarChar, r.mast)
            .input('attachment', sql.VarChar, r.attachment)
            .input('yor', sql.Int, r.yor)
            .input('yom', sql.Int, r.yom)
            .input('customer_name', sql.VarChar, r.customer_name)
            .input('condition', sql.VarChar, r.condition)
            .input('supplier', sql.VarChar, r.supplier)
            .input('remarks', sql.NVarChar(sql.MAX), r.remarks)
            .input('lta_reg', sql.VarChar, r.lta_reg)
            .input('category', sql.VarChar, r.category)
            .query(`INSERT INTO out_vehicles (out_date, brand, model, name, veh_no, container_mast, chassis, mast, attachment, yor, yom, customer_name, condition, supplier, remarks, lta_reg, category) VALUES (@out_date, @brand, @model, @name, @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom, @customer_name, @condition, @supplier, @remarks, @lta_reg, @category)`);
          n++;
        }
        await tx.commit();
        process.stdout.write(`\rOUT ${n}/${rows.length}`);
      } catch (e) { try { await tx.rollback(); } catch {} console.error('\n', e.message); throw e; }
    }
    console.log('\nDone. Total inserted:', n);
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
