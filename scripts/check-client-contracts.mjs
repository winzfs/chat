import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const apiResponse = read('apps/web/src/features/home/api/apiResponse.ts');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'class ApiResponseError', 'missing shared API error type');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'formatApiError', 'missing user-facing API error formatter');
requireText('apps/web/src/features/home/api/apiResponse.ts', apiResponse, 'response.status', 'missing response status preservation');

const chatRoomsApi = read('apps/web/src/features/home/api/d1ChatRooms.ts');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'parseApiResponse', 'chat room API must use shared response parsing');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'normalizedPeerId', 'direct chat must validate peer profile id');
requireText('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, 'peer_id: normalizedPeerId', 'direct chat must send the validated peer profile id');
requireMatch('apps/web/src/features/home/api/d1ChatRooms.ts', chatRoomsApi, /if \(!response\.ok\)[\s\S]*parseApiResponse/, 'leave room errors must preserve server details');

const talkPanel = read('apps/web/src/features/home/components/TalkPanel2.tsx');
requireText('apps/web/src/features/home/components/TalkPanel2.tsx', talkPanel, 'formatApiError', 'talk direct chat errors must use the shared formatter');
requireText('apps/web/src/features/home/components/TalkPanel2.tsx', talkPanel, 'openingProfileId', 'talk direct chat button needs a duplicate-click lock');

const recentUsersPanel = read('apps/web/src/features/home/components/RecentUsersPanel.tsx');
requireText('apps/web/src/features/home/components/RecentUsersPanel.tsx', recentUsersPanel, 'formatApiError', 'recent-user direct chat errors must use the shared formatter');

const homeScreen = read('apps/web/src/features/home/HomeScreenNext.tsx');
requireMatch('apps/web/src/features/home/HomeScreenNext.tsx', homeScreen, /useAndroidBackButton\([\s\S]*isComposeOpen[\s\S]*activeTab === 'chats'[\s\S]*activeTab !== 'talk'/, 'Android back handling order must remain modal, chat, tab');

const webWorkflow = read('.github/workflows/web-verify.yml');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'pnpm install --frozen-lockfile --ignore-scripts', 'web CI must keep frozen lockfile and ignore install scripts');
requireText('.github/workflows/web-verify.yml', webWorkflow, 'pnpm verify', 'web CI must run root verify');

const androidWorkflow = read('.github/workflows/android-debug-apk.yml');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'pnpm install --frozen-lockfile', 'Android workflow must keep frozen lockfile install');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'npx cap sync android', 'Android workflow must keep Capacitor sync');
requireText('.github/workflows/android-debug-apk.yml', androidWorkflow, 'android/app/build/outputs/apk/debug/app-debug.apk', 'Android workflow must keep debug APK artifact path');

if (failures.length) {
  console.error('Client stability contract checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Client stability contract checks passed.');
}
