import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, databaseSchema } from '../src/db.js';
const schema = await readFile(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // databaseSchema is strictly validated before interpolation.
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${databaseSchema}"`);
  if (databaseSchema !== 'public') await client.query(`REVOKE ALL ON SCHEMA "${databaseSchema}" FROM PUBLIC`);
  await client.query(`SET LOCAL search_path TO "${databaseSchema}"`);
  await client.query(schema);
  await client.query('COMMIT');
  console.log('Dungeonbound tables ready.');
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
