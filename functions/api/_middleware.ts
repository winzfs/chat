const allowedOrigins = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
]);

function requestOrigin(request: Request) {
  const origin = request.headers.get('origin')?.trim() ?? '';
  return allowedOrigins.has(origin) ? origin : '';
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Profile-Id',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export const onRequest: PagesFunction = async (context) => {
  const origin = requestOrigin(context.request);

  if (context.request.method === 'OPTIONS') {
    if (!origin) {
      return Response.json({ error: '허용되지 않은 요청 출처예요.' }, { status: 403 });
    }

    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);

  if (context.request.headers.has('authorization')) {
    headers.set('Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
  }

  if (origin) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      headers.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
