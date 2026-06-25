import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(root, 'migrations');
const statusDocPath = resolve(root, 'docs/13-security-hardening-status.md');
const runbookPath = resolve(root, 'docs/14-d1-migration-runbook.md');
const applyWorkflowPath = resolve(root, '.github/workflows/d1-migrations-apply.yml');
const failures = [];

const destructivePatterns = [
  /\bdrop\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\balter\s+table\s+\S+\s+drop\b/i,
];

const expectedMigrations = [
  '0001_points.sql',
  '0002_chat_state.sql',
  '0003_safety.sql',
  '0004_request_gates.sql',
  '0005_revoked_profiles.sql',
  '0006_moderation.sql',
];

const legacyTablesToInspect = [
  'recent_users',
  'talk_posts',
  'chat_rooms',
  'chat_messages',
  'my_rooms',
];

function read(path) {
  return readFileSync(path, 'utf8');
}

function fail(message) {
  failures.push(message);
}

if (!existsSync(migrationsDir)) {
  fail('migrations directory is missing');
} else {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) fail('no D1 migration SQL files found');

  const duplicateNumbers = new Set();
  const seenNumbers = new Set();

  for (const file of migrationFiles) {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(file);
    if (!match) {
      fail(`${file}: migration filename must use 0000_snake_case.sql`);
      continue;
    }

    if (seenNumbers.has(match[1])) duplicateNumbers.add(match[1]);
    seenNumbers.add(match[1]);

    const sql = read(resolve(migrationsDir, file));
    if (!/create\s+table\s+if\s+not\s+exists/i.test(sql)) {
      fail(`${file}: migration must be idempotent with create table if not exists`);
    }

    for (const pattern of destructivePatterns) {
      if (pattern.test(sql)) fail(`${file}: destructive SQL is not allowed in checked D1 migrations`);
    }
  }

  for (const number of duplicateNumbers) fail(`duplicate migration number: ${number}`);
  for (const expected of expectedMigrations) {
    if (!migrationFiles.includes(expected)) fail(`missing expected migration: ${expected}`);
  }
}

const statusDoc = read(statusDocPath);
const runbook = read(runbookPath);
const applyWorkflow = read(applyWorkflowPath);

for (const expected of expectedMigrations) {
  if (!runbook.includes(`migrations/${expected}`)) {
    fail(`docs/14-d1-migration-runbook.md must mention migrations/${expected}`);
  }
}

const requiredApplyWorkflowTexts = [
  'workflow_dispatch:',
  'database_name:',
  'target_environment:',
  'confirm_apply:',
  'concurrency:',
  'cancel-in-progress: false',
  'timeout-minutes:',
  'node-version: 22',
  'version: 9.15.0',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'pnpm check:d1-migrations',
  'Validate D1 migration target',
  '/^[a-zA-Z0-9_-]{1,128}$/',
  "confirmApply !== 'true'",
  'wrangler@4.20.5 d1 migrations apply',
  'pnpm check:d1-schema-report',
  'if-no-files-found: error',
];

for (const text of requiredApplyWorkflowTexts) {
  if (!applyWorkflow.includes(text)) fail(`.github/workflows/d1-migrations-apply.yml missing required safety text: ${text}`);
}

for (const table of legacyTablesToInspect) {
  if (!applyWorkflow.includes(table)) {
    fail(`.github/workflows/d1-migrations-apply.yml must capture schema report for legacy table: ${table}`);
  }
}

const requiredStatusTexts = [
  '포인트·채팅 상태·차단·신고·1:1 요청 잠금 테이블의 버전형 D1 migration 추가',
  'D1 migration Preview/Production 적용 runbook 추가',
  'D1 migration apply workflow 추가',
  'D1 migration apply workflow schema artifact가 기존 핵심 테이블 table_info까지 캡처하도록 보강',
  '신규 D1 migration을 Preview와 Production 데이터베이스에 적용',
  '운영 D1의 `sqlite_master`와 `pragma table_info(...)` 결과 확인 후 기존 핵심 테이블의 추가 migration 작성',
  '탈퇴 계정의 기존 서명 세션을 차단하는 `revoked_profiles` migration 추가',
  '신고 관리자 메모와 사용자 정지를 위한 `0006_moderation.sql` migration 추가',
];

for (const text of requiredStatusTexts) {
  if (!statusDoc.includes(text)) fail(`docs/13-security-hardening-status.md missing required D1 status text: ${text}`);
}

if (failures.length) {
  console.error('D1 migration contract checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('D1 migration contract checks passed.');
}
