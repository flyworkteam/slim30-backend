const test = require('node:test');
const assert = require('node:assert/strict');

function loadControllerWithStubs({ execute, verifyFirebaseIdToken, signAuthToken }) {
  const dbPath = require.resolve('../src/config/db');
  const firebasePath = require.resolve('../src/config/firebaseAdmin');
  const jwtPath = require.resolve('../src/utils/jwt');
  const controllerPath = require.resolve('../src/controllers/authController');

  const originalDb = require.cache[dbPath];
  const originalFirebase = require.cache[firebasePath];
  const originalJwt = require.cache[jwtPath];
  const originalController = require.cache[controllerPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { pool: { execute } },
  };
  require.cache[firebasePath] = {
    id: firebasePath,
    filename: firebasePath,
    loaded: true,
    exports: { verifyFirebaseIdToken },
  };
  require.cache[jwtPath] = {
    id: jwtPath,
    filename: jwtPath,
    loaded: true,
    exports: { signAuthToken },
  };

  delete require.cache[controllerPath];
  const controller = require('../src/controllers/authController');

  const restore = () => {
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];

    if (originalFirebase) require.cache[firebasePath] = originalFirebase;
    else delete require.cache[firebasePath];

    if (originalJwt) require.cache[jwtPath] = originalJwt;
    else delete require.cache[jwtPath];

    if (originalController) require.cache[controllerPath] = originalController;
    else delete require.cache[controllerPath];
  };

  return { controller, restore };
}

test('exchangeFirebaseToken returns backend JWT and user for existing account', async () => {
  const execute = async (query) => {
    if (query.includes('SELECT id, is_deleted FROM users WHERE firebase_uid')) {
      return [[{ id: 7, is_deleted: 0 }]];
    }

    if (query.includes('UPDATE users')) {
      return [{}];
    }

    if (query.includes('SELECT id, firebase_uid')) {
      return [[{ id: 7, firebase_uid: 'uid-1', name: 'Murat', is_deleted: 0 }]];
    }

    throw new Error(`Unexpected query: ${query}`);
  };

  const { controller, restore } = loadControllerWithStubs({
    execute,
    verifyFirebaseIdToken: async () => ({ uid: 'uid-1', email: 'm@test.com', name: 'Murat' }),
    signAuthToken: () => 'backend-jwt-token',
  });

  const req = { validated: { body: { firebaseToken: 'firebase-token' } } };
  let payload = null;
  const res = { json: (value) => { payload = value; } };

  try {
    await controller.exchangeFirebaseToken(req, res, (error) => {
      throw error;
    });

    assert.equal(payload.success, true);
    assert.equal(payload.data.token, 'backend-jwt-token');
    assert.equal(payload.data.user.id, 7);
    assert.equal(payload.error, null);
  } finally {
    restore();
  }
});

test('exchangeFirebaseToken forwards firebase verification failures', async () => {
  const { controller, restore } = loadControllerWithStubs({
    execute: async () => {
      throw new Error('DB should not be called');
    },
    verifyFirebaseIdToken: async () => {
      throw new Error('Invalid firebase token');
    },
    signAuthToken: () => 'unused',
  });

  const req = { validated: { body: { firebaseToken: 'bad-token' } } };
  const res = { json: () => { throw new Error('Response should not be sent'); } };

  try {
    let captured = null;
    await controller.exchangeFirebaseToken(req, res, (error) => {
      captured = error;
    });

    assert.ok(captured);
    assert.equal(captured.message, 'Invalid firebase token');
  } finally {
    restore();
  }
});

test('exchangeFirebaseToken rejects soft-deleted accounts', async () => {
  const execute = async (query) => {
    if (query.includes('SELECT id, is_deleted FROM users WHERE firebase_uid')) {
      return [[{ id: 11, is_deleted: 1 }]];
    }

    throw new Error(`Unexpected query: ${query}`);
  };

  const { controller, restore } = loadControllerWithStubs({
    execute,
    verifyFirebaseIdToken: async () => ({ uid: 'uid-deleted' }),
    signAuthToken: () => 'unused',
  });

  const req = { validated: { body: { firebaseToken: 'firebase-token' } } };
  const res = { json: () => { throw new Error('Response should not be sent'); } };

  try {
    let captured = null;
    await controller.exchangeFirebaseToken(req, res, (error) => {
      captured = error;
    });

    assert.ok(captured);
    assert.equal(captured.statusCode, 410);
    assert.equal(captured.message, 'Account is deleted');
  } finally {
    restore();
  }
});
