const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseStrictDayParam,
  validateProgressUpdatePayload,
} = require('../src/controllers/progressController');

test('parseStrictDayParam accepts valid day range', () => {
  assert.equal(parseStrictDayParam('1'), 1);
  assert.equal(parseStrictDayParam('30'), 30);
});

test('parseStrictDayParam rejects malformed day values', () => {
  const invalid = ['0', '31', 'abc', '1abc', '1.5', '-1', ''];
  for (const raw of invalid) {
    assert.equal(parseStrictDayParam(raw), null);
  }
});

test('validateProgressUpdatePayload accepts only completed boolean', () => {
  assert.deepEqual(validateProgressUpdatePayload({ completed: true }), { completed: true });
  assert.deepEqual(validateProgressUpdatePayload({ completed: false }), { completed: false });
});

test('validateProgressUpdatePayload rejects invalid payloads', () => {
  assert.throws(() => validateProgressUpdatePayload({}));
  assert.throws(() => validateProgressUpdatePayload({ completed: 'yes' }));
  assert.throws(() => validateProgressUpdatePayload({ completed: true, extra: 1 }));
  assert.throws(() => validateProgressUpdatePayload(null));
});
