const test = require('node:test');
const assert = require('node:assert/strict');

const { totalDays } = require('../src/services/progressService');

test('progress service exposes 30-day program constant', () => {
  assert.equal(totalDays, 30);
});
