import sql from 'mssql';

const config: sql.config = {
  server: process.env.MSSQL_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.MSSQL_DATABASE || 'FMS',
  user: process.env.MSSQL_USER || 'ReadUser',
  password: process.env.MSSQL_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export { sql };
