import app from './app';
import pool from './config/database';
const port=Number(process.env.PORT || 5000);
const server=app.listen(port,'0.0.0.0',()=>console.log('SmartBus PostgreSQL API listening on port '+port));
process.on('SIGTERM',()=>server.close(()=>{void pool.end();}));
