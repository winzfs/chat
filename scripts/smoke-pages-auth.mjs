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

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function requireNoStore(response, label) {
  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!cacheControl.toLowerCase().includes('no-store')) {
    console.error(`${label} must include Cache-Control: no-store.`);
    console.error(`Actual Cache-Control: ${cacheControl || '(missing)'}`);
    process.exit(1);
  }
}

function failAuthSmoke(label, response, body) {
  console.error(`Pages auth smoke check failed: ${label}.`);
  console.error(`URL: ${authUrl.toString()}`);
  console.error(`HTTP status: ${response.status}`);
  console.error(`Response: ${JSON.stringify(body)}`);

  if (response.status === 503 && typeof body.error === 'string' && body.error.includes('AUTH_SECRET')) {
    console.error('Cloudflare Pages Production/Preview 환경변수에 32자 이상의 AUTH_SECRET을 Secret으로 등록한 뒤 다시 배포해야 합니다.');
  }

  process.exit(1);
}

const issueResponse = await fetch(authUrl, {
  method: 'POST',
  headers: {
    accept: 'application/json',
  },
});
const issueBody = await readJson(issueResponse);

if (issueResponse.status !== 201 || typeof issueBody.profile_id !== 'string' || typeof issueBody.token !== 'string') {
  failAuthSmoke('session issue response is invalid', issueResponse, issueBody);
}

requireNoStore(issueResponse, 'Session issue response');

const verifyResponse = await fetch(authUrl, {
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${issueBody.token}`,
  },
});
const verifyBody = await readJson(verifyResponse);

if (verifyResponse.status !== 200 || verifyBody.profile_id !== issueBody.profile_id) {
  failAuthSmoke('issued bearer token is not accepted', verifyResponse, verifyBody);
}

requireNoStore(verifyResponse, 'Session verify response');

const tamperedToken = `${issueBody.token.slice(0, -1)}${issueBody.token.endsWith('a') ? 'b' : 'a'}`;
const tamperedResponse = await fetch(authUrl, {
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${tamperedToken}`,
  },
});
const tamperedBody = await readJson(tamperedResponse);

if (tamperedResponse.status !== 401) {
  failAuthSmoke('tampered bearer token must be rejected', tamperedResponse, tamperedBody);
}

requireNoStore(tamperedResponse, 'Invalid session response');

console.log(`Pages auth smoke check passed for ${authUrl.origin}.`);
console.log('- POST /api/auth/session issues a signed session.');
console.log('- GET /api/auth/session accepts the issued Bearer token.');
console.log('- Tampered Bearer tokens are rejected.');
console.log('- Auth responses are not cached.');
