const test = require('node:test');
const assert = require('node:assert/strict');

const { validateFirebaseExchangePayload } = require('../src/validation/authValidation');

test('validateFirebaseExchangePayload accepts non-empty firebase_token', () => {
  const result = validateFirebaseExchangePayload({ firebase_token: '  token-123  ' });
  assert.equal(result.firebaseToken, 'token-123');
});

test('validateFirebaseExchangePayload rejects missing firebase_token', () => {
  assert.throws(() => validateFirebaseExchangePayload({}));
  assert.throws(() => validateFirebaseExchangePayload({ firebase_token: '' }));
  assert.throws(() => validateFirebaseExchangePayload(null));
});
