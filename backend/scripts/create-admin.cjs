require('dotenv/config');
const {Client}=require('pg');
const bcrypt=require('bcrypt');
async function main(){
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD;
  if(!email || !password || password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
  const connectionString=process.env.DIRECT_URL || process.env.DATABASE_URL;
  const db=new Client({
    connectionString,
    ssl: connectionString && connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
  });await db.connect();
  try{
    await db.query("INSERT INTO users(full_name,email,password_hash,role_id,role) VALUES($1,$2,$3,1,'ADMIN')",[process.env.ADMIN_NAME || 'Administrator',email,await bcrypt.hash(password,12)]);
    console.log('Administrator created. Remove ADMIN_PASSWORD from the environment.');
  }finally{await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
