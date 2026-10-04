const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const storage = new Map();
  const calls = [];
  let token = null, registered = false, failUpload = false, rejectLogin = false;
  let uploadCount = 0, failUploadNumber = 0;
  const victim = JSON.stringify({ sub: 'victim-1', user_type: 'VICTIM' });
  const store = {
    getItemAsync: async key => storage.get(key) || null,
    setItemAsync: async (key, value) => storage.set(key, value),
    deleteItemAsync: async key => storage.delete(key),
  };
  const axios = {
    isAxiosError: error => !!error.response,
    post: async (url, body) => {
      calls.push({ url, body });
      if (url.endsWith('/register')) {
        if (registered) throw { response: { status: 409 } };
        registered = true;
        return {};
      }
      if (rejectLogin) throw { response: { status: 401 } };
      return { data: { access_token: victim, refresh_token: 'refresh' } };
    },
  };
  const api = {
    getAccessToken: async () => token,
    saveAuthTokens: async value => { token = value.accessToken; },
    api: { post: async (url, body, config) => {
      calls.push({ url, body, config });
      uploadCount += 1;
      if (failUpload || uploadCount === failUploadNumber) throw new Error('Connection lost');
    } },
  };
  const mocks = {
    axios, 'expo-secure-store': store, 'jwt-decode': { jwtDecode: JSON.parse },
    './api': api,
    '@react-native-async-storage/async-storage': {
      getItem: store.getItemAsync, setItem: store.setItemAsync,
    },
  };
  function load(name) {
    const file = path.join(__dirname, '../services', name + '.ts');
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: key => {
      assert.ok(key in mocks, key); return mocks[key];
    }, process, console });
    return exports;
  }
  const registration = load('offline-registration');
  mocks['./offline-registration'] = registration;
  const queue = load('help-requests');
  return { registration, queue, calls, storage,
    signIn: () => { token = victim; }, // Simulate an already logged-in victim.
    failUploadOn: number => { failUploadNumber = number; },
    failUpload: value => { failUpload = value; },
    rejectLogin: () => { rejectLogin = true; },
    switchUser: () => { token = JSON.stringify({ sub: 'other', user_type: 'VICTIM' }); },
  };
}
const details = { email: 'victim@example.com', password: 'Original-password1!', full_name: 'Test Victim', phone: '0771234567' };
const request = () => ({ id: 'stable-request-id', disaster: 'flood', needs: ['water'],
  requested_items: [{ code: 'water', label: 'Water', quantity: 3, unit: 'litres' }],
  description: 'Help', latitude: 6.9, longitude: 79.8 });

test('new offline victim registers, logs in and sends the normal authenticated request', async () => {
  const s = setup();
  await s.registration.savePendingRegistration(details);
  await s.queue.enqueueHelpRequest(request());
  assert.equal(await s.queue.syncHelpRequests(), 1);
  assert.deepEqual(s.calls.map(c => c.url.split('/').pop()), ['register', 'login', 'help']);
  assert.equal(s.calls[0].body.password, details.password);
  assert.equal(s.calls[0].body.latitude, 6.9);
  assert.equal(s.calls[2].body.client_request_id, 'stable-request-id');
  assert.equal(s.calls[2].body.requested_items[0].quantity, 3);
  assert.ok(s.calls[2].config.headers.Authorization.startsWith('Bearer '));
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 0);
  assert.equal(await s.registration.readPendingRegistration(), null);
});

// Each setup() creates fresh fake storage and API calls for one test.
test('S04: saving the same request ID updates it instead of adding a duplicate', async () => {
  const s = setup();
  await s.queue.enqueueHelpRequest(request());
  const updated = request(); // Same ID, changed description.
  updated.description = 'Please bring drinking water';
  await s.queue.enqueueHelpRequest(updated);

  const saved = await s.queue.readOfflineHelpRequests();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].description, 'Please bring drinking water');
});

test('S05: a logged-in victim sends a request with location and quantity', async () => {
  const s = setup();
  s.signIn();
  await s.queue.enqueueHelpRequest(request());
  const sent = await s.queue.syncHelpRequests();

  assert.equal(sent, 1);
  assert.equal(s.calls.length, 1); // No new registration or login needed.
  assert.equal(s.calls[0].url, '/requests/help');
  assert.equal(s.calls[0].body.disaster_type, 'flood');
  assert.equal(s.calls[0].body.latitude, 6.9);
  assert.equal(s.calls[0].body.longitude, 79.8);
  assert.equal(s.calls[0].body.requested_items[0].quantity, 3);
  assert.equal(s.calls[0].body.requested_items[0].unit, 'litres');
  assert.ok(s.calls[0].config.headers.Authorization.startsWith('Bearer '));
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 0);
});

test('S06: without login, a saved request stays queued and is not uploaded', async () => {
  const s = setup(); // No logged-in user or pending registration.
  await s.queue.enqueueHelpRequest(request());

  await assert.rejects(s.queue.syncHelpRequests(), /Sign in as a victim/);
  assert.equal(s.calls.length, 0);
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 1);
});

test('S07: an old request without item quantities is blocked and kept for review', async () => {
  const s = setup();
  s.signIn();
  const oldRequest = request();
  delete oldRequest.requested_items;
  await s.queue.enqueueHelpRequest(oldRequest);

  await assert.rejects(s.queue.syncHelpRequests(), /no quantities/);
  assert.equal(s.calls.length, 0);
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 1);
});

test('S08: if the second upload fails, retry sends only the remaining request', async () => {
  const s = setup();
  s.signIn();
  await s.queue.enqueueHelpRequest({ ...request(), id: 'request-1' });
  await s.queue.enqueueHelpRequest({ ...request(), id: 'request-2' });
  s.failUploadOn(2); // First upload succeeds; second loses connection.

  await assert.rejects(s.queue.syncHelpRequests(), /Connection lost/);
  const remaining = await s.queue.readOfflineHelpRequests();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'request-2');

  s.failUploadOn(0); // Restore the connection.
  assert.equal(await s.queue.syncHelpRequests(), 1);
  assert.deepEqual(s.calls.map(call => call.body.client_request_id), [
    'request-1', 'request-2', 'request-2',
  ]); // Successful request-1 was not sent again.
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 0);
});

test('failed upload retains durable data and retries a registered account without duplicate IDs', async () => {
  const s = setup();
  await s.registration.savePendingRegistration(details);
  await s.queue.enqueueHelpRequest(request());
  s.failUpload(true);
  await assert.rejects(s.queue.syncHelpRequests());
  assert.equal((await s.queue.readOfflineHelpRequests()).length, 1);
  assert.ok(await s.registration.readPendingRegistration());
  s.failUpload(false);
  await Promise.all([s.queue.syncHelpRequests(), s.queue.syncHelpRequests()]);
  assert.equal(s.calls.filter(c => c.url === '/requests/help').length, 2);
  assert.ok(s.calls.filter(c => c.url === '/requests/help').every(c => c.body.client_request_id === 'stable-request-id'));
});

test('wrong credentials or a different active account cannot send the SOS', async () => {
  for (const failure of ['rejectLogin', 'switchUser']) {
    const s = setup();
    await s.registration.savePendingRegistration(details);
    await s.queue.enqueueHelpRequest(request());
    s[failure]();
    await assert.rejects(s.queue.syncHelpRequests());
    assert.equal(s.calls.filter(c => c.url === '/requests/help').length, 0);
    assert.equal((await s.queue.readOfflineHelpRequests()).length, 1);
  }
});
