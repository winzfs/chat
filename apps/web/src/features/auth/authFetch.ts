let installed = false;
let activeToken = '';
const originalFetch = window.fetch.bind(window);

function isApiRequest(input: RequestInfo | URL) {
  const rawUrl = input instanceof Request ? input.url : String(input);

  try {
    return new URL(rawUrl, window.location.href).pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export function installAuthenticatedFetch(token: string) {
  activeToken = token;
  if (installed) return;

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!isApiRequest(input)) return originalFetch(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set('Authorization', `Bearer ${activeToken}`);

    return originalFetch(input, { ...init, headers });
  };

  installed = true;
}
