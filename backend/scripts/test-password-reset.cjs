const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
module.exports = async ({ db, call }) => {
  const base = '/api/smartbus/v1/auth';
  const nodemailer = require('nodemailer');
  const original = nodemailer.createTransport;
  const keys = ['SMTP_HOST', 'SMTP_FROM', 'FRONTEND_PUBLIC_URL', 'LOCAL_DEMO_ENABLED'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const mail = [];
  let accepted = true;
  nodemailer.createTransport = () => ({
    sendMail: async message => {
      mail.push(message);
      return { accepted: accepted ? [message.to] : [] };
    },
    close() {},
  });
  try {
    process.env.LOCAL_DEMO_ENABLED = 'false';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_FROM = 'SmartBus <sender@example.test>';
    process.env.FRONTEND_PUBLIC_URL = 'https://frontend.example.test';
    const oldPassword = 'Reset-Original@123';
    const newPassword = 'Reset-Changed@456';
    const registered = await call(
      'post',
      base + '/register',
      { name: 'Reset contract', email: 'reset@example.test', password: oldPassword },
      null,
      201
    );
    const id = registered.data.user.id;
    const oldSession = registered.data.tokens.accessToken;
    mail.length = 0;
    const generic = await call('post', base + '/forgot-password', {
      email: ' RESET@example.test ',
    });
    assert.equal(mail.length, 1);
    const tokenOf = message =>
      new URLSearchParams(new URL(message.text.match(/https:\/\/[^\s]+/)[0]).hash.slice(1)).get(
        'token'
      );
    const first = tokenOf(mail[0]);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.match(mail[0].text, /reset-password#/);
    assert.equal(mail[0].to, 'reset@example.test');
    assert.equal(JSON.stringify(generic).includes(first), false);
    assert.equal(
      (await db.query('SELECT password_reset_token_hash FROM users WHERE id=$1', [id])).rows[0]
        .password_reset_token_hash,
      createHash('sha256').update(first).digest('hex')
    );
    assert.deepEqual(
      await call('post', base + '/forgot-password', { email: 'unknown@example.test' }),
      generic
    );
    assert.deepEqual(
      await call('post', base + '/forgot-password', { email: 'reset@example.test' }),
      generic
    );
    assert.equal(mail.length, 1, 'Cooldown does not send again');
    await call('post', base + '/forgot-password', { email: 'invalid' }, null, 400);
    await call('post', base + '/reset-password', { token: null, password: newPassword }, null, 400);
    await call('post', base + '/reset-password', { token: first, password: 'short' }, null, 400);
    await call(
      'post',
      base + '/reset-password',
      { token: first, password: 'ế'.repeat(30) },
      null,
      400
    );
    await db.query(
      "UPDATE users SET password_reset_sent_at=NOW()-INTERVAL '61 seconds' WHERE id=$1",
      [id]
    );
    await call('post', base + '/forgot-password', { email: 'reset@example.test' });
    const second = tokenOf(mail.at(-1));
    assert.notEqual(first, second);
    await call(
      'post',
      base + '/reset-password',
      { token: first, password: newPassword },
      null,
      400
    );
    await db.query(
      "UPDATE users SET password_reset_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",
      [id]
    );
    await call(
      'post',
      base + '/reset-password',
      { token: second, password: newPassword },
      null,
      400
    );
    await db.query(
      "UPDATE users SET password_reset_sent_at=NOW()-INTERVAL '61 seconds' WHERE id=$1",
      [id]
    );
    await call('post', base + '/forgot-password', { email: 'reset@example.test' });
    const third = tokenOf(mail.at(-1));
    await call('post', base + '/reset-password', { token: third, password: newPassword });
    await call(
      'post',
      base + '/reset-password',
      { token: third, password: oldPassword },
      null,
      400
    );
    await call(
      'post',
      base + '/login',
      { identifier: 'reset@example.test', password: oldPassword },
      null,
      401
    );
    await call('get', '/api/smartbus/v1/auth/session', null, oldSession, 401);
    const login = await call('post', base + '/login', {
      identifier: 'reset@example.test',
      password: newPassword,
    });
    await call('get', '/api/smartbus/v1/auth/session', null, login.data.tokens.accessToken);
    assert.equal(
      (await db.query('SELECT auth_version FROM users WHERE id=$1', [id])).rows[0].auth_version,
      1
    );
    await db.query(
      "UPDATE users SET password_reset_sent_at=NOW()-INTERVAL '61 seconds',password_reset_send_count=5 WHERE id=$1",
      [id]
    );
    const beforeLimit = mail.length;
    assert.deepEqual(
      await call('post', base + '/forgot-password', { email: 'reset@example.test' }),
      generic
    );
    assert.equal(mail.length, beforeLimit, 'Hourly limit persists in database');
    await db.query(
      "UPDATE users SET password_reset_window_started_at=NOW()-INTERVAL '61 minutes' WHERE id=$1",
      [id]
    );
    accepted = false;
    assert.deepEqual(
      await call('post', base + '/forgot-password', { email: 'reset@example.test' }),
      generic
    );
    const rejected = tokenOf(mail.at(-1));
    await call(
      'post',
      base + '/reset-password',
      { token: rejected, password: newPassword },
      null,
      400
    );
    delete process.env.SMTP_HOST;
    await call('post', base + '/forgot-password', { email: 'unknown@example.test' }, null, 503);
    console.log(
      'PASS: password reset SMTP contract, privacy, cooldown, expiry, single-use, replacement, password validation, session revocation and delivery failure'
    );
  } finally {
    nodemailer.createTransport = original;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};
