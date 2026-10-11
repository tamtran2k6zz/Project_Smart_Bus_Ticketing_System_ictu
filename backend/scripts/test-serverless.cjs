const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.REDIS_URL = '';
process.env.REDIS_HOST = '';
const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.ok(config.functions['api/adapter.js']);
assert.ok(fs.existsSync(path.join(root, 'api/adapter.js')));
assert.equal(config.rewrites[0].destination, '/api/adapter');
const app = require(path.join(root, 'api/adapter.js'));
assert.equal(typeof app, 'function');
request(app)
  .get('/api/does-not-exist')
  .then(response => {
    assert.equal(response.status, 404);
    assert.match(response.headers['content-type'], /application\/json/);
    assert.equal(response.body.message, 'API endpoint not found');
    console.log('PASS: Vercel adapter loads compiled Express and returns JSON for API requests.');
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
