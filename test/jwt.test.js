const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { signAuthToken } = require('../src/utils/jwt');

test('signAuthToken creates token with userId and firebase_uid claims', () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousIssuer = process.env.JWT_ISSUER;
  const previousAudience = process.env.JWT_AUDIENCE;
  const previousExpiresIn = process.env.JWT_EXPIRES_IN;

  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'slim30-test';
  process.env.JWT_AUDIENCE = 'slim30-client';
  process.env.JWT_EXPIRES_IN = '15m';

  try {
    const token = signAuthToken({ userId: 42, firebaseUid: 'firebase-uid-42' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    assert.equal(decoded.userId, 42);
    assert.equal(decoded.firebase_uid, 'firebase-uid-42');
    assert.equal(decoded.sub, '42');
  } finally {
    if (previousSecret == null) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }

    if (previousIssuer == null) {
      delete process.env.JWT_ISSUER;
    } else {
      process.env.JWT_ISSUER = previousIssuer;
    }

    if (previousAudience == null) {
      delete process.env.JWT_AUDIENCE;
    } else {
      process.env.JWT_AUDIENCE = previousAudience;
    }

    if (previousExpiresIn == null) {
      delete process.env.JWT_EXPIRES_IN;
    } else {
      process.env.JWT_EXPIRES_IN = previousExpiresIn;
    }
  }
});
