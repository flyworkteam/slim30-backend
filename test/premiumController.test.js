const test = require('node:test');
const assert = require('node:assert/strict');

const { validateActivatePayload } = require('../src/controllers/premiumController');

test('validateActivatePayload accepts monthly/yearly with expiresAt', () => {
  const payload = validateActivatePayload({
    planType: 'monthly',
    price: 49.99,
    currency: 'try',
    source: 'manual',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });

  assert.equal(payload.planType, 'monthly');
  assert.equal(payload.currency, 'TRY');
});

test('validateActivatePayload accepts lifetime without expiresAt', () => {
  const payload = validateActivatePayload({
    planType: 'lifetime',
    price: 499,
    currency: 'USD',
    source: 'admin',
  });

  assert.equal(payload.planType, 'lifetime');
  assert.equal(payload.expiresAt, null);
});

test('validateActivatePayload normalizes whitespace and case in planType', () => {
  const payload = validateActivatePayload({
    planType: ' LiFeTiMe ',
    price: 499,
    currency: 'USD',
    source: 'admin',
  });

  assert.equal(payload.planType, 'lifetime');
  assert.equal(payload.expiresAt, null);
});

test('validateActivatePayload rejects invalid payloads', () => {
  assert.throws(() => validateActivatePayload({}));
  assert.throws(() => validateActivatePayload({ planType: 'monthly', price: -1, currency: 'TRY', expiresAt: new Date().toISOString() }));
  assert.throws(() => validateActivatePayload({ planType: 'monthly', price: 10, currency: 'TR', expiresAt: new Date().toISOString() }));
  assert.throws(() => validateActivatePayload({ planType: 'monthly', price: 10, currency: 'TRY' }));
  assert.throws(() => validateActivatePayload({ planType: 'lifetime', price: 10, currency: 'TRY', source: 'unknown' }));
});
