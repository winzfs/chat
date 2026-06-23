const targetUrl = (process.env.PAGES_SMOKE_URL ?? process.argv[2] ?? '').trim();

if (!targetUrl) {
  console.error('PAGES_SMOKE_URL or first argument is required.');
  process.exit(1);
}

let authUrl;
try {
  authUrl = new URL('/api/auth/session', targetUrl);
} catch {
  console.error(`Invalid Pages smoke URL: ${targetUrl}`);
  process.exit(1);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const response = await fetch(authUrl, {
  method: 'POST',
  headers: {
    accept: 'application/json',
  },
});
const body = await readJson(response);

if (response.status !== 201 || typeof body.profile_id !== 'string' || typeof body.token !== 'string') {
  console.error('Pages auth smoke check failed.');
  console.error(`URL: ${authUrl.toString()}`);
  console.error(`HTTP status: ${response.status}`);
  console.error(`Response: ${JSON.stringify(body)}`);

  if (response.status === 503 && typeof body.error === 'string' && body.error.includes('AUTH_SECRET')) {
    console.error('Cloudflare Pages Production/Preview 환경변수에 32자 이상의 AUTH_SECRET을 Secret으로 등록한 뒤 다시 배포해야 합니다.');
  }

  process.exit(1);
}

console.log(`Pages auth smoke check passed for ${authUrl.origin}.`);
