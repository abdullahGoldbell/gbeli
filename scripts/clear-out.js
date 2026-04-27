const sql = require('mssql');
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

(async () => {
  try {
    const pool = await sql.connect(config);
    const before = await pool.request().query("SELECT COUNT(*) AS n FROM fleet WHERE release_status = 'OUT'");
    console.log('OUT rows before:', before.recordset[0].n);
    const result = await pool.request().query("DELETE FROM fleet WHERE release_status = 'OUT'");
    console.log('Deleted rows:', result.rowsAffected[0]);
    const after = await pool.request().query("SELECT COUNT(*) AS n FROM fleet WHERE release_status = 'OUT'");
    console.log('OUT rows after:', after.recordset[0].n);
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
