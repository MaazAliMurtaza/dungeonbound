import 'dotenv/config';
import pg from 'pg';
import { databaseConfig } from './db-config.js';
const {config, schema} = databaseConfig(process.env);
export const databaseSchema = schema;
export const pool = new pg.Pool(config);
pool.on('error', error => { console.error('Idle PostgreSQL client error:', error.message); });
