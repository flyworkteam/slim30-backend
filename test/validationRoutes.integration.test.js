const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.AUTH_MODE = 'dev';
process.env.DEFAULT_DEV_USER_ID = process.env.DEFAULT_DEV_USER_ID || '1';

const app = require('../src/app');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'x-user-id': '1',
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    void error;
  }

  return { response, body };
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => {
    server.on('listening', resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test('progress route rejects invalid day param before controller', async () => {
  const { response, body } = await request('/api/progress/days/0', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(String(body.error), /day must be between 1 and 30/i);
});

test('progress route rejects invalid body before controller', async () => {
  const { response, body } = await request('/api/progress/days/1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completed: true, extra: 1 }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(String(body.error), /only completed field/i);
});

test('notifications route rejects invalid limit query', async () => {
  const { response, body } = await request('/api/notifications?limit=999');

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(String(body.error), /limit must be an integer between 1 and 100/i);
});

test('notifications create route rejects invalid payload', async () => {
  const { response, body } = await request('/api/notifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x', body: '' }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(String(body.error), /title must be a string between 2 and 191 chars|body must be a string between 2 and 500 chars/i);
});

test('onboarding route rejects empty answers payload', async () => {
  const { response, body } = await request('/api/onboarding/answers', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.match(String(body.error), /answers must be a non-empty array/i);
});

test('premium activate route rejects request without admin secret before payload validation', async () => {
  const { response, body } = await request('/api/premium/activate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      planType: 'invalid-plan',
      price: 10,
      currency: 'TRY',
      source: 'admin',
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.match(String(body.error), /forbidden premium activation request/i);
});

test('premium webhook route rejects request without bearer secret', async () => {
  const previousSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  process.env.REVENUECAT_WEBHOOK_SECRET = 'webhook-secret';

  try {
    const { response, body } = await request('/api/premium/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: { type: 'PING' } }),
    });

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.match(String(body.error), /unauthorized webhook request/i);
  } finally {
    if (previousSecret == null) {
      delete process.env.REVENUECAT_WEBHOOK_SECRET;
    } else {
      process.env.REVENUECAT_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('premium webhook route accepts valid bearer secret', async () => {
  const previousSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  process.env.REVENUECAT_WEBHOOK_SECRET = 'webhook-secret';

  try {
    const { response, body } = await request('/api/premium/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer webhook-secret',
      },
      body: JSON.stringify({ event: { type: 'PING' } }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
  } finally {
    if (previousSecret == null) {
      delete process.env.REVENUECAT_WEBHOOK_SECRET;
    } else {
      process.env.REVENUECAT_WEBHOOK_SECRET = previousSecret;
    }
  }
});
