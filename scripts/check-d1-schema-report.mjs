import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const reportDir = resolve(process.env.D1_SCHEMA_REPORT_DIR ?? 'd1-schema-report');
const failures = [];

const requiredTables = [
  'point_balances',
  'point_transactions',
  'daily_point_claims',
  'chat_reads',
  'chat_room_states',
  'user_blocks',
  'reports',
  'direct_chat_request_locks',
  'revoked_profiles',
];

const legacyTablesToInspect = [
  'recent_users',
  'talk_posts',
  'chat_rooms',
  'chat_messages',
  'my_room_items',
  'my_room_layouts',
];

function fail(message) {
  failures.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path}: failed to read JSON report (${error instanceof Error ? error.message : 'unknown error'})`);
    return undefined;
  }
}

function collectRows(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(collectRows);
  if (Array.isArray(value.results)) return collectRows(value.results);
  if (Array.isArray(value.result)) return collectRows(value.result);
  if (value.success === false) {
    fail(`wrangler report contains unsuccessful result: ${JSON.stringify(value)}`);
    return [];
  }
  if (typeof value === 'object') return [value];
  return [];
}

function reportFileForTable(table) {
  return resolve(reportDir, `table-info-${table}.json`);
}

if (!existsSync(reportDir)) {
  fail(`D1 schema report directory is missing: ${reportDir}`);
} else {
  const files = readdirSync(reportDir).sort();
  const masterPath = resolve(reportDir, 'sqlite-master.json');

  if (!files.includes('sqlite-master.json')) {
    fail('sqlite-master.json is missing from D1 schema report');
  }

  const masterRows = collectRows(readJson(masterPath));
  const tableNames = new Set(masterRows.filter((row) => row?.type === 'table' && typeof row.name === 'string').map((row) => row.name));

  for (const table of requiredTables) {
    if (!tableNames.has(table)) fail(`required migration table is missing from sqlite_master: ${table}`);
  }

  for (const table of [...requiredTables, ...legacyTablesToInspect]) {
    const path = reportFileForTable(table);
    if (!existsSync(path)) {
      fail(`table info report is missing: ${path}`);
      continue;
    }

    const columns = collectRows(readJson(path));
    if (tableNames.has(table) && columns.length === 0) {
      fail(`${table}: table exists but pragma table_info report is empty`);
    }
  }
}

if (failures.length) {
  console.error('D1 schema report checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('D1 schema report checks passed. Attach the generated artifact to migration review notes before removing runtime DDL.');
}
