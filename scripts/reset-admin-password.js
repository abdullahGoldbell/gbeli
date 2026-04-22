/* eslint-disable */
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const sql = require('mssql');
const bcrypt = require('bcryptjs');

(async () => {
  const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('Usage: node scripts/reset-admin-password.js <username> <password>');
    process.exit(1);
  }

  const pool = await sql.connect({
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: { encrypt: true, trustServerCertificate: true },
  });

  const hash = await bcrypt.hash(password, 10);
  const res = await pool.request()
    .input('username', sql.VarChar, username)
    .input('hash', sql.VarChar, hash)
    .query('UPDATE users SET password_hash = @hash, updated_at = GETDATE() WHERE username = @username');

  console.log(`Rows affected: ${res.rowsAffected[0]} (user: ${username})`);
  await pool.close();
})().catch((e) => { console.error(e); process.exit(1); });
