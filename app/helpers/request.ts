import type { AppLoadContext } from 'react-router';

export function wantsTextPlain(request: Request) {
  const accept = request.headers.get('accept');
  if (!accept) return false;
  return accept
    .split(',')
    .map((type) => type.split(';')[0].trim())
    .includes('text/plain');
}

export function textPlainResponse(
  context: AppLoadContext,
  body: string,
  cacheControl: string,
): Response {
  context.textPlainBody = body;
  context.cacheControl = cacheControl;
  // entry.server.tsx short-circuits before rendering when textPlainBody is set.
  return new Response(null, { status: 200 });
}
