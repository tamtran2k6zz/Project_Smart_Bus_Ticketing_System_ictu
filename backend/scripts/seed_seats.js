/**
 * Script nạp dữ liệu mẫu ghế (seats) và trạng thái ghế theo chuyến (trip_seats)
 * Tác giả: La Công Tuấn
 */
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'root_pass',
    database: 'smartbus_db'
  });

  console.log('Connected to MySQL via port 3308');

  // 1. Lấy danh sách các xe
  const [buses] = await connection.query('SELECT id, plate_number, total_seats FROM buses');
  console.log(`Tìm thấy ${buses.length} xe buýt.`);

  // 2. Chèn các ghế cho từng xe
  for (const bus of buses) {
    const total = bus.total_seats || 40;
    const half = Math.ceil(total / 2);
    const remaining = total - half;

    console.log(`Đang khởi tạo ${total} ghế cho xe ${bus.id} (${bus.plate_number})...`);

    // Hàng A
    for (let i = 1; i <= half; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      const seatNumber = `A${numStr}`;
      const seatId = `seat-${bus.id}-${seatNumber}`;
      const isPriority = i <= 2 ? 1 : 0;
      const seatType = i <= 2 ? 'PRIORITY' : 'STANDARD';
      const rowPosition = i <= 2 ? 'FRONT' : (i >= half - 1 ? 'BACK' : (i % 2 === 1 ? 'WINDOW' : 'AISLE'));

      await connection.query(
        `INSERT INTO seats (id, bus_id, seat_number, seat_type, row_position, deck, is_priority, status)
         VALUES (?, ?, ?, ?, ?, 'DECK_1', ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE seat_type = VALUES(seat_type), row_position = VALUES(row_position), is_priority = VALUES(is_priority)`,
        [seatId, bus.id, seatNumber, seatType, rowPosition, isPriority]
      );
    }

    // Hàng B
    for (let i = 1; i <= remaining; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      const seatNumber = `B${numStr}`;
      const seatId = `seat-${bus.id}-${seatNumber}`;
      const isPriority = i <= 2 ? 1 : 0;
      const seatType = i <= 2 ? 'PRIORITY' : 'STANDARD';
      const rowPosition = i <= 2 ? 'FRONT' : (i >= remaining - 1 ? 'BACK' : (i % 2 === 0 ? 'WINDOW' : 'AISLE'));

      await connection.query(
        `INSERT INTO seats (id, bus_id, seat_number, seat_type, row_position, deck, is_priority, status)
         VALUES (?, ?, ?, ?, ?, 'DECK_1', ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE seat_type = VALUES(seat_type), row_position = VALUES(row_position), is_priority = VALUES(is_priority)`,
        [seatId, bus.id, seatNumber, seatType, rowPosition, isPriority]
      );
    }
  }

  // 3. Khởi tạo trip_seats cho các chuyến xe hiện có
  const [trips] = await connection.query('SELECT id, bus_id FROM trips');
  console.log(`Tìm thấy ${trips.length} chuyến xe. Bắt đầu đồng bộ trip_seats...`);

  for (const trip of trips) {
    const busId = trip.bus_id || 'bus-01';
    const [busSeats] = await connection.query('SELECT id, seat_number FROM seats WHERE bus_id = ?', [busId]);

    // Lấy các vé đã đặt trên chuyến này
    const [tickets] = await connection.query(
      'SELECT id, seat_number, status FROM tickets WHERE trip_id = ? AND status IN ("BOOKED", "CHECKED_IN")',
      [trip.id]
    );

    const ticketMap = new Map();
    for (const t of tickets) {
      if (t.seat_number) {
        ticketMap.set(t.seat_number, t);
      }
    }

    for (const s of busSeats) {
      const ticket = ticketMap.get(s.seat_number);
      const status = ticket ? ticket.status : 'AVAILABLE';
      const ticketId = ticket ? ticket.id : null;

      await connection.query(
        `INSERT INTO trip_seats (trip_id, seat_id, seat_number, status, ticket_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), ticket_id = VALUES(ticket_id)`,
        [trip.id, s.id, s.seat_number, status, ticketId]
      );
    }
  }

  // Đếm tổng số lượng
  const [[{ seatCount }]] = await connection.query('SELECT COUNT(*) AS seatCount FROM seats');
  const [[{ tripSeatCount }]] = await connection.query('SELECT COUNT(*) AS tripSeatCount FROM trip_seats');

  console.log(`✅ Hoàn tất nạp dữ liệu!`);
  console.log(`- Tổng số ghế (seats): ${seatCount}`);
  console.log(`- Tổng số trạng thái ghế theo chuyến (trip_seats): ${tripSeatCount}`);

  await connection.end();
}

main().catch(err => {
  console.error('Lỗi seed dữ liệu ghế:', err);
  process.exit(1);
});
