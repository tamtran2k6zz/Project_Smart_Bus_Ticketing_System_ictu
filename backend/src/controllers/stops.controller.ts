import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { query } from '../config/database';

// 1. Lấy danh sách tất cả các trạm dừng xe buýt (US 12)
export const getStops = async (req: Request, res: Response): Promise<void> => {
  try {
    const stops = await query<any[]>(
      `SELECT id, code, name, address, latitude, longitude, 
              (CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END) AS status, 
              created_at 
       FROM bus_stops 
       WHERE deleted_at IS NULL 
       ORDER BY name ASC`
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: stops.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        address: s.address,
        latitude: s.latitude ? Number(s.latitude) : null,
        longitude: s.longitude ? Number(s.longitude) : null,
        status: s.status,
        createdAt: s.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Lỗi API getStops:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi truy vấn CSDL: ${err.message}`,
    });
  }
};

// 2. Thêm mới trạm dừng xe buýt (US 12)
export const createStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, address, latitude, longitude, status = 'ACTIVE' } = req.body;

    if (!code || !name) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Mã trạm (code) và Tên trạm (name) là bắt buộc!',
      });
      return;
    }

    const existing = await query<any[]>('SELECT id FROM bus_stops WHERE code = ? LIMIT 1', [code.trim().toUpperCase()]);

    if (existing.length > 0) {
      res.status(409).json({
        statusCode: 409,
        success: false,
        message: `Mã trạm dừng '${code}' đã tồn tại trong CSDL!`,
      });
      return;
    }

    const stopId = randomUUID();
    const isActive = status === 'INACTIVE' ? 0 : 1;

    await query(
      `INSERT INTO bus_stops (id, code, name, address, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        stopId,
        code.trim().toUpperCase(),
        name.trim(),
        address ? address.trim() : null,
        latitude !== undefined && latitude !== null ? Number(latitude) : null,
        longitude !== undefined && longitude !== null ? Number(longitude) : null,
        isActive,
      ]
    );

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: 'Thêm mới trạm dừng thành công vào CSDL MySQL!',
      data: {
        id: stopId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        status,
      },
    });
  } catch (err: any) {
    console.error('Lỗi API createStop:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi tạo trạm dừng: ${err.message}`,
    });
  }
};

// 3. Cập nhật thông tin trạm dừng (US 12)
export const updateStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, address, latitude, longitude, status } = req.body;

    const existing = await query<any[]>('SELECT id FROM bus_stops WHERE id = ? LIMIT 1', [id]);

    if (existing.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Không tìm thấy trạm dừng có ID = ${id} trong CSDL!`,
      });
      return;
    }

    const isActive = status !== undefined ? (status === 'ACTIVE' || status === true ? 1 : 0) : null;

    await query(
      `UPDATE bus_stops
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           address = COALESCE(?, address),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        code ? code.trim().toUpperCase() : null,
        name ? name.trim() : null,
        address ? address.trim() : null,
        latitude !== undefined && latitude !== null ? Number(latitude) : null,
        longitude !== undefined && longitude !== null ? Number(longitude) : null,
        isActive,
        id,
      ]
    );

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Cập nhật trạm dừng thành công trong CSDL!',
    });
  } catch (err: any) {
    console.error('Lỗi API updateStop:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi cập nhật trạm dừng: ${err.message}`,
    });
  }
};

// 4. Xóa trạm dừng (US 12)
export const deleteStop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await query<any[]>('SELECT id FROM bus_stops WHERE id = ? LIMIT 1', [id]);

    if (existing.length === 0) {
      res.status(404).json({
        statusCode: 404,
        success: false,
        message: `Không tìm thấy trạm dừng ID = ${id} để xóa!`,
      });
      return;
    }

    // Kiểm tra xem trạm có đang được gán vào tuyến nào không
    const routeStopCheck = await query<any[]>('SELECT route_id FROM route_stops WHERE stop_id = ? LIMIT 1', [id]);

    if (routeStopCheck.length > 0) {
      res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Trạm dừng đang thuộc một hoặc nhiều tuyến xe. Hãy gỡ trạm khỏi tuyến trước khi xóa!',
      });
      return;
    }

    await query('UPDATE bus_stops SET deleted_at = NOW(3), is_active = 0 WHERE id = ?', [id]);

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Xóa trạm dừng thành công khỏi CSDL MySQL!',
    });
  } catch (err: any) {
    console.error('Lỗi API deleteStop:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Lỗi xóa trạm dừng: ${err.message}`,
    });
  }
};
