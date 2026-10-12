/**
 * Script seed 10 chuyến xe với thời gian khởi hành 15:00 ngày 13/10/2026
 * Chạy lệnh: node backend/scripts/seed-trips-oct13.js
 */
require('dotenv/config');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Lỗi: Vui lòng cấu hình DATABASE_URL hoặc DIRECT_URL trong file .env hoặc biến môi trường.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Đã kết nối PostgreSQL thành công.');

  try {
    await client.query('BEGIN');

    // 1. Tạo tuyến xe mẫu nếu chưa có
    const routeId = 'route-1310-hn-dn';
    await client.query(`
      INSERT INTO routes (id, code, name, description, distance_km, base_price, status)
      VALUES ($1, 'OCT13-HN-DN', 'Hà Nội - Đà Nẵng (Chuyến 13/10)', 'Tuyến chạy thẳng Hà Nội - Đà Nẵng', 780.00, 350000.00, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, base_price=EXCLUDED.base_price;
    `, [routeId]);

    // 2. Tạo xe buýt / xe khách mẫu nếu chưa có
    const busId = 'bus-1310-01';
    await client.query(`
      INSERT INTO buses (id, plate_number, bus_type, total_seats, standing_capacity, status)
      VALUES ($1, '29B-999.99', 'SLEEPER', 40, 10, 'READY')
      ON CONFLICT (id) DO UPDATE SET plate_number=EXCLUDED.plate_number;
    `, [busId]);

    // 3. Tạo tài xế mẫu nếu chưa có
    const driverId = 'driver-1310-01';
    await client.query(`
      INSERT INTO users (id, full_name, email, password_hash, role_id, role, email_verified_at)
      VALUES ($1, 'Tài xế 13/10', 'driver1310@smartbus.test', 'hash_dummy', 3, 'DRIVER', NOW())
      ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name;
    `, [driverId]);

    // 4. Tạo 10 chuyến xe có thời gian khởi hành là 15:00 ngày 13/10/2026
    const departureTime = '2026-10-13T15:00:00+07:00';
    const arrivalTime = '2026-10-13T23:00:00+07:00'; // 8 tiếng di chuyển

    console.log('Đang tạo 10 chuyến xe khởi hành lúc 15:00 ngày 13/10/2026...');

    for (let i = 1; i <= 10; i++) {
      const tripId = `trip-20261013-${i}`;
      const plateNumber = `29B-9${String(i).padStart(2, '0')}.88`;
      
      // Đảm bảo xe buýt tương ứng tồn tại cho mỗi chuyến nếu muốn đổi biển số
      const currentBusId = `bus-1310-${i}`;
      await client.query(`
        INSERT INTO buses (id, plate_number, bus_type, total_seats, status)
        VALUES ($1, $2, 'SLEEPER', 40, 'READY')
        ON CONFLICT (id) DO NOTHING;
      `, [currentBusId, plateNumber]);

      await client.query(`
        INSERT INTO trips (id, route_id, bus_id, bus_plate, driver_id, departure_time, arrival_time, base_price, total_seats, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 350000.00, 40, 'SCHEDULED')
        ON CONFLICT (id) DO UPDATE SET departure_time=EXCLUDED.departure_time, arrival_time=EXCLUDED.arrival_time, status='SCHEDULED';
      `, [tripId, routeId, currentBusId, plateNumber, driverId, departureTime, arrivalTime]);
    }

    await client.query('COMMIT');
    console.log('✅ Đã tạo thành công 10 chuyến xe khởi hành lúc 15:00 ngày 13/10/2026!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi seed dữ liệu chuyến xe:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
