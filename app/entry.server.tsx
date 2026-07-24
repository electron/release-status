import { PassThrough } from 'node:stream';

import type {
  ActionFunctionArgs,
  EntryContext,
  LoaderFunctionArgs,
  RouterContextProvider,
} from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import { startDataRefreshTimer } from './data/fresh-interval';
import { cacheControlContext, textPlainBodyContext } from './helpers/request';

if (
  process.env.HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.http_proxy ||
  process.env.https_proxy
) {
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

export const streamTimeout = 10_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: Readonly<RouterContextProvider>,
) {
  const textPlainBody = loadContext.get(textPlainBodyContext);
  if (typeof textPlainBody === 'string') {
    responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
    const cacheControl = loadContext.get(cacheControlContext);
    if (cacheControl) {
      responseHeaders.set('Cache-Control', cacheControl);
    }
    return new Response(textPlainBody, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(request, responseStatusCode, responseHeaders, routerContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, routerContext);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1_000);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1_000);
  });
}

export function handleDataRequest(
  response: Response,
  { context }: LoaderFunctionArgs | ActionFunctionArgs,
) {
  const cacheControl = context.get(cacheControlContext);
  if (cacheControl) {
    response.headers.set('Cache-Control', cacheControl);
  }
  return response;
}

if (process.env.NODE_ENV === 'production') {
  startDataRefreshTimer();
}
