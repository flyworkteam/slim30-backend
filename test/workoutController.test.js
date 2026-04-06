const test = require('node:test');
const assert = require('node:assert/strict');

const { parseStrictDayParam } = require('../src/controllers/workoutController');

test('parseStrictDayParam accepts integer day text', () => {
  assert.equal(parseStrictDayParam('1'), 1);
  assert.equal(parseStrictDayParam('30'), 30);
});

test('parseStrictDayParam rejects malformed values', () => {
  const malformed = ['abc', '1abc', '1.5', '', ' ', '-1'];
  for (const value of malformed) {
    assert.equal(parseStrictDayParam(value), null);
  }
});
