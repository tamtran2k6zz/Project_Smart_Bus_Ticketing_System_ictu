const { createHash } = require('node:crypto');

function migrationChecksums(sql) {
  const normalized = sql.replace(/\r\n/g, '\n');
  const hash = (text) => createHash('sha256').update(text).digest('hex');
  return {
    canonical: hash(normalized),
    legacyWindows: hash(normalized.replace(/\n/g, '\r\n')),
  };
}

module.exports = { migrationChecksums };
