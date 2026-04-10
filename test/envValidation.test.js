const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { validateEnv } = require('../src/config/env');

const envKeys = [
  'NODE_ENV',
  'AUTH_MODE',
  'DEV_AUTH_ENABLED',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'ALLOWED_ORIGINS',
  'PREMIUM_ADMIN_SECRET',
  'REVENUECAT_WEBHOOK_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_PATH',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
];

const baseProdEnv = {
  NODE_ENV: 'production',
  AUTH_MODE: 'jwt',
  DB_HOST: '127.0.0.1',
  DB_USER: 'root',
  DB_PASSWORD: 'secret',
  DB_NAME: 'slim30',
  JWT_SECRET: 'jwt-secret',
  PREMIUM_ADMIN_SECRET: 'admin-secret',
  REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
  ALLOWED_ORIGINS: 'https://api.slim30.app',
};

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

test('validateEnv rejects invalid NODE_ENV values', () => {
  withEnv(
    {
      NODE_ENV: 'staging',
      AUTH_MODE: 'jwt',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
    },
    () => {
      assert.throws(() => validateEnv(), /NODE_ENV must be one of/i);
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

test('validateEnv rejects non-jwt auth mode in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'auto',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
      ALLOWED_ORIGINS: 'https://api.slim30.app',
    },
    () => {
      assert.throws(() => validateEnv(), /AUTH_MODE must be jwt in production/i);
    },
  );
});

test('validateEnv rejects DEV_AUTH_ENABLED=true in production', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      AUTH_MODE: 'jwt',
      DEV_AUTH_ENABLED: 'true',
      DB_HOST: '127.0.0.1',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      DB_NAME: 'slim30',
      JWT_SECRET: 'jwt-secret',
      PREMIUM_ADMIN_SECRET: 'admin-secret',
      REVENUECAT_WEBHOOK_SECRET: 'webhook-secret',
      ALLOWED_ORIGINS: 'https://api.slim30.app',
    },
    () => {
      assert.throws(() => validateEnv(), /DEV_AUTH_ENABLED must be false in production/i);
    },
  );
});

test('validateEnv passes with secure production config', () => {
  withEnv(
    {
      ...baseProdEnv,
      ALLOWED_ORIGINS: 'https://api.slim30.app,https://app.slim30.app',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}',
    },
    () => {
      assert.doesNotThrow(() => validateEnv());
    },
  );
});

test('validateEnv rejects invalid FIREBASE_SERVICE_ACCOUNT_PATH in production', () => {
  withEnv(
    {
      ...baseProdEnv,
      FIREBASE_SERVICE_ACCOUNT_PATH: './config/does-not-exist.json',
    },
    () => {
      assert.throws(() => validateEnv(), /FIREBASE_SERVICE_ACCOUNT_PATH does not exist/i);
    },
  );
});

test('validateEnv accepts valid FIREBASE_SERVICE_ACCOUNT_PATH in production', () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, 'tmp-firebase-'));
  const fixturePath = path.join(tmpDir, 'firebase-service-account.json');
  fs.writeFileSync(fixturePath, '{"project_id":"p"}', 'utf8');

  withEnv(
    {
      ...baseProdEnv,
      FIREBASE_SERVICE_ACCOUNT_PATH: fixturePath,
    },
    () => {
      assert.doesNotThrow(() => validateEnv());
    },
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('validateEnv rejects invalid FIREBASE_SERVICE_ACCOUNT_JSON in production', () => {
  withEnv(
    {
      ...baseProdEnv,
      FIREBASE_SERVICE_ACCOUNT_JSON: 'not-json',
    },
    () => {
      assert.throws(() => validateEnv(), /FIREBASE_SERVICE_ACCOUNT_JSON is invalid/i);
    },
  );
});

test('validateEnv accepts base64 FIREBASE_SERVICE_ACCOUNT_JSON in production', () => {
  const base64Json = Buffer.from('{"project_id":"p"}', 'utf8').toString('base64');
  withEnv(
    {
      ...baseProdEnv,
      FIREBASE_SERVICE_ACCOUNT_JSON: base64Json,
    },
    () => {
      assert.doesNotThrow(() => validateEnv());
    },
  );
});

test('validateEnv prefers valid FIREBASE_SERVICE_ACCOUNT_JSON when FIREBASE_SERVICE_ACCOUNT_PATH is invalid', () => {
  withEnv(
    {
      ...baseProdEnv,
      FIREBASE_SERVICE_ACCOUNT_PATH: './config/does-not-exist.json',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}',
    },
    () => {
      assert.doesNotThrow(() => validateEnv());
    },
  );
});
