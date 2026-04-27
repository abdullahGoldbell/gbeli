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

  try {
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

    // Add release_status, reservation_date, reserved_by columns to fleet if not exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'release_status')
        ALTER TABLE fleet ADD release_status VARCHAR(20) NULL DEFAULT 'Release'
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'reservation_date')
        ALTER TABLE fleet ADD reservation_date DATE NULL
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'reserved_by')
        ALTER TABLE fleet ADD reserved_by VARCHAR(100) NULL
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('fleet') AND name = 'lease_period')
        ALTER TABLE fleet ADD lease_period VARCHAR(50) NULL
    `);

    // SOLD vehicles ledger
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sold_vehicles')
      CREATE TABLE sold_vehicles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sold_date DATE NULL,
        brand VARCHAR(100) NULL,
        model VARCHAR(150) NULL,
        customer VARCHAR(200) NULL,
        veh_no VARCHAR(50) NULL,
        chassis_no VARCHAR(100) NULL,
        mast VARCHAR(50) NULL,
        attachment VARCHAR(50) NULL,
        yor INT NULL,
        yom INT NULL,
        lta_reg VARCHAR(50) NULL,
        salesman VARCHAR(100) NULL,
        remarks NVARCHAR(500) NULL,
        do_no VARCHAR(50) NULL,
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      )
    `);

    // Battery price ledger
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'battery_prices')
      CREATE TABLE battery_prices (
        id INT IDENTITY(1,1) PRIMARY KEY,
        regen_date DATE NULL,
        bat_sn VARCHAR(100) NULL,
        fl VARCHAR(50) NULL,
        model VARCHAR(150) NULL,
        supplier VARCHAR(150) NULL,
        customer VARCHAR(200) NULL,
        amt DECIMAL(10,2) NULL,
        supplier_invoice VARCHAR(100) NULL,
        warranty VARCHAR(50) NULL,
        volt VARCHAR(20) NULL,
        ah VARCHAR(20) NULL,
        socket VARCHAR(50) NULL,
        updated_at DATETIME NOT NULL DEFAULT GETDATE()
      )
    `);
  } catch (err) {
    console.warn('Bootstrap DDL failed (tables/columns may already exist):', err);
  }

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
