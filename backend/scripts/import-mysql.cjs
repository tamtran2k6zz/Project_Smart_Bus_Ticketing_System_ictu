// Copies the deployed init.sql schema. Never modifies the source database.
require('dotenv/config');
const mysql=require('mysql2/promise');
const {Client}=require('pg');
const tables=['users','routes','bus_stops','route_stops','buses','seats','fares','trips','tickets','trip_seats','incidents','feedbacks'];
async function main(){
  if(!process.env.MYSQL_SOURCE_URL || !process.env.DIRECT_URL)throw new Error('Set MYSQL_SOURCE_URL and DIRECT_URL in your local environment.');
  const sourceUrl=new URL(process.env.MYSQL_SOURCE_URL);
  const source=await mysql.createConnection({host:sourceUrl.hostname,port:Number(sourceUrl.port)||3306,user:decodeURIComponent(sourceUrl.username),password:decodeURIComponent(sourceUrl.password),database:sourceUrl.pathname.slice(1),dateStrings:true});
  const target=new Client({connectionString:process.env.DIRECT_URL});await target.connect();
  try{
    await source.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    await target.query('BEGIN');
    // MySQL DATETIME has no timezone. Override if the source used another timezone.
    await target.query("SELECT set_config('TimeZone',$1,true)",[process.env.MYSQL_SOURCE_TIMEZONE || 'Asia/Ho_Chi_Minh']);
    for(const table of tables){
      const {rows:[count]}=await target.query(`SELECT count(*)::int AS n FROM ${table}`);
      if(count.n)throw new Error('Target must be empty before import: '+table);
    }
    const [roles]=await source.query('SELECT id,name FROM roles ORDER BY id');
    if(JSON.stringify(roles.map(r=>[r.id,r.name]))!==JSON.stringify([[1,'ADMIN'],[2,'MANAGER'],[3,'DRIVER'],[4,'PASSENGER']]))throw new Error('Source roles differ from the deployed schema; review mapping before import.');
    const [sourceTables]=await source.query('SHOW TABLES');
    const extra=sourceTables.map(r=>Object.values(r)[0]).filter(t=>!tables.includes(t)&&t!=='roles');
    if(extra.length)throw new Error('Unmapped source tables require review: '+extra.join(', '));
    for(const table of tables){
      const [rows]=await source.query(`SELECT * FROM \`${table}\``);
      const {rows:columns}=await target.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[table]);
      const columnMap=new Map(columns.map(c=>[c.column_name,c.data_type]));
      for(const row of rows){
        const values={};
        for(const [key,value] of Object.entries(row)){
          if(table==='route_stops' && key==='estimated_minutes'){values.estimated_time_minutes=value;continue;}
          const name=key==='fareType'?'fare_type':key;
          if(!columnMap.has(name))throw new Error(`Unmapped source column: ${table}.${key}`);
          values[name]=value===null?null:columnMap.get(name)==='boolean'?Boolean(value):columnMap.get(name)==='text'?String(value):value;
        }
        const names=Object.keys(values);
        await target.query(`INSERT INTO ${table} (${names.map(n=>'"'+n+'"').join(',')}) VALUES (${names.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(values));
      }
      const {rows:[count]}=await target.query(`SELECT count(*)::int AS n FROM ${table}`);
      if(count.n!==rows.length)throw new Error('Row count mismatch: '+table);
      console.log(`${table}: verified ${rows.length} rows`);
    }
    await target.query('COMMIT');await source.query('COMMIT');
    console.log('Import committed. IDs and bcrypt hashes preserved.');
  }catch(error){await target.query('ROLLBACK');await source.query('ROLLBACK');throw error;}
  finally{await source.end();await target.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
