const XLSX = require('xlsx');
const sql = require('mssql');

const EXCEL_PATH = process.argv[2] || '/Users/eliyazar/Downloads/Copy of FMS List.xlsx';

const config = {
  server: 'GBITR01V.goldbell.com.sg',
  database: 'FMS',
  user: 'ReadUser',
  password: 'G0ldBell123',
  port: 1433,
  options: { encrypt: false, trustServerCertificate: true },
};

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1000) return null;
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function cleanVal(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return val === 0 ? null : String(val);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' || trimmed === '0' ? null : trimmed;
  }
  return String(val);
}

function parseBit(val) {
  if (val === 1 || val === '1' || val === true) return 1;
  return 0;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '' || val === 0 || val === '0') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

async function importSheet(pool, sheetData, fleetType, headers) {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    // Skip header rows and section label rows (rows without VEH NO)
    const vehNoIdx = headers.indexOf('VEH NO');
    const vehNo = row[vehNoIdx];
    if (!vehNo || typeof vehNo !== 'string' || !vehNo.startsWith('FL')) {
      skipped++;
      continue;
    }

    try {
      const get = (header) => {
        const idx = headers.indexOf(header);
        return idx >= 0 ? row[idx] : null;
      };

      const category = fleetType === 'ELECTRICAL'
        ? cleanVal(get('Type'))
        : cleanVal(get('MODEL'));

      await pool.request()
        .input('fleet_type', sql.VarChar, fleetType)
        .input('category', sql.VarChar, category)
        .input('in_out_date', sql.Date, excelDateToISO(get('IN/OUT DATE')))
        .input('brand', sql.VarChar, cleanVal(get('BRAND')))
        .input('model', sql.VarChar, cleanVal(fleetType === 'ELECTRICAL' ? get('MODEL') : get('MODEL')))
        .input('model2', sql.VarChar, cleanVal(get('MODEL2')))
        .input('replace_ref', sql.VarChar, cleanVal(get('REPLACE')))
        .input('veh_no', sql.VarChar, vehNo.trim())
        .input('container_mast', sql.VarChar, cleanVal(fleetType === 'ELECTRICAL' ? get('C.MAST') : null))
        .input('chassis', sql.VarChar, cleanVal(get('CHASSIS')))
        .input('mast', sql.VarChar, cleanVal(get('MAST')))
        .input('attachment', sql.VarChar, cleanVal(get('ATT')))
        .input('yor', sql.Int, parseNumber(get('YOR')))
        .input('yom', sql.Int, parseNumber(get('YOM')))
        .input('battery', sql.VarChar, cleanVal(get('BATTERY')))
        .input('lta_reg', sql.VarChar, cleanVal(get('LTA REG')))
        .input('customer_name', sql.VarChar, cleanVal(get('Customer Name')))
        .input('rental', sql.Bit, parseBit(get('Rental')))
        .input('sales', sql.Bit, parseBit(get('Sales')))
        .input('scrap', sql.Bit, parseBit(get('Scrap')))
        .input('repair_cost', sql.Decimal(10, 2), parseNumber(get('Repair Cost')))
        .input('condition', sql.VarChar, cleanVal(get('Condition')))
        .input('remarks', sql.NVarChar, cleanVal(get('Remarks')))
        .input('customer_requirements', sql.NVarChar, cleanVal(get('Customer Requirements')))
        .input('location', sql.VarChar, cleanVal(get('Location')))
        .input('postal_code', sql.VarChar, cleanVal(get('Postal Code')))
        .input('volts', sql.VarChar, cleanVal(get('Volts')) || cleanVal(get('Volts (Hidden)')))
        .input('equipment_type', sql.VarChar, cleanVal(get('Type')))
        .input('serviceable', sql.VarChar, cleanVal(get('Serviceable?')))
        .input('updated_by', sql.VarChar, 'IMPORT')
        .query(`INSERT INTO fleet (fleet_type, category, in_out_date, brand, model, model2, replace_ref,
          veh_no, container_mast, chassis, mast, attachment, yor, yom, battery, lta_reg,
          customer_name, rental, sales, scrap, repair_cost, condition, remarks,
          customer_requirements, location, postal_code, volts, equipment_type, serviceable, updated_by)
          VALUES (@fleet_type, @category, @in_out_date, @brand, @model, @model2, @replace_ref,
          @veh_no, @container_mast, @chassis, @mast, @attachment, @yor, @yom, @battery, @lta_reg,
          @customer_name, @rental, @sales, @scrap, @repair_cost, @condition, @remarks,
          @customer_requirements, @location, @postal_code, @volts, @equipment_type, @serviceable, @updated_by)`);

      imported++;
    } catch (err) {
      console.error(`  Error importing row ${i} (${vehNo}):`, err.message);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function main() {
  console.log(`Reading Excel file: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH);
  console.log('Sheets found:', wb.SheetNames);

  const pool = await sql.connect(config);
  console.log('Connected to MSSQL');

  // Clear existing data
  await pool.request().query('DELETE FROM fleet');
  console.log('Cleared existing fleet data');

  // Import ELECTRICAL sheet
  const elecSheet = wb.Sheets['ELECTRICAL'];
  const elecData = XLSX.utils.sheet_to_json(elecSheet, { header: 1 });
  const elecHeaders = elecData[0];
  console.log('\nELECTRICAL headers:', elecHeaders);
  const elecResult = await importSheet(pool, elecData.slice(1), 'ELECTRICAL', elecHeaders);
  console.log(`ELECTRICAL: ${elecResult.imported} imported, ${elecResult.skipped} skipped`);

  // Import Diesel sheet
  const dieselSheet = wb.Sheets['Diesel'] || wb.Sheets['Diesel '];
  const dieselData = XLSX.utils.sheet_to_json(dieselSheet, { header: 1 });
  const dieselHeaders = dieselData[0];
  console.log('\nDiesel headers:', dieselHeaders);
  const dieselResult = await importSheet(pool, dieselData.slice(1), 'DIESEL', dieselHeaders);
  console.log(`DIESEL: ${dieselResult.imported} imported, ${dieselResult.skipped} skipped`);

  // Summary
  const total = await pool.request().query('SELECT COUNT(*) as count FROM fleet');
  console.log(`\nTotal records in database: ${total.recordset[0].count}`);

  await pool.close();
  console.log('Done!');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
