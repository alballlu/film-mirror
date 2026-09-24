import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/tmdb-proxy.js';

test('details returns runtime, caches successfully, and preserves existing routes', async (t) => {
  const paths = [];
  const writes = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    paths.push(new URL(url).pathname);
    return Response.json({ id: 27205, runtime: 148 });
  });
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: { match: async () => null, put: async (_key, response) => writes.push(response) } };
  try {
    const invoke = (query) => onRequest({
      request: new Request(`https://example.test/api/tmdb-proxy?${query}`),
      env: { TMDB_API_KEY: 'TEST_ONLY_NOT_A_REAL_KEY' },
      waitUntil: () => {},
    });
    const result = await invoke('action=details&id=27205');
    assert.equal(result.status, 200);
    assert.equal((await result.json()).runtime, 148);
    assert.match(result.headers.get('Cache-Control'), /s-maxage=86400/);
    assert.equal((await invoke('action=details&id=invalid')).status, 400);
    assert.equal((await invoke('action=unknown')).status, 400);
    for (const action of ['search', 'discover', 'keywords', 'recommendations']) {
      assert.equal((await invoke(`action=${action}&id=27205`)).status, 200);
    }
    assert.deepEqual(paths, ['/3/movie/27205', '/3/search/movie', '/3/discover/movie', '/3/movie/27205/keywords', '/3/movie/27205/recommendations']);
    assert.equal(writes.length, 5);
  } finally {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});
