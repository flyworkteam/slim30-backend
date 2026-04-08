const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getLocalDateParts,
  isReminderDue,
  pickNextBody,
} = require('../src/services/notificationAutomationService');

test('isReminderDue only fires inside the dispatch window', () => {
  assert.equal(isReminderDue(9, 9, 0), true);
  assert.equal(isReminderDue(9, 9, 14), true);
  assert.equal(isReminderDue(9, 15, 10), true);
  assert.equal(isReminderDue(9, 21, 10), true);
  assert.equal(isReminderDue(9, 9, 15), false);
  assert.equal(isReminderDue(9, 16, 5), false);
});

test('pickNextBody rotates and avoids immediate repetition', () => {
  const bodies = ['A', 'B', 'C'];
  assert.equal(pickNextBody(null, bodies), 'A');
  assert.equal(pickNextBody('A', bodies), 'B');
  assert.equal(pickNextBody('B', bodies), 'C');
  assert.equal(pickNextBody('C', bodies), 'A');
  assert.equal(pickNextBody('X', bodies), 'A');
});

test('getLocalDateParts resolves timezone-aware hour values', () => {
  const utcDate = new Date('2026-04-08T06:05:00.000Z');
  const istanbul = getLocalDateParts(utcDate, 'Europe/Istanbul');
  assert.equal(istanbul.hour, 9);
  assert.equal(istanbul.minute, 5);
});
