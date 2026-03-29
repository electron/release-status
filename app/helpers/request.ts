export function wantsTextPlain(request: Request) {
  const accept = request.headers.get('accept');
  if (!accept) return false;
  return accept
    .split(',')
    .map((type) => type.split(';')[0].trim())
    .includes('text/plain');
}

export function textPlainResponse(body: string, cacheControl: string): never {
  throw new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });
}
