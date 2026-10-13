const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { migrationChecksums } = require('./migration-checksum.cjs');

test('migration identity survives Git line-ending conversion and accepts historical hashes', () => {
  const lf = 'CREATE TABLE example (id text);\nSELECT 1;\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.deepEqual(migrationChecksums(lf), migrationChecksums(crlf));
  assert.equal(migrationChecksums(lf).legacyWindows, createHash('sha256').update(crlf).digest('hex'));
});

test('a SQL content change still fails both accepted checksums', () => {
  const before = migrationChecksums('SELECT 1;\n');
  const after = migrationChecksums('SELECT 2;\n');
  assert.ok(!Object.values(before).some((checksum) => Object.values(after).includes(checksum)));
});
