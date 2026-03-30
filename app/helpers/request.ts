import type { AppLoadContext, TypedResponse } from '@remix-run/node';

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
): TypedResponse<never> {
  context.textPlainBody = body;
  context.cacheControl = cacheControl;
  // Remix will unwrap this into loader data, but entry.server.tsx
  // short-circuits before rendering when textPlainBody is set.
  return new Response(null, { status: 200 }) as TypedResponse<never>;
}
