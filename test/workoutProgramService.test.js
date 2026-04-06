const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getProgram,
  buildWorkoutDay,
} = require('../src/services/workoutProgramService');

test('getProgram returns 30-day plan', () => {
  const program = getProgram();
  assert.equal(program.total_days, 30);
  assert.equal(program.days.length, 30);
  assert.deepEqual(program.rest_days, [7, 14, 21, 28]);
});

test('buildWorkoutDay enforces day boundaries', () => {
  assert.throws(() => buildWorkoutDay(0));
  assert.throws(() => buildWorkoutDay(31));
  assert.throws(() => buildWorkoutDay(null));
});

test('buildWorkoutDay returns defensive exercise copies', () => {
  const first = buildWorkoutDay(1);
  const second = buildWorkoutDay(1);

  first.exercises[0].name = 'Mutated Exercise Name';
  assert.notEqual(second.exercises[0].name, 'Mutated Exercise Name');
});
