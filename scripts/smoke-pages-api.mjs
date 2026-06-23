const targetUrl = (process.env.PAGES_SMOKE_URL ?? process.argv[2] ?? '').trim();

if (!targetUrl) {
  console.error('PAGES_SMOKE_URL or first argument is required.');
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(targetUrl);
} catch {
  console.error(`Invalid Pages smoke URL: ${targetUrl}`);
  process.exit(1);
}

const authUrl = new URL('/api/auth/session', baseUrl);
const chatRoomsUrl = new URL('/api/chat-rooms', baseUrl);

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function fail(label, response, body) {
  console.error(`Pages API smoke check failed: ${label}.`);
  console.error(`URL: ${response.url}`);
  console.error(`HTTP status: ${response.status}`);
  console.error(`Response: ${JSON.stringify(body)}`);

  if (response.status === 503 && typeof body.error === 'string' && body.error.includes('AUTH_SECRET')) {
    console.error('Cloudflare Pages Production/Preview 환경변수에 32자 이상의 AUTH_SECRET을 Secret으로 등록한 뒤 다시 배포해야 합니다.');
  }

  process.exit(1);
}

function requireNoStore(response, label) {
  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!cacheControl.toLowerCase().includes('no-store')) {
    console.error(`${label} must include Cache-Control: no-store.`);
    console.error(`Actual Cache-Control: ${cacheControl || '(missing)'}`);
    process.exit(1);
  }
}

function requireCorsPreflight(response, expectedOrigin) {
  if (response.status !== 204) {
    console.error(`CORS preflight must return 204, got ${response.status}.`);
    process.exit(1);
  }

  const allowOrigin = response.headers.get('access-control-allow-origin') ?? '';
  const allowHeaders = response.headers.get('access-control-allow-headers') ?? '';
  const allowMethods = response.headers.get('access-control-allow-methods') ?? '';

  if (allowOrigin !== expectedOrigin) {
    console.error(`CORS preflight must echo ${expectedOrigin}, got ${allowOrigin || '(missing)'}.`);
    process.exit(1);
  }

  for (const requiredHeader of ['Authorization', 'Content-Type', 'X-Profile-Id']) {
    if (!allowHeaders.toLowerCase().includes(requiredHeader.toLowerCase())) {
      console.error(`CORS preflight must allow ${requiredHeader}. Actual: ${allowHeaders || '(missing)'}`);
      process.exit(1);
    }
  }

  for (const requiredMethod of ['GET', 'POST', 'OPTIONS']) {
    if (!allowMethods.toUpperCase().includes(requiredMethod)) {
      console.error(`CORS preflight must allow ${requiredMethod}. Actual: ${allowMethods || '(missing)'}`);
      process.exit(1);
    }
  }
}

const corsOrigin = 'capacitor://localhost';
const preflightResponse = await fetch(chatRoomsUrl, {
  method: 'OPTIONS',
  headers: {
    origin: corsOrigin,
    'access-control-request-method': 'GET',
    'access-control-request-headers': 'Authorization, Content-Type, X-Profile-Id',
  },
});
requireCorsPreflight(preflightResponse, corsOrigin);

const issueResponse = await fetch(authUrl, {
  method: 'POST',
  headers: { accept: 'application/json' },
});
const issueBody = await readJson(issueResponse);

if (issueResponse.status !== 201 || typeof issueBody.profile_id !== 'string' || typeof issueBody.token !== 'string') {
  fail('session issue response is invalid', issueResponse, issueBody);
}
requireNoStore(issueResponse, 'Session issue response');

const authorizedRoomsUrl = new URL(chatRoomsUrl);
authorizedRoomsUrl.searchParams.set('profile_id', issueBody.profile_id);
const authorizedRoomsResponse = await fetch(authorizedRoomsUrl, {
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${issueBody.token}`,
    'x-profile-id': issueBody.profile_id,
  },
});
const authorizedRoomsBody = await readJson(authorizedRoomsResponse);

if (authorizedRoomsResponse.status !== 200 || !Array.isArray(authorizedRoomsBody.rooms)) {
  fail('authorized chat room list must return rooms array', authorizedRoomsResponse, authorizedRoomsBody);
}
requireNoStore(authorizedRoomsResponse, 'Authorized chat room list response');

const anonymousRoomsResponse = await fetch(authorizedRoomsUrl, {
  headers: { accept: 'application/json' },
});
const anonymousRoomsBody = await readJson(anonymousRoomsResponse);

if (anonymousRoomsResponse.status !== 401) {
  fail('anonymous chat room list must be rejected', anonymousRoomsResponse, anonymousRoomsBody);
}

const mismatchedRoomsUrl = new URL(chatRoomsUrl);
mismatchedRoomsUrl.searchParams.set('profile_id', crypto.randomUUID());
const mismatchedRoomsResponse = await fetch(mismatchedRoomsUrl, {
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${issueBody.token}`,
    'x-profile-id': issueBody.profile_id,
  },
});
const mismatchedRoomsBody = await readJson(mismatchedRoomsResponse);

if (mismatchedRoomsResponse.status !== 403) {
  fail('mismatched chat room profile_id must be rejected', mismatchedRoomsResponse, mismatchedRoomsBody);
}

console.log(`Pages API smoke check passed for ${chatRoomsUrl.origin}.`);
console.log('- CORS preflight allows Capacitor Authorization requests.');
console.log('- Auth session endpoint issues a signed session.');
console.log('- Authorized chat room list returns a rooms array.');
console.log('- Anonymous chat room list requests are rejected.');
console.log('- Mismatched chat room profile_id requests are rejected.');
