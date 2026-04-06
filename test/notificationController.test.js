const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseNotificationId,
  validateSettingsPayload,
} = require('../src/controllers/notificationController');

test('parseNotificationId accepts positive integer values', () => {
  assert.equal(parseNotificationId('1'), 1);
  assert.equal(parseNotificationId('25'), 25);
});

test('parseNotificationId rejects malformed values', () => {
  const invalid = ['', '0', '-1', 'abc', '1abc', '1.5', '9007199254740992'];
  for (const value of invalid) {
    assert.equal(parseNotificationId(value), null);
  }
});

test('validateSettingsPayload accepts full valid payload', () => {
  const payload = validateSettingsPayload({
    dailyReminderEnabled: true,
    workoutReminderEnabled: false,
    progressSummaryEnabled: true,
    reminderHour: 9,
  });

  assert.deepEqual(payload, {
    dailyReminderEnabled: true,
    workoutReminderEnabled: false,
    progressSummaryEnabled: true,
    reminderHour: 9,
  });
});

test('validateSettingsPayload rejects invalid payloads', () => {
  assert.throws(() => validateSettingsPayload(null));
  assert.throws(() => validateSettingsPayload({}));
  assert.throws(() => validateSettingsPayload({ dailyReminderEnabled: true }));
  assert.throws(() =>
    validateSettingsPayload({
      dailyReminderEnabled: true,
      workoutReminderEnabled: true,
      progressSummaryEnabled: true,
      reminderHour: 30,
    }),
  );
  assert.throws(() =>
    validateSettingsPayload({
      dailyReminderEnabled: 'yes',
      workoutReminderEnabled: true,
      progressSummaryEnabled: true,
      reminderHour: 8,
    }),
  );
});

test('icon validation regexes behave as expected', () => {
  assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test('notification-bell_1'));
  assert.ok(!/^[a-zA-Z0-9_-]{1,64}$/.test('invalid icon name'));
  assert.ok(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test('#6ACBFF'));
  assert.ok(!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test('6ACBFF'));
});
