require('dotenv/config');
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const connectionString=process.env.DIRECT_URL || process.env.DATABASE_URL;
  if(!connectionString)throw new Error('Set DIRECT_URL to the Supabase session/direct connection string.');
  if(new URL(connectionString).port==='6543')throw new Error('Run migrations through the session pooler (5432) or direct connection, not transaction pooling.');
  const db=new Client({connectionString});await db.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('smartbus-migrations'))");
    await db.query('CREATE SCHEMA IF NOT EXISTS smartbus_private');
    await db.query('REVOKE ALL ON SCHEMA smartbus_private FROM PUBLIC');
    await db.query('CREATE TABLE IF NOT EXISTS smartbus_private.migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT NOW())');
    const dir=path.resolve(__dirname,'../../supabase/migrations');
    for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) {
      const sql=fs.readFileSync(path.join(dir,name),'utf8');
      const checksum=createHash('sha256').update(sql).digest('hex');
      const {rows:[existing]}=await db.query('SELECT checksum FROM smartbus_private.migrations WHERE name=$1',[name]);
      if(existing){if(existing.checksum!==checksum)throw new Error('Applied migration changed: '+name);continue;}
      await db.query(sql);
      await db.query('INSERT INTO smartbus_private.migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
      try {
        const version = name.split('_')[0];
        await db.query(
          'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [version, name.replace(/\.sql$/, '')]
        );
      } catch (_) {}
      console.log('Applied '+name);
    }
    await db.query('COMMIT');
    console.log('Verified PostgreSQL connection and committed migrations.');
  } catch(error){await db.query('ROLLBACK');throw error;}
  finally {await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
