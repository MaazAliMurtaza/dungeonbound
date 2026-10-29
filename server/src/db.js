import 'dotenv/config';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 15000, connectionTimeoutMillis: 10000 });
pool.on('error', error => { console.error('Idle PostgreSQL client error:', error.message); });
