import { NATIVE_API_BASE_URL } from '../home/api/apiBase';

let installed = false;
let activeToken = '';
const originalFetch = window.fetch.bind(window);
const nativeApiOrigin = new URL(NATIVE_API_BASE_URL).origin;

function isTrustedApiRequest(input: RequestInfo | URL) {
  const rawUrl = input instanceof Request ? input.url : String(input);

  try {
    const url = new URL(rawUrl, window.location.href);
    const trustedOrigin = url.origin === window.location.origin || url.origin === nativeApiOrigin;
    return trustedOrigin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export function installAuthenticatedFetch(token: string) {
  activeToken = token;
  if (installed) return;

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!isTrustedApiRequest(input)) return originalFetch(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set('Authorization', `Bearer ${activeToken}`);

    return originalFetch(input, { ...init, headers });
  };

  installed = true;
}
