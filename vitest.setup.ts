import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';

const fetchMocker = createFetchMock(vi);

fetchMocker.enableMocks();

// Use an in-memory cache in tests. The default file cache (.kvcache) is shared by
// every test file, so parallel files reading it while another writes it can see a
// truncated file and fail with "Unexpected end of JSON input".
vi.mock('./app/data/cache', async () => {
  const { default: Keyv } = await import('@keyvhq/core');
  return { getKeyvCache: () => new Keyv() };
});
