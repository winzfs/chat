import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function requireText(path, content, needle, description) {
  if (!content.includes(needle)) failures.push(`${path}: ${description}`);
}

function requireMatch(path, content, pattern, description) {
  if (!pattern.test(content)) failures.push(`${path}: ${description}`);
}

function listSourceFiles(directory) {
  const absoluteDirectory = resolve(root, directory);
  return readdirSync(absoluteDirectory).flatMap((entry) => {
    const absolutePath = resolve(absoluteDirectory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return listSourceFiles(relative(root, absolutePath));
    }
    return /\.(ts|tsx)$/.test(entry) ? [relative(root, absolutePath)] : [];
  });
}

function requireManualSmokeWorkflow(path, workflow, scriptName, description) {
  requireText(path, workflow, 'workflow_dispatch:', `${description} must support manual reruns`);
  requireText(path, workflow, 'concurrency:', `${description} must cancel stale duplicate runs`);
  requireText(path, workflow, 'cancel-in-progress: true', `${description} must cancel in-progress stale runs`);
  requireText(path, workflow, 'timeout-minutes:', `${description} must have an explicit timeout`);
  requireText(path, workflow, 'node-version: 22', `${description} must pin the Node major version`);
  requireText(path, workflow, 'Validate smoke URL', `${description} must reject unsafe or accidental smoke targets before calling the API`);
  requireText(path, workflow, "url.protocol !== 'https:'", `${description} must require https deployment URLs`);
  requireText(path, workflow, ".pages.dev')", `${description} must allow Cloudflare Pages deployment hosts`);
  requireText(path, workflow, ".workers.dev')", `${description} must allow Cloudflare Workers deployment hosts`);
  requireText(path, workflow, `node scripts/${scriptName}`, `${description} must run its smoke script`);
}

const middleware = read('functions/_middleware.ts');
requireText('functions/_middleware.ts', middleware, "pathname === '/api/chat-rooms'", 'chat room API must verify declared profile_id in middleware');
requireMatch('functions/_middleware.ts', middleware, /pathname === '\/api\/chat-rooms'[\s\S]*request\.method === 'GET'[\s\S]*url\.searchParams\.get\('profile_id'\)[\s\S]*request\.method === 'POST'[\s\S]*bodyProfileId/, 'chat room middleware must validate both GET query and POST body profile_id');
requireText('functions/_middleware.ts', middleware, '다른 사용자 채팅방에 접근할 수 없어요.', 'chat room profile mismatch must return a stable user-facing error');

const apiResponse = read('apps/web/src/features/home/api/apiResponse.ts');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'class ApiResponseError', 'missing shared API error type');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'formatApiError', 'missing user-facing API error formatter');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'response.status', 'missing response status preservation');

const chatRoomsApi = read('apps/web/src/features/home/api/d1ChatRooms.ts');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'parseApiResponse', 'chat room API must use shared response parsing');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'normalizedPeerId', 'direct chat must validate peer profile id');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'peer_id: normalizedPeerId', 'direct chat must send the validated peer profile id');
requireMatch('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, /if \(!response\.ok\)[\s\S]*parseApiResponse/, 'leave room errors must preserve server details');

const chatRoomsFunction = read('functions/api/chat-rooms/index.ts');
requireText('functions/api/chat-rooms/index.ts', chatRoomsFunction, 'refundDirectChatCharge', 'direct chat failure path must refund charged points');
requireText('functions/api/chat-rooms/index.ts', chatRoomsFunction, 'direct_chat_refund', 'direct chat refund must be recorded separately from the charge');
requireText('functions/api/chat-rooms/index.ts', chatRoomsFunction, 'DIRECT_CHAT_OPEN_FAILED_REFUNDED', 'direct chat refund response must expose a stable error code');
requireText('functions/api/chat-rooms/index.ts', chatRoomsFunction, 'settledDirectRoomForViewer', 'direct chat failure path must check final room state before refunding');
requireMatch('functions/api/chat-rooms/index.ts', chatRoomsFunction, /catch \{[\s\S]*settledDirectRoomForViewer[\s\S]*refundDirectChatCharge[\s\S]*balance: refundedBalance/, 'direct chat catch path must avoid false refunds and return refunded balance');

const talkPanel = read('apps/web/src/features/home/components/TalkPanel2.tsx');
requireText('apps/web/src/features/home/components/TalkPanel2.tsx', talkPanel, 'formatApiError', 'talk direct chat errors must use the shared formatter');
requireText('apps/web/src/features/home/components/TalkPanel2.tsx', talkPanel, 'openingProfileIdRef', 'talk direct chat button needs a synchronous ref-backed duplicate-click lock');

const recentUsersPanel = read('apps/web/src/features/home/components/RecentUsersPanel.tsx');
requireText('apps/web/src/features/home/components/RecentUsersPanel.tsx', recentUsersPanel, 'formatApiError', 'recent-user direct chat errors must use the shared formatter');

const homeScreen = read('apps/web/src/features/home/HomeScreenNext.tsx');
requireMatch('apps/web/src/features/home/HomeScreenNext.tsx', homeScreen, /useAndroidBackButton\([\s\S]*isComposeOpen[\s\S]*activeTab === 'chats'[\s\S]*activeTab !== 'talk'/, 'Android back handling order must remain modal, chat, tab');

const pollingHookPath = 'apps/web/src/features/home/hooks/usePollingTask.ts';
for (const path of listSourceFiles('apps/web/src')) {
  if (path === pollingHookPath) continue;
  if (read(path).includes('setInterval(')) {
    failures.push(`${path}: direct setInterval polling is forbidden; use usePollingTask`);
  }
}

const webWorkflow = read('.github/workflows/web-verify.yml');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'push:', 'web CI must run automatically on push');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'branches: [main]', 'web CI must protect main branch pushes');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'pull_request:', 'web CI must run on pull requests');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'workflow_dispatch:', 'web CI must support manual reruns');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'concurrency:', 'web CI must cancel stale duplicate runs');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'cancel-in-progress: true', 'web CI must cancel in-progress stale runs');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'timeout-minutes:', 'web CI must have an explicit timeout');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'node-version: 22', 'web CI must pin the Node major version');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'version: 9.15.0', 'web CI must pin pnpm version');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'pnpm install --frozen-lockfile --ignore-scripts', 'web CI must keep frozen lockfile and ignore install scripts');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'pnpm verify', 'web CI must run root verify');

const webE2EWorkflow = read('.github/workflows/web-e2e.yml');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'push:', 'Web E2E must run automatically on push');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'branches: [main]', 'Web E2E must protect main branch pushes');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'pull_request:', 'Web E2E must run on pull requests');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'workflow_dispatch:', 'Web E2E must support manual reruns');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'concurrency:', 'Web E2E must cancel stale duplicate runs');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'cancel-in-progress: true', 'Web E2E must cancel in-progress stale runs');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'timeout-minutes:', 'Web E2E must have an explicit timeout');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'node-version: 22', 'Web E2E must pin the Node major version');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'version: 9.15.0', 'Web E2E must pin pnpm version');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'pnpm install --frozen-lockfile --ignore-scripts', 'Web E2E must keep frozen lockfile and ignore install scripts');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'pnpm exec playwright install --with-deps chromium', 'Web E2E must install Chromium with OS dependencies');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'pnpm e2e', 'Web E2E must run the Playwright test script');
requireText('.github/workflows/web-e2e.yml', webE2EWorkflow, 'if-no-files-found: error', 'Web E2E must fail artifact upload when Playwright reports are missing');

const accountDeletionE2E = read('e2e/account-deletion.spec.ts');
requireText('e2e/account-deletion.spec.ts', accountDeletionE2E, 'accountDeleteStatus: 500', 'account deletion failure must stay covered by E2E');
requireText('e2e/account-deletion.spec.ts', accountDeletionE2E, '회원 탈퇴 처리 실패', 'account deletion failure must surface the server error');
requireText('e2e/account-deletion.spec.ts', accountDeletionE2E, 'remainingKeys', 'account deletion success must assert local account state cleanup');
requireText('e2e/account-deletion.spec.ts', accountDeletionE2E, 'Bearer ${E2E_SESSION_VALUE}', 'account deletion E2E must assert the authenticated DELETE request');

const androidWorkflow = read('.github/workflows/android-debug-apk.yml');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'workflow_dispatch:', 'Android workflow must support manual reruns');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'push:', 'Android workflow must run automatically on relevant main pushes');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'branches: [main]', 'Android workflow must protect main branch pushes');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'pull_request:', 'Android workflow must run on relevant pull requests');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'concurrency:', 'Android workflow must cancel stale duplicate runs');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'cancel-in-progress: true', 'Android workflow must cancel in-progress stale runs');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'timeout-minutes:', 'Android workflow must have an explicit timeout');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'node-version: 22', 'Android workflow must pin the Node major version');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'version: 9.15.0', 'Android workflow must pin pnpm version');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'java-version: 21', 'Android workflow must pin Java version');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'pnpm install --frozen-lockfile', 'Android workflow must keep frozen lockfile install');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'pnpm check:client-contracts', 'Android workflow must run client stability contracts before APK build');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'npx cap sync android', 'Android workflow must keep Capacitor sync');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'test -s app/build/outputs/apk/debug/app-debug.apk', 'Android workflow must fail when debug APK is missing or empty');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'if-no-files-found: error', 'Android workflow must fail artifact upload when APK is missing');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'android/app/build/outputs/apk/debug/app-debug.apk', 'Android workflow must keep debug APK artifact path');

requireManualSmokeWorkflow('.github/workflows/pages-auth-smoke.yml', read('.github/workflows/pages-auth-smoke.yml'), 'smoke-pages-auth.mjs', 'Pages auth smoke workflow');
requireManualSmokeWorkflow('.github/workflows/pages-api-smoke.yml', read('.github/workflows/pages-api-smoke.yml'), 'smoke-pages-api.mjs', 'Pages API smoke workflow');

const d1SchemaInspectWorkflow = read('.github/workflows/d1-schema-inspect.yml');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'workflow_dispatch:', 'D1 schema inspect workflow must remain manually runnable');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'concurrency:', 'D1 schema inspect workflow must cancel stale duplicate runs');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'cancel-in-progress: true', 'D1 schema inspect workflow must cancel in-progress stale runs');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'timeout-minutes:', 'D1 schema inspect workflow must have an explicit timeout');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'node-version: 22', 'D1 schema inspect workflow must pin the Node major version');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'version: 9.15.0', 'D1 schema inspect workflow must pin pnpm version');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'pnpm install --frozen-lockfile --ignore-scripts', 'D1 schema inspect workflow must keep frozen lockfile and ignore install scripts');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'Validate D1 inspect target', 'D1 schema inspect workflow must validate the database name before passing it to wrangler');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, '/^[a-zA-Z0-9_-]{1,128}$/', 'D1 schema inspect workflow must reject unsafe database names');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'pnpm check:d1-schema-report', 'D1 schema inspect workflow must validate captured schema reports before upload');
requireText('.github/workflows/d1-schema-inspect.yml', d1SchemaInspectWorkflow, 'if-no-files-found: error', 'D1 schema inspect workflow must fail artifact upload when the schema report is missing');

if (failures.length) {
  console.error('Client stability contract checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Client stability contract checks passed.');
}
