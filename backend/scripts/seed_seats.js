// PostgreSQL seat initialization for the deployed Express API.
require('dotenv/config');
const {dbPool,transaction}=require('../dist/config/database');
const {prepareSeats}=require('../dist/services/booking');
async function main(){
  const {rows}=await dbPool.query('SELECT id FROM trips');
  for(const trip of rows)await transaction(client=>prepareSeats(client,trip.id));
  console.log('Seat maps initialized for '+rows.length+' trips.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>dbPool.end());
