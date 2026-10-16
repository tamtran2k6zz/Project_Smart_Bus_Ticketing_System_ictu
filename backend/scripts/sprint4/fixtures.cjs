const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = async function fixtures(pool, secret) {
  const password = await bcrypt.hash('LocalSprint4Only!2026', 10);
  const users = [];
  for (let i = 0; i < 50; i++) {
    const id = randomUUID(),
      email = `sprint4-${i}@example.test`;
    await pool.query(
      `INSERT INTO users(id,full_name,email,password_hash,role,role_id,email_verified_at) VALUES($1,$2,$3,$4,'PASSENGER',4,NOW())`,
      [id, 'Sprint 4 test ' + i, email, password]
    );
    users.push({
      id,
      token: jwt.sign({ id, email, role: 'PASSENGER', authVersion: 0 }, secret, {
        expiresIn: '1h',
      }),
    });
  }
  const route = randomUUID(),
    bus = randomUUID(),
    trip = randomUUID(),
    stops = [randomUUID(), randomUUID()];
  await pool.query(
    "INSERT INTO routes(id,code,name,base_price,status) VALUES($1,'SPRINT4','Sprint 4 isolated route',15000,'ACTIVE')",
    [route]
  );
  for (let i = 0; i < 2; i++) {
    await pool.query(
      'INSERT INTO bus_stops(id,code,name,address,latitude,longitude) VALUES($1,$2,$3,$3,$4,$5)',
      [stops[i], 'S4-' + i, 'Sprint 4 stop ' + i, 21.58, 105.79 + i / 100]
    );
    await pool.query(
      'INSERT INTO route_stops(route_id,stop_id,stop_order,estimated_time_minutes) VALUES($1,$2,$3,$4)',
      [route, stops[i], i + 1, i * 30]
    );
  }
  await pool.query(
    "INSERT INTO buses(id,plate_number,bus_type,total_seats,status) VALUES($1,'S4-TEST','STANDARD',40,'READY')",
    [bus]
  );
  const departure = new Date(Date.now() + 86400000);
  await pool.query(
    'INSERT INTO trips(id,route_id,bus_id,departure_time,arrival_time,total_seats,base_price) VALUES($1,$2,$3,$4,$5,40,15000)',
    [trip, route, bus, departure, new Date(departure.getTime() + 3600000)]
  );
  return { users, trip, route };
};
