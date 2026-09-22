import sql from 'mssql';
import { requireEnv } from '@/lib/env';

const config: sql.config = {
  server: requireEnv('MSSQL_SERVER'),
  database: requireEnv('MSSQL_DATABASE'),
  user: requireEnv('MSSQL_USER'),
  password: requireEnv('MSSQL_PASSWORD'),
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
