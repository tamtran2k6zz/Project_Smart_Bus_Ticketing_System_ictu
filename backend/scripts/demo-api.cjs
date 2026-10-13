const path = require('node:path');
const fs = require('node:fs');
const { randomUUID, createHmac } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const express = require('express');
const bcrypt = require('bcrypt');
const port = Number(process.env.DEMO_API_PORT || 5010);
const frontend = process.env.DEMO_FRONTEND_URL || 'http://127.0.0.1:3010';
if (process.env.NODE_ENV === 'production' || process.env.VERCEL)
  throw new Error('Local demo cannot run on production/hosting.');
Object.assign(process.env, {
  NODE_ENV: 'development',
  VERCEL_ENV: 'development',
  LOCAL_DEMO_ENABLED: 'true',
  INVOICE_MODE: 'demo',
  JWT_SECRET: 'local-demo-only-secret-at-least-32-characters-long',
  DATABASE_URL: 'postgresql://demo:demo@127.0.0.1:1/isolated-demo',
  PORT: String(port),
  PAYMENT_PUBLIC_BASE_URL: 'http://127.0.0.1:' + port,
  PAYMENT_RESULT_URL: frontend + '/payment/result',
  CORS_ORIGIN: frontend,
  MOMO_PARTNER_CODE: 'demo-partner',
  MOMO_ACCESS_KEY: 'demo-access',
  MOMO_SECRET_KEY: 'demo-secret',
  MOMO_CREATE_URL: 'http://127.0.0.1:' + port + '/demo-provider/momo',
  MOMO_IPN_URL: 'http://127.0.0.1:' + port + '/api/v1/ticketing/payments/momo/ipn',
  MOMO_REDIRECT_URL: frontend + '/payment/result',
  VNPAY_TMN_CODE: 'DEMO',
  VNPAY_HASH_SECRET: 'demo-vnpay-secret',
  VNPAY_PAYMENT_URL: 'http://127.0.0.1:' + port + '/demo-gateway/vnpay',
  ZALOPAY_APP_ID: '9999',
  ZALOPAY_KEY1: 'demo-zalo-key1',
  ZALOPAY_KEY2: 'demo-zalo-key2',
  ZALOPAY_CREATE_URL: 'http://127.0.0.1:' + port + '/demo-provider/zalo',
  ZALOPAY_CALLBACK_URL: 'http://127.0.0.1:' + port + '/api/v1/ticketing/payments/zalopay/ipn',
  DEMO_MAIL_DIR: path.resolve(__dirname, '../demo-output/outbox'),
  PAYMENT_CRON_SECRET: 'local-demo-cron',
  SMTP_HOST: '',
});
async function main() {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  const migrations = path.resolve(__dirname, '../../supabase/migrations');
  for (const file of fs
    .readdirSync(migrations)
    .filter(f => f.endsWith('.sql'))
    .sort())
    await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'));
  const pool = require('../dist/config/database').dbPool;
  for (const key of ['REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'])
    delete process.env[key];
  let queue = Promise.resolve();
  async function acquire() {
    let release;
    const previous = queue;
    queue = new Promise(r => (release = r));
    await previous;
    return release;
  }
  pool.query = async (sql, args) => {
    const release = await acquire();
    try {
      return await db.query(sql, args);
    } finally {
      release();
    }
  };
  pool.connect = async () => {
    const release = await acquire();
    return { query: (sql, args) => db.query(sql, args), release };
  };
  const q = async (sql, args = []) => {
    const result = await db.query(sql, args);
    return result.rows;
  };
  const password = await bcrypt.hash('SmartBus123!', 10);
  const roles = ['PASSENGER', 'DRIVER', 'MANAGER', 'FINANCE', 'ADMIN', 'MARKETING'];
  const users = {};
  for (const [i, role] of roles.entries()) {
    const id = randomUUID();
    users[role] = id;
    await q(
      'INSERT INTO users(id,full_name,email,password_hash,phone_number,role,role_id,email_verified_at) VALUES($1,$2,$3,$4,$5,$6,(SELECT id FROM roles WHERE name=$6),NOW())',
      [id, 'Demo ' + role, role.toLowerCase() + '@smartbus.demo', password, '090123456' + i, role]
    );
  }
  const conductor = randomUUID();
  await q(
    "INSERT INTO users(id,full_name,email,password_hash,phone_number,role,role_id,email_verified_at) VALUES($1,'Phụ xe demo','conductor@smartbus.demo',$2,'0901234569','DRIVER',3,NOW())",
    [conductor, password]
  );
  const staff = randomUUID(),
    crew = randomUUID();
  await q('INSERT INTO staff_profiles(id,user_id,name,phone) VALUES($1,$2,$3,$4),($5,$6,$7,$8)', [
    staff,
    users.DRIVER,
    'Tài xế demo',
    '0901234561',
    crew,
    conductor,
    'Phụ xe demo',
    '0901234569',
  ]);
  const stops = [];
  for (const [name, lat, lng] of [
    ['Bến xe trung tâm Thái Nguyên', 21.588, 105.834],
    ['Đại học ICTU', 21.584, 105.796],
    ['Hồ Núi Cốc', 21.575, 105.716],
  ]) {
    const id = randomUUID();
    stops.push({ id, name, lat, lng });
    await q(
      'INSERT INTO bus_stops(id,code,name,address,latitude,longitude) VALUES($1,$5,$2,$6,$3,$4)',
      [id, name, lat, lng, 'DEMO-S' + stops.length, name]
    );
  }
  const route = randomUUID();
  await q(
    "INSERT INTO routes(id,code,name,base_price,status) VALUES($1,'DEMO01','Trung tâm – ICTU – Hồ Núi Cốc',15000,'ACTIVE')",
    [route]
  );
  for (let i = 0; i < stops.length; i++)
    await q(
      'INSERT INTO route_stops(route_id,stop_id,stop_order,estimated_time_minutes) VALUES($1,$2,$3,$4)',
      [route, stops[i].id, i + 1, i * 15]
    );
  const buses = [];
  for (let i = 0; i < 2; i++) {
    const id = randomUUID();
    buses.push(id);
    await q(
      "INSERT INTO buses(id,plate_number,bus_type,total_seats,status) VALUES($1,$2,'STANDARD',40,'READY')",
      [id, '20B-DEMO0' + (i + 1)]
    );
  }
  const activeTrip = randomUUID(),
    futureTrip = randomUUID(),
    exchangeTrip = randomUUID();
  for (const [id, start, bus] of [
    [activeTrip, Date.now() + 25 * 60000, buses[0]],
    [futureTrip, Date.now() + 120 * 60000, buses[1]],
    [exchangeTrip, Date.now() + 240 * 60000, buses[0]],
  ]) {
    await q(
      'INSERT INTO trips(id,route_id,bus_id,driver_id,conductor_id,departure_time,arrival_time,total_seats,base_price) VALUES($1,$2,$3,$4,$5,$6,$7,40,15000)',
      [id, route, bus, users.DRIVER, conductor, new Date(start), new Date(start + 45 * 60000)]
    );
  }
  // 42 days of labeled synthetic history for strategic analysis, never customer data.
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  for (let day = 1; day <= 42; day++) {
    const date = new Date(Date.parse(today + 'T00:00:00+07:00') - day * 86400000);
    for (const [hour, count] of [
      [8, 32 + (day % 5)],
      [14, 12 + (day % 8)],
    ]) {
      const id = randomUUID(),
        departure = new Date(date.getTime() + hour * 3600000);
      await q(
        "INSERT INTO trips(id,route_id,bus_id,departure_time,arrival_time,total_seats,base_price,status) VALUES($1,$2,$3,$4,$5,40,15000,'COMPLETED')",
        [id, route, buses[0], departure, new Date(departure.getTime() + 45 * 60000)]
      );
      for (let remaining = count, group = 0; remaining > 0; group++) {
        const quantity = Math.min(6, remaining),
          hold = randomUUID(),
          booking = randomUUID(),
          ticket = randomUUID();
        await q(
          "INSERT INTO ui_holds(id,user_id,trip_id,seat_ids,quantity,price,expires_at,status,boarding_stop_id,alighting_stop_id) VALUES($1,$2,$3,$4,$5,15000,$6,'converted',$7,$8)",
          [
            hold,
            users.FINANCE,
            id,
            JSON.stringify(Array.from({ length: quantity }, (_, i) => 'H' + (group * 6 + i))),
            quantity,
            departure,
            stops[day % 2].id,
            stops[2].id,
          ]
        );
        await q(
          "INSERT INTO tickets(id,ticket_code,trip_id,user_id,quantity,fare_amount,status) VALUES($1,$2,$3,$4,$5,$6,'CHECKED_IN')",
          [ticket, 'DEMO-HISTORY-' + ticket, id, users.FINANCE, quantity, quantity * 15000]
        );
        await q(
          "INSERT INTO payment_transactions(order_id,ticket_id,payment_method,amount,status,gateway_transaction_id,paid_at) VALUES($1,$1,'MOMO',$2,'SUCCESS',$3,$4)",
          [ticket, quantity * 15000, String(Date.now() + group), departure]
        );
        await q(
          'INSERT INTO ui_bookings(id,hold_id,name,phone,total,ticket_id) VALUES($1,$2,$3,$4,$5,$6)',
          [booking, hold, 'Dữ liệu lịch sử DEMO', '0900000000', quantity * 15000, ticket]
        );
        remaining -= quantity;
      }
    }
  }
  await q(
    "INSERT INTO vouchers(code,percent,expires_at) VALUES('DEMO15',15,NOW()+INTERVAL '7 days')"
  );
  await q(
    "INSERT INTO eligibility_applications(user_id,category,document) VALUES($1,'Sinh viên','DEMO-SV001')",
    [users.PASSENGER]
  );
  const app = require('../dist/app').default;
  const demo = express();
  demo.use(express.json());
  demo.use(express.urlencoded({ extended: false }));
  const hmac = (key, text) => createHmac('sha256', key).update(text).digest('hex');
  const escape = value =>
    String(value).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  demo.post('/demo-provider/momo', (req, res) =>
    res.json({
      resultCode: 0,
      payUrl: 'http://127.0.0.1:' + port + '/demo-gateway/' + encodeURIComponent(req.body.orderId),
    })
  );
  demo.post('/demo-provider/zalo', async (req, res) => {
    const [mapping] = await pool
      .query('SELECT order_id FROM zalopay_orders WHERE app_trans_id=$1', [req.body.app_trans_id])
      .then(x => x.rows);
    res.json({
      return_code: 1,
      order_url:
        'http://127.0.0.1:' +
        port +
        '/demo-gateway/' +
        encodeURIComponent(mapping?.order_id || 'invalid'),
    });
  });
  async function order(id) {
    const rows = (
      await pool.query(
        'SELECT order_id AS id,amount,payment_method,status FROM payment_transactions WHERE order_id=$1 UNION SELECT id,amount,payment_method,status FROM pass_orders WHERE id=$1',
        [id]
      )
    ).rows;
    return rows[0];
  }
  async function gatewayPage(req, res) {
    const id = req.params.orderId || req.query.vnp_TxnRef,
      record = await order(id);
    if (!record) {
      res.status(404).send('Không tìm thấy đơn demo.');
      return;
    }
    res
      .type('html')
      .send(
        '<!doctype html><meta charset="utf-8"><title>Cổng thanh toán DEMO</title><main style="font:18px Arial;max-width:650px;margin:80px auto"><h1>Cổng thanh toán DEMO ' +
          escape(record.payment_method) +
          '</h1><p>Không thu tiền thật. Callback sẽ được ký bằng khóa demo và xử lý bởi API.</p><p>Số tiền: ' +
          escape(record.amount) +
          ' VND</p><p>Đơn: ' +
          escape(record.id) +
          '</p><button onclick="complete(true)">Mô phỏng thành công</button> <button onclick="complete(false)">Mô phỏng thất bại</button><p id="result"></p><script>async function complete(success){const r=await fetch("/demo-gateway/' +
          encodeURIComponent(id) +
          '/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({success})});const d=await r.json();if(d.redirect)location.assign(d.redirect);else document.getElementById("result").textContent=d.message;}</script></main>'
      );
  }
  demo.get('/demo-gateway/vnpay', gatewayPage);
  demo.get('/demo-gateway/:orderId', gatewayPage);
  demo.post('/demo-gateway/:orderId/complete', async (req, res) => {
    try {
      const record = await order(req.params.orderId);
      if (!record) {
        res.status(404).json({ message: 'Không tìm thấy đơn.' });
        return;
      }
      const success = req.body.success === true,
        tx = String(Date.now());
      if (record.payment_method === 'MOMO') {
        const body = {
          partnerCode: process.env.MOMO_PARTNER_CODE,
          orderId: record.id,
          requestId: record.id,
          amount: Number(record.amount),
          extraData: '',
          message: 'DEMO',
          orderInfo: 'DEMO',
          orderType: 'momo_wallet',
          payType: 'qr',
          responseTime: Date.now(),
          resultCode: success ? 0 : 1006,
          transId: Number(tx),
        };
        body.signature = hmac(
          process.env.MOMO_SECRET_KEY,
          [
            'accessKey=' + process.env.MOMO_ACCESS_KEY,
            ...[
              'amount',
              'extraData',
              'message',
              'orderId',
              'orderInfo',
              'orderType',
              'partnerCode',
              'payType',
              'requestId',
              'responseTime',
              'resultCode',
              'transId',
            ].map(key => key + '=' + body[key]),
          ].join('&')
        );
        const response = await fetch(process.env.MOMO_IPN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('Callback MoMo thất bại.');
      } else if (record.payment_method === 'VNPAY') {
        const fields = {
          vnp_Amount: String(Number(record.amount) * 100),
          vnp_ResponseCode: success ? '00' : '24',
          vnp_TransactionStatus: success ? '00' : '02',
          vnp_TmnCode: process.env.VNPAY_TMN_CODE,
          vnp_TxnRef: record.id,
          vnp_TransactionNo: tx,
        };
        const raw = new URLSearchParams(
          Object.keys(fields)
            .sort()
            .map(k => [k, fields[k]])
        ).toString();
        const mac = createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(raw).digest('hex');
        const reply = await fetch(
          'http://127.0.0.1:' +
            port +
            '/api/v1/ticketing/payments/vnpay/ipn?' +
            raw +
            '&vnp_SecureHash=' +
            mac
        ).then(r => r.json());
        if (reply.RspCode !== '00') throw new Error('Callback VNPay thất bại.');
      } else {
        if (!success)
          await require('../dist/routes/ticketing.routes').recordFailedPayment(
            record.id,
            'ZALOPAY'
          );
        else {
          const [map] = (
            await pool.query('SELECT app_trans_id FROM zalopay_orders WHERE order_id=$1', [
              record.id,
            ])
          ).rows;
          const data = JSON.stringify({
            app_id: Number(process.env.ZALOPAY_APP_ID),
            app_trans_id: map.app_trans_id,
            amount: Number(record.amount),
            zp_trans_id: tx,
          });
          const reply = await fetch(process.env.ZALOPAY_CALLBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 1, data, mac: hmac(process.env.ZALOPAY_KEY2, data) }),
          }).then(r => r.json());
          if (reply.return_code !== 1) throw new Error('Callback ZaloPay thất bại.');
        }
      }
      const [pass] = (await pool.query('SELECT id FROM pass_orders WHERE id=$1', [record.id])).rows;
      const [booking] = (
        await pool.query('SELECT id FROM ui_bookings WHERE ticket_id=$1', [record.id])
      ).rows;
      res.json({
        redirect: pass
          ? frontend + '/account/passes'
          : frontend + '/payment/result?bookingId=' + booking?.id,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  demo.get('/demo-outbox', (_req, res) => {
    const dir = process.env.DEMO_MAIL_DIR;
    const files = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 30)
      : [];
    res.type('html').send(
      '<!doctype html><meta charset="utf-8"><title>Hộp thư DEMO</title><h1>Hộp thư DEMO cục bộ</h1><p>Không gửi email tới bên ngoài.</p>' +
        files
          .map(file => {
            const mail = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
            return (
              '<article style="border:1px solid #ddd;padding:16px;margin:16px"><h2>' +
              escape(mail.subject) +
              '</h2><pre>' +
              escape(mail.text) +
              '</pre>' +
              (mail.html
                ? '<details><summary>Nội dung HTML</summary><iframe style="width:100%;height:400px" sandbox srcdoc="' +
                  escape(mail.html) +
                  '"></iframe></details>'
                : '') +
              '</article>'
            );
          })
          .join('')
    );
  });
  demo.use(app);
  const server = demo.listen(port, '127.0.0.1', () =>
    console.log(
      'DEMO API http://127.0.0.1:' +
        port +
        ' · tài khoản <role>@smartbus.demo · mật khẩu SmartBus123!'
    )
  );
  let frame = 0,
    running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      frame++;
      const phase = frame % 24,
        progress = (phase % 12) / 11,
        start = stops[Math.floor(phase / 12)],
        end = stops[Math.floor(phase / 12) + 1];
      await require('../dist/services/location-update.service').updateTripLocation(
        activeTrip,
        users.DRIVER,
        'DRIVER',
        {
          latitude: start.lat + (end.lat - start.lat) * progress,
          longitude: start.lng + (end.lng - start.lng) * progress,
          speed: 6,
          heading: 270,
        }
      );
      await require('../dist/services/refund-queue.service').processRefundJobs(5);
    } catch (error) {
      console.error('DEMO worker:', error.message);
    } finally {
      running = false;
    }
  }, 10000);
  timer.unref();
  const ids = { route, stops, buses, activeTrip, futureTrip, exchangeTrip, staff, crew, users };
  fs.mkdirSync(path.resolve(__dirname, '../demo-output'), { recursive: true });
  fs.writeFileSync(
    path.resolve(__dirname, '../demo-output/ids.json'),
    JSON.stringify(ids, null, 2)
  );
  console.log(
    'Dữ liệu DEMO: 84 chuyến lịch sử, 3 chuyến tương lai; database nhúng reset khi khởi động lại.'
  );
  const close = () => {
    clearInterval(timer);
    server.close(() => {
      db.close()
        .then(() => pool.end())
        .then(() => process.exit(0));
    });
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
