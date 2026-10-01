import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { query } from '../config/database';

// 1. Tra cứu chuyến xe theo điểm đi, điểm đến và ngày khởi hành (US 01)
// Sử dụng thuật toán so khớp stop_order qua SQL JOIN trực tiếp
export const searchTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin_stop_id, destination_stop_id, departure_date } = req.query;

    if (!origin_stop_id || !destination_stop_id) {
      res.status(400).json({ statusCode: 400, success: false, message: 'origin_stop_id và destination_stop_id là bắt buộc để tra cứu tuyến xe!' });
      return;
    }

    if (String(origin_stop_id) === String(destination_stop_id)) {
      res.status(400).json({ statusCode: 400, success: false, message: 'Điểm khởi hành và điểm đến không được trùng nhau!' });
      return;
    }

    let sql = `
      SELECT t.id AS trip_id, t.route_id, COALESCE(b.plate_number, 'N/A') AS bus_plate,
        t.departure_time, t.arrival_time, COALESCE(b.total_seats, 40) AS total_seats,
        (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND tk.status IN ('BOOKED', 'CHECKED_IN')) AS booked_seats,
        (COALESCE(b.total_seats, 40) - (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND tk.status IN ('BOOKED', 'CHECKED_IN'))) AS available_seats,
        t.status AS trip_status, r.code AS route_code, r.name AS route_name,
        COALESCE(t.base_price, 10000) AS base_price, origin_s.id AS origin_stop_id,
        origin_s.name AS origin_stop_name, origin_s.address AS origin_stop_address,
        origin_rs.stop_order AS origin_stop_order, origin_rs.estimated_time_minutes AS origin_estimated_minutes,
        dest_s.id AS dest_stop_id, dest_s.name AS dest_stop_name, dest_s.address AS dest_stop_address,
        dest_rs.stop_order AS dest_stop_order, dest_rs.estimated_time_minutes AS dest_estimated_minutes,
        (dest_rs.estimated_time_minutes - origin_rs.estimated_time_minutes) AS estimated_duration_minutes,
        GREATEST(ROUND(COALESCE(t.base_price, 10000) * (dest_rs.stop_order - origin_rs.stop_order) / 2, -3), 7000) AS calculated_fare
      FROM trips t JOIN routes r ON t.route_id = r.id LEFT JOIN buses b ON t.bus_id = b.id
      JOIN route_stops origin_rs ON origin_rs.route_id = r.id AND origin_rs.stop_id = $1
      JOIN route_stops dest_rs ON dest_rs.route_id = r.id AND dest_rs.stop_id = $2
      JOIN bus_stops origin_s ON origin_rs.stop_id = origin_s.id JOIN bus_stops dest_s ON dest_rs.stop_id = dest_s.id
      WHERE origin_rs.stop_order < dest_rs.stop_order AND r.status = 'ACTIVE'
    `;
    const params: any[] = [origin_stop_id, destination_stop_id];

    if (departure_date) {
      sql += ` AND (t.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $${params.length + 1}::date`;
      params.push(departure_date);
    } else {
      sql += ' AND t.departure_time >= NOW()';
    }
    sql += ' ORDER BY t.departure_time ASC';

    const results = await query<any[]>(sql, params);
    const trips = results.map((row) => ({
      tripId: row.trip_id, routeId: row.route_id, routeCode: row.route_code, routeName: row.route_name,
      busPlate: row.bus_plate, departureTime: row.departure_time, arrivalTime: row.arrival_time,
      totalSeats: row.total_seats, bookedSeats: row.booked_seats, availableSeats: Math.max(0, row.available_seats),
      status: row.trip_status,
      origin: { id: row.origin_stop_id, name: row.origin_stop_name, address: row.origin_stop_address, order: row.origin_stop_order },
      destination: { id: row.dest_stop_id, name: row.dest_stop_name, address: row.dest_stop_address, order: row.dest_stop_order },
      durationMinutes: row.estimated_duration_minutes > 0 ? row.estimated_duration_minutes : 30,
      fare: Number(row.calculated_fare),
    }));

    res.status(200).json({ statusCode: 200, success: true, total: trips.length, data: trips });
  } catch (err: any) {
    console.error('Lỗi API searchTrips:', err);
    res.status(500).json({ statusCode: 500, success: false, message: `Lỗi tra cứu chuyến xe: ${err.message}` });
  }
};

// 2. Lấy danh sách tất cả các chuyến xe
export const getTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id, date } = req.query;
    let sql = `SELECT t.id, t.route_id, COALESCE(b.plate_number, 'N/A') AS bus_plate, t.driver_id, t.departure_time, t.arrival_time,
      COALESCE(b.total_seats, 40) AS total_seats, (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND tk.status IN ('BOOKED', 'CHECKED_IN')) AS booked_seats,
      (COALESCE(b.total_seats, 40) - (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND tk.status IN ('BOOKED', 'CHECKED_IN'))) AS available_seats,
      t.status, t.created_at, r.code AS route_code, r.name AS route_name, COALESCE(t.base_price, 10000) AS base_price, u.full_name AS driver_name
      FROM trips t JOIN routes r ON t.route_id = r.id LEFT JOIN buses b ON t.bus_id = b.id LEFT JOIN users u ON t.driver_id = u.id WHERE 1=1`;
    const params: any[] = [];
    if (route_id) { sql += ` AND t.route_id = $${params.length + 1}`; params.push(route_id); }
    if (date) { sql += ` AND (t.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $${params.length + 1}::date`; params.push(date); }
    sql += ' ORDER BY t.departure_time DESC LIMIT 100';

    const trips = await query<any[]>(sql, params);
    res.status(200).json({
      statusCode: 200, success: true,
      data: trips.map((t) => ({ id: t.id, routeId: t.route_id, routeCode: t.route_code, routeName: t.route_name,
        basePrice: Number(t.base_price), busPlate: t.bus_plate, driverId: t.driver_id, driverName: t.driver_name,
        departureTime: t.departure_time, arrivalTime: t.arrival_time, totalSeats: t.total_seats, bookedSeats: t.booked_seats,
        availableSeats: t.available_seats, status: t.status, createdAt: t.created_at })),
    });
  } catch (err: any) {
    console.error('Lỗi API getTrips:', err);
    res.status(500).json({ statusCode: 500, success: false, message: `Lỗi truy vấn CSDL: ${err.message}` });
  }
};

// 3. Thêm mới chuyến xe (Admin, Manager)
export const createTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id, bus_plate, driver_id = null, departure_time, arrival_time, total_seats = 40, base_price = 10000, status = 'SCHEDULED' } = req.body;
    if (!route_id || !bus_plate || !departure_time || !arrival_time) {
      res.status(400).json({ statusCode: 400, success: false, message: 'route_id, bus_plate, departure_time, arrival_time là các trường bắt buộc!' });
      return;
    }

    let busId = req.body.bus_id;
    if (!busId && bus_plate) {
      const busRows = await query<any[]>('SELECT id FROM buses WHERE plate_number = $1 LIMIT 1', [bus_plate.trim().toUpperCase()]);
      if (busRows.length > 0) {
        busId = busRows[0].id;
      } else {
        busId = randomUUID();
        await query(
          'INSERT INTO buses (id, plate_number, bus_type, total_seats, standing_capacity, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [busId, bus_plate.trim().toUpperCase(), 'STANDARD', total_seats || 40, 15, 'READY']
        );
      }
    }

    const tripId = randomUUID();
    await query(
      `INSERT INTO trips (id, route_id, bus_id, driver_id, departure_time, arrival_time, base_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tripId, route_id, busId, driver_id, departure_time, arrival_time, base_price, status]
    );

    res.status(201).json({ statusCode: 201, success: true, message: 'Tạo chuyến xe thành công trong CSDL PostgreSQL!', data: {
      id: tripId, routeId: route_id, busPlate: bus_plate, departureTime: departure_time, arrivalTime: arrival_time, totalSeats: total_seats, status,
    }});
  } catch (err: any) {
    console.error('Lỗi API createTrip:', err);
    res.status(500).json({ statusCode: 500, success: false, message: `Lỗi tạo chuyến xe: ${err.message}` });
  }
};
