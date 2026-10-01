import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes';
import routesRoutes from './routes/routes.routes';
import stopsRoutes from './routes/stops.routes';
import tripsRoutes from './routes/trips.routes';
import operationsRoutes from './routes/operations.routes';
import ticketingRoutes from './routes/ticketing.routes';
import seatsRoutes from './routes/seats.routes';
import usersRoutes from './routes/users.routes';
import { query } from './config/database';
import { getJwtSecret } from './config/auth';

getJwtSecret();
const app=express();
app.disable('x-powered-by');
app.use(cors({origin:process.env.CORS_ORIGIN?.split(',') || false}));
app.use(express.json({limit:'100kb'}));
app.get('/api/health',async(_req,res)=>{
  try {const [row]=await query<any[]>('SELECT NOW() AS db_time');res.json({status:'UP',database:'CONNECTED_POSTGRESQL',dbTime:row.db_time});}
  catch {res.status(503).json({status:'DOWN',database:'DISCONNECTED'});}
});
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/v1/routes', routesRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/v1/stops', stopsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/seats', seatsRoutes);
app.use('/api/v1/seats', seatsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/v1/operations', operationsRoutes);
app.use('/api/ticketing', ticketingRoutes);
app.use('/api/v1/ticketing', ticketingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/v1/users', usersRoutes);


app.use((_req,res)=>{res.status(404).json({success:false,message:'API endpoint not found'});});
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  console.error(err);
  res.status(err.status || 500).json({success:false,message:err.status===400?'Invalid JSON':'Internal server error'});
});
export default app;
