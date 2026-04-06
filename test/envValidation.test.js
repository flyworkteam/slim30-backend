const test = require('node:test');
const assert = require('node:assert/strict');

const { validateEnv } = require('../src/config/env');

const envKeys = [
  'NODE_ENV',
  'AUTH_MODE',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'ALLOWED_ORIGINS',
  'PREMIUM_ADMIN_SECRET',
  'REVENUECAT_WEBHOOK_SECRET',
];

function withEnv(overrides, fn) {
  const previous = new Map(envKeys.map((key) => [key, process.env[key]]));

  for (const key of envKeys) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }

  try {
    fn();
  } finally {
    for (const key of envKeys) {
      const value = previous.get(key);
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('validateEnv requires ALLOWED_ORIGINS in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
    },
    () => {
      assert.throws(() => validateEnv(), /ALLOWED_ORIGINS is required in production/);
    },
  );
});

test('validateEnv rejects non-https ALLOWED_ORIGINS in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
      ALLOWED_ORIGINS: 'http://localhost:3000',
    },
    () => {
      assert.throws(() => validateEnv(), /must use https/i);
    },
  );
});

test('validateEnv rejects non-canonical ALLOWED_ORIGINS values', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
      ALLOWED_ORIGINS: 'https://app.slim30.app/',
    },
    () => {
      assert.throws(() => validateEnv(), /must be canonical origins/i);
    },
  );
});

test('validateEnv requires premium and webhook secrets in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      ALLOWED_ORIGINS: 'https://api.slim30.app',
    },
    () => {
      assert.throws(() => validateEnv(), /Missing required production secrets/i);
    },
  );
});

test('validateEnv passes with secure production config', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
      ALLOWED_ORIGINS: 'https://api.slim30.app,https://app.slim30.app',
    },
    () => {
      assert.doesNotThrow(() => validateEnv());
    },
  );
});
