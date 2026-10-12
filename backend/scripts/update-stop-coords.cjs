const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const url = (process.env.DATABASE_URL || '').replace('sslmode=verify-full', '');
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const stopCoordinates = [
  { name: 'Bến Xe Thái Nguyên', lat: 21.58245, lng: 105.83615 },
  { name: 'Bến Xe Bắc Kạn', lat: 22.14682, lng: 105.83471 },
  { name: 'Lạng Sơn', lat: 21.84903, lng: 106.75704 },
  { name: 'Thái Nguyên', lat: 21.58800, lng: 105.83400 },
  { name: 'Công Nghệ Thông Tin', lat: 21.58520, lng: 105.80750 },
  { name: 'ICTU', lat: 21.58520, lng: 105.80750 },
  { name: 'Gang thép', lat: 21.53670, lng: 105.85940 },
  { name: 'Gang Thép', lat: 21.53670, lng: 105.85940 },
  { name: 'Bến xe Bắc Giang', lat: 21.27310, lng: 106.19460 },
  { name: 'trạm hà đông 123', lat: 20.97230, lng: 105.77700 },
  { name: 'Trạm HCM', lat: 10.77689, lng: 106.70081 },
  { name: 'Trạm Hà Nội', lat: 21.02851, lng: 105.77832 }
];

async function updateCoords() {
  await client.connect();
  for (const item of stopCoordinates) {
    const res = await client.query(
      'UPDATE bus_stops SET latitude = $1, longitude = $2 WHERE name = $3',
      [item.lat, item.lng, item.name]
    );
    console.log(`Updated stop "${item.name}": ${res.rowCount} row(s) to (${item.lat}, ${item.lng})`);
  }
  const allStops = await client.query('SELECT id, name, latitude, longitude FROM bus_stops ORDER BY name');
  console.log('\nAll stops in DB:');
  for (const s of allStops.rows) {
    console.log(`- ${s.name}: lat=${s.latitude}, lng=${s.longitude}`);
  }
  await client.end();
}

updateCoords().catch(err => {
  console.error(err);
  process.exit(1);
});
