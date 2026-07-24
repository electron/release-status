import { createContext, type RouterContextProvider } from 'react-router';

export const cacheControlContext = createContext<string | null>(null);
export const textPlainBodyContext = createContext<string | null>(null);

export function wantsTextPlain(request: Request) {
  const accept = request.headers.get('accept');
  if (!accept) return false;
  return accept
    .split(',')
    .map((type) => type.split(';')[0].trim())
    .includes('text/plain');
}

export function textPlainResponse(
  context: Readonly<RouterContextProvider>,
  body: string,
  cacheControl: string,
): Response {
  context.set(textPlainBodyContext, body);
  context.set(cacheControlContext, cacheControl);
  // entry.server.tsx short-circuits before rendering when textPlainBody is set.
  return new Response(null, { status: 200 });
}
