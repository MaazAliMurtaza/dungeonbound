import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
const schema = await readFile(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
try { await pool.query(schema); console.log('Dungeonbound tables ready.'); }
finally { await pool.end(); }
