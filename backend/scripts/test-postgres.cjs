const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const request = require('supertest');
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';

async function main() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const dir = path.resolve(__dirname,'../../supabase/migrations');
  for (const file of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(path.join(dir,file),'utf8'));
  }
  const pool = require('../dist/config/database').dbPool;
  // PGlite is single-session. Serialize complete transactions, not their statements.
  let queue=Promise.resolve();
  const acquire=async()=>{let release;const previous=queue;queue=new Promise(r=>release=r);await previous;return release;};
  pool.query=async(sql,params)=>{const release=await acquire();try{return await db.query(sql,params);}finally{release();}};
  pool.connect=async()=>{const release=await acquire();return {query:(s,p)=>db.query(s,p),release};};
  const app=require('../dist/app').default;
  let checks=0;
  const call=async(method,url,body,token,status=200)=>{
    let r=request(app)[method](url);if(token)r=r.set('Authorization','Bearer '+token);if(body)r=r.send(body);
    const response=await r;assert.equal(response.status,status,JSON.stringify(response.body));checks++;return response.body;
  };
  try {
    await call('get','/api/health');
    const register=async(email,role)=>call('post','/api/auth/register',{full_name:'Kiểm thử',email,password:'TestPassword@123',role},null,201);
    const first=await register('passenger@example.test','ADMIN');
    assert.equal(first.data.user.role,'PASSENGER');
    const passenger=first.data.tokens.accessToken;
    const second=await register('other@example.test');const other=second.data.tokens.accessToken;
    await db.query("UPDATE users SET role='ADMIN',role_id=1 WHERE id=$1",[first.data.user.id]);
    const login=await call('post','/api/auth/login',{email:'passenger@example.test',password:'TestPassword@123'});
    const admin=login.data.tokens.accessToken;
    await call('get','/api/auth/me',null,admin);
    await call('post','/api/auth/login',{email:'passenger@example.test',password:'incorrect'},null,401);
    await call('get','/api/users',null,null,401);
    await call('get','/api/users',null,other,403);
    await call('get','/api/users',null,admin);
    const route=(await call('post','/api/routes',{code:'TEST',name:'Tuyến thử',base_price:12000},admin,201)).data.id;
    const stops=[];
    for(let n=1;n<=2;n++){
      const stop=(await call('post','/api/stops',{code:'STOP'+n,name:'Trạm '+n,address:'ICTU'},admin,201)).data.id;stops.push(stop);
      await call('post',`/api/routes/${route}/stops`,{stop_id:stop,stop_order:n,estimated_minutes:n*15},admin);
    }
    await call('post',`/api/routes/${route}/stops`,{stop_id:stops[1],stop_order:2,estimated_minutes:30},admin);
    await call('put',`/api/stops/${stops[0]}`,{name:'Trạm cập nhật',status:'ACTIVE'},admin);
    await call('patch',`/api/routes/${route}`,{name:'Tuyến cập nhật',base_price:15000},admin);
    await call('get','/api/routes');await call('get','/api/stops');
    const trip=(await call('post','/api/trips',{route_id:route,bus_plate:'20A-12345',departure_time:'2099-01-01T08:00:00+07:00',arrival_time:'2099-01-01T09:00:00+07:00',base_price:15000},admin,201)).data.id;
    for(const suffix of ['',`?route_id=${route}`,'?date=2099-01-01',`?route_id=${route}&date=2099-01-01`])assert.equal((await call('get','/api/trips'+suffix)).data.length,1);
    const search=`/api/trips/search?origin_stop_id=${stops[0]}&destination_stop_id=${stops[1]}`;
    assert.equal((await call('get',search)).data.length,1);
    assert.equal((await call('get',search+'&departure_date=2099-01-01')).data.length,1);
    assert.equal((await call('get',`/api/trips/${trip}/seats`)).data.totalSeats,40);
    await call('get','/api/seats');
    const [{bus_id}]=(await db.query('SELECT bus_id FROM trips WHERE id=$1',[trip])).rows;
    await call('get','/api/seats/bus/'+bus_id);
    await call('post',`/api/trips/${trip}/seats/lock`,{seatNumber:'A01'},null,401);
    await call('post',`/api/trips/${trip}/seats/lock`,{seatNumber:'A01'},passenger);
    await call('post',`/api/trips/${trip}/seats/unlock`,{seatNumber:'A01'},other,409);
    await call('post','/api/ticketing/bookings',{tripId:trip,seatNumber:'A01'},other,409);
    const booked=await call('post','/api/ticketing/bookings',{tripId:trip,seatNumber:'A01',userId:second.data.user.id},passenger,201);
    assert.equal((await db.query('SELECT user_id FROM tickets WHERE id=$1',[booked.ticketId])).rows[0].user_id,first.data.user.id);
    await call('post','/api/ticketing/bookings',{tripId:trip,seatNumber:'A01'},passenger,409);
    assert.equal((await call('post','/api/ticketing/verify',{code:booked.qrCode},admin)).isAlreadyCheckedIn,false);
    assert.equal((await call('post','/api/ticketing/verify',{code:booked.qrCode},admin)).isAlreadyCheckedIn,true);
    await call('post','/api/ticketing/verify',{code:booked.qrCode},other,403);
    await call('post',`/api/trips/${trip}/seats/lock`,{seatNumber:'A02'},passenger);
    await db.query("UPDATE trip_seats SET lock_expires_at=NOW()-INTERVAL '1 minute' WHERE trip_id=$1 AND seat_number='A02'",[trip]);
    await call('post','/api/ticketing/bookings',{tripId:trip,seatNumber:'A02'},other,201);
    const competing=await Promise.all([passenger,other].map(token=>request(app).post('/api/ticketing/bookings').set('Authorization','Bearer '+token).send({tripId:trip,seatNumber:'A03'})));
    assert.deepEqual(competing.map(r=>r.status).sort(),[201,409]);checks++;
    await assert.rejects(db.query("INSERT INTO tickets(id,trip_id,seat_number,status) VALUES ('duplicate',$1,'A03','BOOKED')",[trip]),e=>e.code==='23505');checks++;
    await call('post','/api/operations/incidents',{tripId:trip,description:'Traffic'},admin,201);
    await call('get','/api/operations/incidents',null,admin);
    await call('post','/api/operations/feedbacks',{tripId:trip,content:'Tốt',ratingStars:5},other,201);
    await call('get','/api/operations/feedbacks',null,admin);
    const dashboard=await call('get','/api/operations/dashboard/summary',null,admin);
    assert.equal(Number(dashboard.summary.totalRoutes),1);
    assert.equal(dashboard.tripOccupancy[0].routeCode,'TEST');
    await call('patch',`/api/users/${second.data.user.id}/discount-approval`,{status:'APPROVED'},admin);
    for(const role of ['anon','authenticated']){
      await db.exec('SET ROLE '+role);
      await assert.rejects(db.query('SELECT password_hash FROM users'),e=>e.code==='42501');
      await assert.rejects(db.query("INSERT INTO tickets(id,trip_id) VALUES ('forged','x')"),e=>e.code==='42501');
      await db.exec('RESET ROLE');checks+=2;
    }
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity")).rows[0].n,13);
    await call('delete',`/api/routes/${route}`,null,admin);
    assert.equal((await call('get','/api/routes')).data.length,0);
    console.log(`PASS: ${checks} API/database checks against embedded PostgreSQL`);
  } finally {await db.close();await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
