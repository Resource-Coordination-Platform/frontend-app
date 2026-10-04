const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Test setup: replace phone storage and Axios with small in-memory mocks.
// The session functions and request interceptor come from the REAL api.ts.
function setup() {
  const storage = new Map();
  let attachToken;
  const mocks = {
    'expo-secure-store': {
      setItemAsync: async (key, value) => storage.set(key, value),
      getItemAsync: async key => storage.get(key) ?? null,
      deleteItemAsync: async key => storage.delete(key),
    },
    axios: {
      create: () => ({
        interceptors: {
          request: { use: callback => { attachToken = callback; } },
          response: { use: () => {} }, // Token refresh is outside these tests.
        },
      }),
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../services/api.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process, console, require: name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } });
  return { session: exports, attachToken, storage };
}

test('A01: login session saves access token, refresh token and user role', async () => {
  const s = setup();
  await s.session.saveAuthTokens({
    accessToken: 'test-access', refreshToken: 'test-refresh',
    userRole: 'VICTIM', tenantId: 'test-tenant',
  });

  assert.equal(await s.session.getAccessToken(), 'test-access');
  assert.equal(await s.session.getRefreshToken(), 'test-refresh');
  assert.equal(await s.session.getUserRole(), 'VICTIM');
  assert.equal(s.storage.get('tenant_id'), 'test-tenant');
});

test('A02: clearing the session removes all saved authentication values', async () => {
  const s = setup();
  await s.session.saveAuthTokens({
    accessToken: 'test-access', refreshToken: 'test-refresh',
    userRole: 'VICTIM', tenantId: 'test-tenant',
  });
  await s.session.clearAuthTokens();

  assert.equal(await s.session.getAccessToken(), null);
  assert.equal(await s.session.getRefreshToken(), null);
  assert.equal(await s.session.getUserRole(), null);
  assert.equal(s.storage.has('tenant_id'), false);
});

test('A03: an API request automatically receives the saved access token', async () => {
  const s = setup();
  await s.session.saveAuthTokens({ accessToken: 'test-access' });
  const config = await s.attachToken({ headers: {} });

  assert.equal(config.headers.Authorization, 'Bearer test-access');
});

test('A04: after session clearing, API requests have no saved token attached', async () => {
  const s = setup();
  await s.session.saveAuthTokens({ accessToken: 'test-access' });
  await s.session.clearAuthTokens();
  const config = await s.attachToken({ headers: {} });

  assert.equal(config.headers.Authorization, undefined);
});
