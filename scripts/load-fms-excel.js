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

const FILE = process.argv[2] || '/Users/eliyazar/Desktop/FMS_Diesel_Electric.xlsx';

function excelDateToISO(serial) {
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

function cleanVal(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val === 0 ? null : String(val);
  if (typeof val === 'string') {
    const t = val.trim();
    return t === '' || t === '0' ? null : t;
  }
  return String(val);
}

function parseNumber(val) {
  if (val == null || val === '' || val === 0 || val === '0') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : Math.round(n);
}

function parseSheet(ws, fleetType) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const rows = [];
  let category = null;
  for (let i = 4; i < data.length; i++) {
    const r = data[i];
    if (!r || !Array.isArray(r)) continue;
    const filled = r.filter((c) => c != null && c !== '').length;
    const vehNo = cleanVal(r[4]);
    if (!vehNo && filled === 1 && typeof r[0] === 'string') {
      category = r[0].trim();
      continue;
    }
    if (!vehNo) continue;
    rows.push({
      fleet_type: fleetType,
      category,
      in_out_date: excelDateToISO(r[0]),
      brand: cleanVal(r[1]),
      model: cleanVal(r[2]),
      name: cleanVal(r[3]),
      veh_no: vehNo,
      container_mast: cleanVal(r[5]),
      chassis: cleanVal(r[6]),
      mast: cleanVal(r[7]),
      attachment: cleanVal(r[8]),
      yor: parseNumber(r[9]),
      yom: parseNumber(r[10]),
      customer_name: cleanVal(r[11]),
      condition: cleanVal(r[12]),
      supplier: cleanVal(r[13]),
      remarks: cleanVal(r[14]),
      lta_reg: fleetType === 'DIESEL' ? cleanVal(r[15]) : null,
    });
  }
  return rows;
}

(async () => {
  try {
    console.log('Loading file:', FILE);
    const wb = XLSX.readFile(FILE);
    const dieselWs = wb.Sheets['DIESEL'];
    const electricWs = wb.Sheets['ELECTRIC'];
    const diesel = dieselWs ? parseSheet(dieselWs, 'DIESEL') : [];
    const electric = electricWs ? parseSheet(electricWs, 'ELECTRICAL') : [];
    console.log('Parsed:', diesel.length, 'diesel,', electric.length, 'electric');

    const pool = await sql.connect(config);

    // Ensure schema columns exist
    await pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'name')
                                ALTER TABLE fleet ADD name VARCHAR(150) NULL`).catch((e) => console.warn('ALTER name:', e.message));
    await pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'supplier')
                                ALTER TABLE fleet ADD supplier VARCHAR(150) NULL`).catch((e) => console.warn('ALTER supplier:', e.message));
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN mast VARCHAR(100) NULL`).catch(() => {});
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN attachment VARCHAR(100) NULL`).catch(() => {});
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN container_mast VARCHAR(100) NULL`).catch(() => {});
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN condition VARCHAR(100) NULL`).catch(() => {});
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN customer_name VARCHAR(200) NULL`).catch(() => {});
    await pool.request().query(`ALTER TABLE fleet ALTER COLUMN remarks NVARCHAR(MAX) NULL`).catch(() => {});

    // TRUNCATE
    const before = await pool.request().query('SELECT COUNT(*) AS n FROM fleet');
    console.log('Fleet rows before:', before.recordset[0].n);
    await pool.request().query('TRUNCATE TABLE fleet');
    console.log('Truncated.');

    const all = [...diesel, ...electric];
    let count = 0;
    for (let i = 0; i < all.length; i += 50) {
      const batch = all.slice(i, i + 50);
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
            .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, name,
                    veh_no, container_mast, chassis, mast, attachment, yor, yom,
                    customer_name, condition, supplier, remarks, lta_reg,
                    release_status, updated_by, updated_at)
                    VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @name,
                    @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom,
                    @customer_name, @condition, @supplier, @remarks, @lta_reg,
                    'Release', 'SCRIPT', GETDATE())`);
          count++;
        }
        await tx.commit();
        process.stdout.write(`\rInserted ${count}/${all.length}`);
      } catch (e) {
        try { await tx.rollback(); } catch {}
        console.error('\nBatch error:', e.message);
        throw e;
      }
    }
    console.log('\nDone. Total inserted:', count);
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
