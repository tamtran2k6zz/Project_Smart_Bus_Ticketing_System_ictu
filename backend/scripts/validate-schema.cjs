// Validate prisma/schema.prisma without requiring a real connection string.
// `prisma validate` only parses the schema, but it still refuses to run when
// DATABASE_URL is empty (for example in CI where no .env is present).
const { spawnSync } = require('node:child_process');

const validationUrl =
  process.env.DATABASE_URL?.trim() || 'postgresql://validate:validate@localhost:5432/validate';

const result = spawnSync('npx', ['prisma', 'validate'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: validationUrl },
});

process.exit(result.status === null ? 1 : result.status);