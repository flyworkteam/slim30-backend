const test = require('node:test');
const assert = require('node:assert/strict');

function loadControllerWithDbStubs({ execute, getConnection }) {
  const dbPath = require.resolve('../src/config/db');
  const controllerPath = require.resolve('../src/controllers/onboardingController');

  const originalDb = require.cache[dbPath];
  const originalController = require.cache[controllerPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      pool: {
        execute,
        getConnection,
      },
    },
  };

  delete require.cache[controllerPath];
  const controller = require('../src/controllers/onboardingController');

  const restore = () => {
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];

    if (originalController) require.cache[controllerPath] = originalController;
    else delete require.cache[controllerPath];
  };

  return { controller, restore };
}

test('buildProfileUpdateFromAnswers maps supported onboarding answers to user fields', () => {
  const { controller, restore } = loadControllerWithDbStubs({
    execute: async () => {
      throw new Error('pool.execute should not be called');
    },
    getConnection: async () => {
      throw new Error('pool.getConnection should not be called');
    },
  });

  try {
    const payload = controller.buildProfileUpdateFromAnswers([
      { questionKey: 'gender', answerValue: 'female' },
      { questionKey: 'age', answerValue: 29 },
      { questionKey: 'height_cm', answerValue: 171 },
      { questionKey: 'weight_kg', answerValue: 68.5 },
      { questionKey: 'target_weight_kg', answerValue: 60 },
      { questionKey: 'goal_speed', answerValue: 'fast' },
    ]);

    assert.deepEqual(payload, {
      gender: 'female',
      age: 29,
      height_cm: 171,
      weight_kg: 68.5,
      target_weight_kg: 60,
    });
  } finally {
    restore();
  }
});

test('upsertAnswers syncs supported answers into users table', async () => {
  const queries = [];
  const connection = {
    async beginTransaction() {
      queries.push({ type: 'begin' });
    },
    async execute(query, params) {
      queries.push({ query, params });

      if (query.includes('INSERT INTO onboarding_answers')) {
        return [{}];
      }

      if (query.includes('SELECT id FROM users WHERE id = ? LIMIT 1')) {
        return [[{ id: 77 }]];
      }

      if (query.includes('UPDATE users')) {
        return [{}];
      }

      throw new Error(`Unexpected query: ${query}`);
    },
    async commit() {
      queries.push({ type: 'commit' });
    },
    async rollback() {
      queries.push({ type: 'rollback' });
    },
    release() {
      queries.push({ type: 'release' });
    },
  };

  const { controller, restore } = loadControllerWithDbStubs({
    execute: async () => {
      throw new Error('pool.execute should not be called');
    },
    getConnection: async () => connection,
  });

  const req = {
    userId: 77,
    locale: 'en',
    validated: {
      body: {
        answers: [
          { questionKey: 'age', answerValue: 28, answerValueSerialized: '28' },
          { questionKey: 'gender', answerValue: 'female', answerValueSerialized: '"female"' },
          { questionKey: 'weight_kg', answerValue: 68, answerValueSerialized: '68' },
          { questionKey: 'goal_speed', answerValue: 'fast', answerValueSerialized: '"fast"' },
        ],
      },
    },
  };

  let payload = null;
  const res = {
    json(value) {
      payload = value;
    },
  };

  try {
    await controller.upsertAnswers(req, res, (error) => {
      throw error;
    });

    const updateQuery = queries.find((item) => item.query?.includes('UPDATE users'));
    assert.ok(updateQuery);
    assert.deepEqual(updateQuery.params, [28, 'female', null, 68, null, 77]);
    assert.equal(payload.success, true);
    assert.equal(payload.data.upserted, 4);
    assert.equal(queries.some((item) => item.type === 'commit'), true);
    assert.equal(queries.some((item) => item.type === 'rollback'), false);
  } finally {
    restore();
  }
});

test('upsertAnswers creates default user before syncing profile when user row is missing', async () => {
  const queries = [];
  const connection = {
    async beginTransaction() {
      queries.push({ type: 'begin' });
    },
    async execute(query, params) {
      queries.push({ query, params });

      if (query.includes('INSERT INTO onboarding_answers')) {
        return [{}];
      }

      if (query.includes('SELECT id FROM users WHERE id = ? LIMIT 1')) {
        return [[]];
      }

      if (query.includes('INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)')) {
        return [{}];
      }

      if (query.includes('UPDATE users')) {
        return [{}];
      }

      throw new Error(`Unexpected query: ${query}`);
    },
    async commit() {
      queries.push({ type: 'commit' });
    },
    async rollback() {
      queries.push({ type: 'rollback' });
    },
    release() {
      queries.push({ type: 'release' });
    },
  };

  const { controller, restore } = loadControllerWithDbStubs({
    execute: async () => {
      throw new Error('pool.execute should not be called');
    },
    getConnection: async () => connection,
  });

  const req = {
    userId: 15,
    locale: 'tr-TR',
    validated: {
      body: {
        answers: [
          { questionKey: 'height_cm', answerValue: 165, answerValueSerialized: '165' },
        ],
      },
    },
  };

  const res = {
    json() {},
  };

  try {
    await controller.upsertAnswers(req, res, (error) => {
      throw error;
    });

    const insertUserQuery = queries.find((item) =>
      item.query?.includes('INSERT INTO users (id, email, name, language, timezone, created_at, updated_at)'));
    const updateUserQuery = queries.find((item) => item.query?.includes('UPDATE users'));

    assert.ok(insertUserQuery);
    assert.deepEqual(insertUserQuery.params, [15, null, 'User 15', 'tr', 'Europe/Istanbul']);
    assert.ok(updateUserQuery);
    assert.deepEqual(updateUserQuery.params, [null, null, 165, null, null, 15]);
    assert.equal(queries.some((item) => item.type === 'commit'), true);
  } finally {
    restore();
  }
});
