import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseConfig} from '../src/db-config.js';
test('local development preserves the existing public schema without requiring TLS',()=>{
 const {schema,config}=databaseConfig({DATABASE_URL:'postgresql://local:example@127.0.0.1:5433/db'});
 assert.equal(schema,'public');assert.equal(config.ssl,undefined);
});
test('hosted database connections enforce TLS verification and a private schema',()=>{
 const {schema,config}=databaseConfig({NODE_ENV:'production',DATABASE_URL:'postgresql://postgres.example:example@aws-0.example.pooler.supabase.com:5432/postgres?sslmode=disable&options=unsafe',DATABASE_CA_CERT:'certificate\\nsecond-line'});
 assert.equal(schema,'dungeonbound');assert.equal(config.options,'-c search_path=dungeonbound');
 assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.ca,'certificate\nsecond-line');
 assert.equal(new URL(config.connectionString).searchParams.has('sslmode'),false);
 assert.equal(new URL(config.connectionString).searchParams.has('options'),false);
});
test('schema configuration rejects SQL injection and unsupported database protocols',()=>{
 for(const DATABASE_SCHEMA of ['public;DROP TABLE users','BadCase','a b','"public"'])
  assert.throws(()=>databaseConfig({DATABASE_URL:'postgresql://localhost/db',DATABASE_SCHEMA}));
 assert.throws(()=>databaseConfig({DATABASE_URL:'https://localhost/db'}));
});
