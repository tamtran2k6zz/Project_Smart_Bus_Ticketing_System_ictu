const fs = require('node:fs');
const path = require('node:path');
module.exports = async function exportSchema(db, folder) {
  const columns = (
    await db.query(
      `SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`
    )
  ).rows;
  const constraints = (
    await db.query(
      `SELECT t.relname AS table_name,c.conname AS name,c.contype AS type,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname`
    )
  ).rows;
  const foreignKeys = (
    await db.query(
      `SELECT tc.table_name,kcu.column_name,ccu.table_name AS target_table,ccu.column_name AS target_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' ORDER BY tc.table_name,kcu.column_name`
    )
  ).rows;
  const primaryKeys = (
    await db.query(
      `SELECT kcu.table_name,kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public'`
    )
  ).rows;
  const tables = [...new Set(columns.map(c => c.table_name))];
  const lines = [
    '# PostgreSQL physical schema',
    '',
    'Generated from migrations applied to an isolated native PostgreSQL database. No customer data.',
    '',
    '```mermaid',
    'erDiagram',
  ];
  for (const table of tables) {
    lines.push('  ' + table + ' {');
    for (const c of columns.filter(c => c.table_name === table)) {
      const key = primaryKeys.some(k => k.table_name === table && k.column_name === c.column_name)
        ? ' PK'
        : foreignKeys.some(k => k.table_name === table && k.column_name === c.column_name)
          ? ' FK'
          : '';
      lines.push('    ' + c.data_type.replace(/[^A-Za-z0-9]/g, '_') + ' ' + c.column_name + key);
    }
    lines.push('  }');
  }
  // FK edges are structural; optionality, uniqueness and full column metadata remain in JSON.
  for (const k of foreignKeys)
    lines.push(`  ${k.target_table} ||--o{ ${k.table_name} : "${k.column_name}"`);
  lines.push(
    '```',
    '',
    'FK edge multiplicity is schematic. Inspect constraints for one-to-one/nullable relations before using this diagram as a final report figure.'
  );
  fs.writeFileSync(
    path.join(folder, 'schema.json'),
    JSON.stringify({ tables, columns, foreignKeys, primaryKeys, constraints }, null, 2)
  );
  fs.writeFileSync(path.join(folder, 'schema-erd.md'), lines.join('\n'));
};
