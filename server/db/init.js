import fs from 'fs'
import { createRequire } from 'module'
import pg from 'pg'
import 'dotenv/config'

const require = createRequire(import.meta.url)
const { Client } = pg

async function init() {
  // Сначала создаём БД если не существует (подключаемся к template1)
  const admin = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'template1',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  })
  await admin.connect()
  const dbName = process.env.DB_NAME || 'pulsehr'
  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName])
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`)
    console.log(`[DB] Database "${dbName}" created`)
  } else {
    console.log(`[DB] Database "${dbName}" already exists`)
  }
  await admin.end()

  // Применяем схему
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  })
  await db.connect()

  const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8')
  await db.query(sql)
  console.log('[DB] Schema applied')

  // Seed: тестовый HR
  const hr = await db.query(`SELECT id FROM users WHERE phone = '+79991234567'`)
  if (hr.rowCount === 0) {
    await db.query(`
      INSERT INTO users (phone, name, role, department, position)
      VALUES ('+79991234567', 'Анна Сергеева', 'hr', 'HR', 'HR-специалист')
    `)
    console.log('[DB] Test HR user created')
  }

  // Seed: тестовый сотрудник
  const emp = await db.query(`SELECT id FROM users WHERE phone = '+79992345678'`)
  if (emp.rowCount === 0) {
    await db.query(`
      INSERT INTO users (phone, name, role, department, position)
      VALUES ('+79992345678', 'Иван Петров', 'employee', 'Разработка', 'Frontend-разработчик')
    `)
    console.log('[DB] Test employee user created')
  }

  await db.end()
  console.log('[DB] Initialization complete')
}

init().catch(err => {
  console.error('[DB] Init error:', err)
  process.exit(1)
})
