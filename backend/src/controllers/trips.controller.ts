import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { query } from '../config/database';
import { appLogger } from '../config/logger';
import { getTripLocation, calculateHaversineDistance } from '../services/gps.service';

const logger = appLogger.child('trips');
const occupiedTicketCondition = `tk.status IN ('BOOKED', 'CHECKED_IN')
  OR (tk.status = 'RESERVED' AND tk.reservation_expires_at > NOW())`;

// 1. Tra cứu chuyến xe theo điểm đi, điểm đến và ngày khởi hành (US 01)
// Sử dụng thuật toán so khớp stop_order qua SQL JOIN trực tiếp
export const searchTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin_stop_id, destination_stop_id, departure_date } = req.query;

    if (!origin_stop_id || !destination_stop_id) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'origin_stop_id và destination_stop_id là bắt buộc để tra cứu tuyến xe!',
      });
      return;
    }

    if (String(origin_stop_id) === String(destination_stop_id)) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Điểm khởi hành và điểm đến không được trùng nhau!',
      });
      return;
    }

    let sql = `
      SELECT t.id AS trip_id, t.route_id, COALESCE(b.plate_number, 'N/A') AS bus_plate,
        t.departure_time, t.arrival_time, COALESCE(b.total_seats, 40) AS total_seats,
        (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND (${occupiedTicketCondition})) AS booked_seats,
        (COALESCE(b.total_seats, 40) - (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND (${occupiedTicketCondition}))) AS available_seats,
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
      WHERE r.status = 'ACTIVE'
        AND origin_rs.stop_order < dest_rs.stop_order
        AND t.status = 'SCHEDULED'
        AND t.departure_time >= NOW()
    `;
    const params: any[] = [origin_stop_id, destination_stop_id];

    if (departure_date) {
      sql += ` AND (t.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $${params.length + 1}::date`;
      params.push(departure_date);
    }
    sql += ' ORDER BY t.departure_time ASC';

    const results = await query<any[]>(sql, params);
    const trips = results.map(row => ({
      tripId: row.trip_id,
      routeId: row.route_id,
      routeCode: row.route_code,
      routeName: row.route_name,
      busPlate: row.bus_plate,
      departureTime: row.departure_time,
      arrivalTime: row.arrival_time,
      totalSeats: row.total_seats,
      bookedSeats: row.booked_seats,
      availableSeats: Math.max(0, row.available_seats),
      status: row.trip_status,
      origin: {
        id: row.origin_stop_id,
        name: row.origin_stop_name,
        address: row.origin_stop_address,
        order: row.origin_stop_order,
      },
      destination: {
        id: row.dest_stop_id,
        name: row.dest_stop_name,
        address: row.dest_stop_address,
        order: row.dest_stop_order,
      },
      durationMinutes: row.estimated_duration_minutes > 0 ? row.estimated_duration_minutes : 30,
      fare: Number(row.calculated_fare),
    }));

    res.status(200).json({ statusCode: 200, success: true, total: trips.length, data: trips });
  } catch (err: any) {
    logger.error('trip_search_failed', {
      table: 'trips/routes/route_stops/bus_stops',
      operation: 'select',
      error: err,
    });
    res
      .status(500)
      .json({ statusCode: 500, success: false, message: `Lỗi tra cứu chuyến xe: ${err.message}` });
  }
};

// 2. Lấy danh sách tất cả các chuyến xe
export const getTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id, date, bookable } = req.query;
    let sql = `SELECT t.id, t.route_id, COALESCE(b.plate_number, 'N/A') AS bus_plate, t.driver_id, t.departure_time, t.arrival_time,
      COALESCE(b.total_seats, 40) AS total_seats, (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND (${occupiedTicketCondition})) AS booked_seats,
      (COALESCE(b.total_seats, 40) - (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = t.id AND (${occupiedTicketCondition}))) AS available_seats,
      t.status, t.created_at, r.code AS route_code, r.name AS route_name, COALESCE(t.base_price, 10000) AS base_price, u.full_name AS driver_name
      FROM trips t JOIN routes r ON t.route_id = r.id LEFT JOIN buses b ON t.bus_id = b.id LEFT JOIN users u ON t.driver_id = u.id WHERE 1=1`;
    const params: any[] = [];
    if (route_id) {
      sql += ` AND t.route_id = $${params.length + 1}`;
      params.push(route_id);
    }
    if (date) {
      sql += ` AND (t.departure_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $${params.length + 1}::date`;
      params.push(date);
    }
    if (bookable === 'true')
      sql +=
        " AND t.status = 'SCHEDULED' AND r.status = 'ACTIVE' AND t.departure_time >= NOW() - INTERVAL '24 hours'";
    sql += ` ORDER BY t.departure_time ${bookable === 'true' ? 'ASC' : 'DESC'} LIMIT 100`;

    const trips = await query<any[]>(sql, params);
    res.status(200).json({
      statusCode: 200,
      success: true,
      data: trips.map(t => ({
        id: t.id,
        routeId: t.route_id,
        routeCode: t.route_code,
        routeName: t.route_name,
        basePrice: Number(t.base_price),
        busPlate: t.bus_plate,
        driverId: t.driver_id,
        driverName: t.driver_name,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        totalSeats: t.total_seats,
        bookedSeats: t.booked_seats,
        availableSeats: t.available_seats,
        status: t.status,
        createdAt: t.created_at,
      })),
    });
  } catch (err: any) {
    logger.error('trips_list_failed', { table: 'trips', operation: 'select', error: err });
    res
      .status(500)
      .json({ statusCode: 500, success: false, message: `Lỗi truy vấn CSDL: ${err.message}` });
  }
};

// 3. Thêm mới chuyến xe (Admin, Manager)
export const createTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      route_id,
      bus_plate,
      driver_id = null,
      departure_time,
      arrival_time,
      total_seats = 40,
      base_price = 10000,
      status = 'SCHEDULED',
    } = req.body;
    if (!route_id || !bus_plate || !departure_time || !arrival_time) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'route_id, bus_plate, departure_time, arrival_time là các trường bắt buộc!',
      });
      return;
    }

    let busId = req.body.bus_id;
    if (!busId && bus_plate) {
      const busRows = await query<any[]>('SELECT id FROM buses WHERE plate_number = $1 LIMIT 1', [
        bus_plate.trim().toUpperCase(),
      ]);
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

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: 'Tạo chuyến xe thành công trong CSDL PostgreSQL!',
      data: {
        id: tripId,
        routeId: route_id,
        busPlate: bus_plate,
        departureTime: departure_time,
        arrivalTime: arrival_time,
        totalSeats: total_seats,
        status,
      },
    });
  } catch (err: any) {
    logger.error('trip_create_failed', {
      table: 'trips',
      operation: 'insert',
      route_id: String(req.body?.routeId ?? ''),
      error: err,
    });
    res
      .status(500)
      .json({ statusCode: 500, success: false, message: `Lỗi tạo chuyến xe: ${err.message}` });
  }
};

// 4. Lấy vị trí GPS và thông tin thời gian thực của chuyến xe (Tracking / Realtime GPS)
export const getTripLocationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    if (!tripId) {
      res.status(400).json({ statusCode: 400, success: false, message: 'tripId là bắt buộc' });
      return;
    }

    // 1. Kiểm tra vị trí GPS thực tế được tài xế cập nhật qua WebSocket / Redis
    const realLocation = await getTripLocation(tripId);

    // 2. Truy vấn thông tin chuyến xe và lộ trình
    const tripRows = await query<any[]>(
      `SELECT t.id, t.route_id, t.departure_time, t.arrival_time, t.status,
              r.name as route_name, r.code as route_code
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       WHERE t.id = $1 LIMIT 1`,
      [tripId]
    );

    if (tripRows.length === 0) {
      res.status(404).json({ statusCode: 404, success: false, message: 'Không tìm thấy chuyến xe' });
      return;
    }

    const trip = tripRows[0];

    // 3. Truy vấn danh sách trạm dừng theo thứ tự của tuyến
    const stopsRows = await query<any[]>(
      `SELECT bs.id, bs.name, bs.latitude, bs.longitude, rs.stop_order, rs.estimated_time_minutes
       FROM route_stops rs
       JOIN bus_stops bs ON rs.stop_id = bs.id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order ASC`,
      [trip.route_id]
    );

    // Bảng tọa độ dự phòng theo địa danh Việt Nam
    const fallbackCoords: Record<string, [number, number]> = {
      'thái nguyên': [21.58245, 105.83615],
      'bắc kạn': [22.14682, 105.83471],
      'lạng sơn': [21.84903, 106.75704],
      'công nghệ thông tin': [21.58520, 105.80750],
      'ictu': [21.58520, 105.80750],
      'gang thép': [21.53670, 105.85940],
      'bắc giang': [21.27310, 106.19460],
      'mỹ đình': [21.02851, 105.77832],
      'cầu giấy': [21.02981, 105.80164],
      'kim mã': [21.03152, 105.81981],
      'long biên': [21.04223, 105.85052],
      'nội bài': [21.21871, 105.80422],
    };

    const validStops = stopsRows.map(s => {
      let lat = s.latitude ? Number(s.latitude) : 0;
      let lng = s.longitude ? Number(s.longitude) : 0;
      if (!lat || !lng) {
        const lower = (s.name || '').toLowerCase();
        for (const [k, v] of Object.entries(fallbackCoords)) {
          if (lower.includes(k)) {
            lat = v[0];
            lng = v[1];
            break;
          }
        }
        if (!lat || !lng) {
          lat = 21.58245;
          lng = 105.83615;
        }
      }
      return {
        id: s.id,
        name: s.name,
        lat,
        lng,
        stop_order: s.stop_order,
      };
    });

    let currentLat = 21.58245;
    let currentLng = 105.83615;
    let nextStop = validStops[0]?.name || 'Trạm tiếp theo';
    let eta = 5;

    if (realLocation) {
      currentLat = realLocation.latitude;
      currentLng = realLocation.longitude;
      if (validStops.length > 0) {
        nextStop = validStops[validStops.length - 1].name;
        for (const stop of validStops) {
          const dist = calculateHaversineDistance(currentLat, currentLng, stop.lat, stop.lng);
          if (dist > 300) {
            nextStop = stop.name;
            eta = Math.max(1, Math.round(dist / 500));
            break;
          }
        }
      }
    } else if (validStops.length >= 2) {
      const depTime = new Date(trip.departure_time).getTime();
      const arrTime = new Date(trip.arrival_time).getTime();
      const now = Date.now();
      const totalDuration = Math.max(1800000, arrTime - depTime);

      const elapsed = Math.max(0, (now - depTime) % totalDuration);
      const progress = elapsed / totalDuration;

      const totalSegments = validStops.length - 1;
      const segFloat = progress * totalSegments;
      const segIndex = Math.min(totalSegments - 1, Math.floor(segFloat));
      const segProgress = segFloat - segIndex;

      const p1 = validStops[segIndex];
      const p2 = validStops[segIndex + 1];

      currentLat = p1.lat + (p2.lat - p1.lat) * segProgress;
      currentLng = p1.lng + (p2.lng - p1.lng) * segProgress;
      nextStop = p2.name;
      eta = Math.max(1, Math.round((1 - segProgress) * 15));
    } else if (validStops.length === 1) {
      currentLat = validStops[0].lat;
      currentLng = validStops[0].lng;
      nextStop = validStops[0].name;
      eta = 0;
    }

    const payload = {
      lat: currentLat,
      lng: currentLng,
      latitude: currentLat,
      longitude: currentLng,
      updatedAt: new Date().toISOString(),
      connected: true,
      eta,
      nextStop,
      speed: realLocation?.speed ?? 40,
      heading: realLocation?.heading ?? 0,
    };

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: payload,
      ...payload,
    });
  } catch (err: any) {
    logger.error('trip_location_fetch_error', { trip_id: req.params.tripId, error: err });
    res.status(500).json({ statusCode: 500, success: false, message: err.message });
  }
};

