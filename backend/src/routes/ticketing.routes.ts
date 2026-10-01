import { Router, Response } from 'express';
import { query, transaction } from '../config/database';
import { getSeatsByTrip } from '../controllers/seats.controller';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';
import { authorizeRoles } from '../middlewares/rbac';
import { bookSeat, BookingError } from '../services/booking';
const router=Router();
router.get('/trips/:tripId/seats',getSeatsByTrip);
router.post('/bookings',authenticateJWT,async(req:AuthenticatedRequest,res:Response):Promise<void>=>{
  try {
    const {tripId,seatNumber}=req.body;
    if(!tripId || !seatNumber){res.status(400).json({success:false,message:'Vui lòng chọn chuyến xe và ghế.'});return;}
    const t=await bookSeat(String(tripId),seatNumber,req.user!.id);
    const qrCode='SMARTBUS-QR-'+t.ticket_code;
    const ticket={id:t.id,ticketCode:t.ticket_code,seatNumber:t.seat_number,fareAmount:Number(t.fare_amount),price:Number(t.fare_amount),status:t.status};
    const data={ticket,qrCode,qrCodeUrl:'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='+encodeURIComponent(qrCode),
      ticketId:t.id,ticketCode:t.ticket_code,seatNumber:t.seat_number,fareAmount:Number(t.fare_amount),status:t.status};
    res.status(201).json({success:true,message:'Đặt vé thành công!',data,...data});
  }catch(err:any){res.status(err.status || (err.code==='23505'?409:500)).json({success:false,message:err.status?err.message:'Không thể đặt ghế. Vui lòng thử lại.'});}
});
router.post('/verify',authenticateJWT,authorizeRoles('ADMIN','MANAGER','DRIVER'),async(req:AuthenticatedRequest,res:Response):Promise<void>=>{
  try {
    if(typeof req.body.code !== 'string' || !req.body.code.trim()){res.status(400).json({success:false,message:'Vui lòng cung cấp mã vé.'});return;}
    const code=req.body.code.trim().replace(/^SMARTBUS-QR-/, '');
    const result=await transaction(async client=>{
      const {rows:[ticket]}=await client.query(        'SELECT t.*,u.full_name,u.email,r.name AS route_name,r.code AS route_code FROM tickets t LEFT JOIN users u ON u.id=t.user_id JOIN trips tr ON tr.id=t.trip_id JOIN routes r ON r.id=tr.route_id WHERE t.ticket_code=$1 OR t.id=$1 FOR UPDATE OF t',[code]);
      if(!ticket)throw new BookingError(404,'Không tìm thấy vé.');
      if(!['BOOKED','CHECKED_IN'].includes(ticket.status))throw new BookingError(409,'Vé không còn hiệu lực.');
      const isAlreadyCheckedIn=ticket.status==='CHECKED_IN';
      if(!isAlreadyCheckedIn){
        await client.query("UPDATE tickets SET status='CHECKED_IN' WHERE id=$1",[ticket.id]);
        await client.query("UPDATE trip_seats SET status='CHECKED_IN' WHERE ticket_id=$1",[ticket.id]);
      }
      return {isAlreadyCheckedIn,ticket:{id:ticket.id,ticketCode:ticket.ticket_code,seatNumber:ticket.seat_number,
        fareAmount:Number(ticket.fare_amount),status:'CHECKED_IN',user:{fullName:ticket.full_name,email:ticket.email},
        trip:{route:{name:ticket.route_name,code:ticket.route_code}}}};
    });
    res.json({success:true,message:result.isAlreadyCheckedIn?'Vé này đã được quét trước đó!':'Soát vé thành công!',...result});
  }catch(err:any){res.status(err.status||500).json({success:false,message:err.status?err.message:'Không thể soát vé.'});}
});
export default router;
