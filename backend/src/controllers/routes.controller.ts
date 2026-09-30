import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { query } from '../config/database';

// 1. Lấy danh sách tất cả tuyến xe kèm trạm dừng theo thứ tự (US 12)
export const getRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const routes = await query<any[]>(
      `SELECT r.id, r.code, r.name, r.description, r.distance_km, r.estimated_duration_min, r.status, r.created_at,
              COALESCE((SELECT amount FROM fares f WHERE f.route_id = r.id AND f.ticket_type = 'SINGLE' AND f.is_active = 1 LIMIT 1), 10000) AS base_price
       FROM routes r
       WHERE r.deleted_at IS NULL
       ORDER BY r.code ASC`
    );

    // Lấy danh sách trạm dừng theo thứ tự cho từng tuyến
    const routeStops = await query<any[]>(
      `SELECT rs.route_id, rs.stop_id, rs.stop_order, rs.distance_from_start_km, rs.estimated_time_minutes AS estimated_minutes,
              bs.code AS stop_code, bs.name AS stop_name, bs.address AS stop_address, bs.latitude, bs.longitude
       FROM route_stops rs
       JOIN bus_stops bs ON rs.stop_id = bs.id
       WHERE bs.deleted_at IS NULL
       ORDER BY rs.route_id ASC, rs.stop_order ASC`
    );

    const routesWithStops = routes.map((r) => {
      const stops = routeStops
        .filter((rs) => rs.route_id === r.id)
        .map((rs) => ({
          stopId: rs.stop_id,
          code: rs.stop_code,
          name: rs.stop_name,
          address: rs.stop_address,
          stopOrder: rs.stop_order,
          distanceFromStartKm: Number(rs.distance_from_start_km),
          estimatedMinutes: rs.estimated_minutes,
          latitude: rs.latitude ? Number(rs.latitude) : null,
          longitude: rs.longitude ? Number(rs.longitude) : null,
        }));

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        distanceKm: Number(r.distance_km),
        basePrice: Number(r.base_price),
        status: r.status,
        createdAt: r.created_at,
        stops,
      };
    });

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: routesWithStops,
    });
  } catch (err: any) {
    console.error('Lỗi API getRoutes:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi truy vấn CSDL: ${err.message}`,
    });
  }
};

// 2. Thêm mới tuyến xe buýt (US 12)
export const createRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, description, distance_km = 0, base_price = 10000, status = 'ACTIVE' } = req.body;

    if (!code || !name) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Mã tuyến (code) và Tên tuyến (name) là bắt buộc!',
      });
      return;
    }

    const existing = await query<any[]>('SELECT id FROM routes WHERE code = ? LIMIT 1', [code.trim().toUpperCase()]);

    if (existing.length > 0) {
      res.status(409).json({
        statusCode: 409,
        success: false,
        message: `Mã tuyến '${code}' đã tồn tại trong CSDL MySQL!`,
      });
      return;
    }

    const routeId = randomUUID();
    await query(
      `INSERT INTO routes (id, code, name, description, distance_km, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [routeId, code.trim().toUpperCase(), name.trim(), description ? description.trim() : null, distance_km, status]
    );

    // Lưu giá vé cơ sở vào bảng fares nếu có
    if (base_price) {
      await query(
        `INSERT INTO fares (id, route_id, fareType, ticket_type, amount, is_active)
         VALUES (UUID(), ?, 'FLAT_FARE', 'SINGLE', ?, 1)`,
        [routeId, base_price]
      );
    }

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: 'Tạo mới tuyến xe thành công vào MySQL!',
      data: {
        id: routeId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description,
        distanceKm: Number(distance_km),
        basePrice: Number(base_price),
        status,
        stops: [],
      },
    });
  } catch (err: any) {
    console.error('Lỗi API createRoute:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi tạo tuyến xe: ${err.message}`,
    });
  }
};

// 3. Cập nhật thông tin tuyến xe buýt (US 12)
export const updateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, description, distance_km, base_price, status } = req.body;

    const existing = await query<any[]>('SELECT id FROM routes WHERE id = ? LIMIT 1', [id]);

    if (existing.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Không tìm thấy tuyến xe có ID = ${id} trong CSDL MySQL!`,
      });
      return;
    }

    await query(
      `UPDATE routes
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           distance_km = COALESCE(?, distance_km),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [code ? code.trim().toUpperCase() : null, name ? name.trim() : null, description, distance_km, status, id]
    );

    if (base_price !== undefined) {
      await query(
        `INSERT INTO fares (id, route_id, fareType, ticket_type, amount, is_active)
         VALUES (UUID(), ?, 'FLAT_FARE', 'SINGLE', ?, 1)`,
        [id, base_price]
      );
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Cập nhật tuyến xe thành công trong MySQL!',
    });
  } catch (err: any) {
    console.error('Lỗi API updateRoute:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi cập nhật tuyến: ${err.message}`,
    });
  }
};

// 4. Xóa tuyến xe buýt (US 12)
export const deleteRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await query<any[]>('SELECT id FROM routes WHERE id = ? LIMIT 1', [id]);

    if (existing.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Không tìm thấy tuyến xe ID = ${id} để xóa!`,
      });
      return;
    }

    await query('UPDATE routes SET deleted_at = NOW(3), status = "INACTIVE" WHERE id = ?', [id]);

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Xóa tuyến xe thành công khỏi CSDL MySQL!',
    });
  } catch (err: any) {
    console.error('Lỗi API deleteRoute:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi xóa tuyến xe: ${err.message}`,
    });
  }
};

// 5. Gán trạm dừng vào tuyến và cấu hình thứ tự trạm (US 12)
export const assignStopToRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // route_id
    const { stop_id, stop_order, distance_from_start_km = 0, estimated_minutes = 0 } = req.body;

    if (!stop_id || stop_order === undefined) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'stop_id và stop_order là bắt buộc!',
      });
      return;
    }

    await query(
      `INSERT INTO route_stops (id, route_id, stop_id, stop_order, distance_from_start_km, estimated_time_minutes)
       VALUES (UUID(), ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stop_id = VALUES(stop_id),
         stop_order = VALUES(stop_order),
         distance_from_start_km = VALUES(distance_from_start_km),
         estimated_time_minutes = VALUES(estimated_time_minutes)`,
      [id, stop_id, stop_order, distance_from_start_km, estimated_minutes]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Gán trạm dừng vào tuyến thành công trong MySQL!',
    });
  } catch (err: any) {
    console.error('Lỗi API assignStopToRoute:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi gán trạm dừng: ${err.message}`,
    });
  }
};
