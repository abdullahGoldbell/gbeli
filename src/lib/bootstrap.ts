import { getPool, sql } from './db';
import bcrypt from 'bcryptjs';

let bootstrapPromise: Promise<void> | null = null;

export function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = doBootstrap();
  }
  return bootstrapPromise;
}

async function doBootstrap(): Promise<void> {
  const pool = await getPool();

  // Create users table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
    CREATE TABLE users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(200) NULL,
      is_admin BIT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME NOT NULL DEFAULT GETDATE()
    )
  `);

  // Create user_hidden_columns table if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_hidden_columns')
    CREATE TABLE user_hidden_columns (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      column_key VARCHAR(50) NOT NULL,
      CONSTRAINT UQ_user_column UNIQUE (user_id, column_key)
    )
  `);

  // Seed admin user from env vars
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not set — skipping admin bootstrap');
    return;
  }

  const existing = await pool.request()
    .input('username', sql.VarChar, adminUsername)
    .query('SELECT id FROM users WHERE username = @username');

  if (existing.recordset.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.request()
      .input('username', sql.VarChar, adminUsername)
      .input('password_hash', sql.VarChar, hash)
      .input('display_name', sql.VarChar, 'Administrator')
      .input('is_admin', sql.Bit, true)
      .query(`
        INSERT INTO users (username, password_hash, display_name, is_admin)
        VALUES (@username, @password_hash, @display_name, @is_admin)
      `);
    console.log(`Admin user "${adminUsername}" created`);
  }
}
