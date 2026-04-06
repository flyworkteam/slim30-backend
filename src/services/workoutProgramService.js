const AppError = require('../utils/appError');

const focusRotation = [
  'full_body_foundation',
  'lower_body_cardio',
  'core_strength',
  'upper_body_endurance',
  'mobility_recovery',
];

const restDays = new Set([7, 14, 21, 28]);

const focusTemplates = {
  full_body_foundation: {
    title: 'Full Body Foundation',
    estimated_minutes: 26,
    exercises: [
      { name: 'Bodyweight Squat', sets: 3, reps: '12' },
      { name: 'Knee Push-Up', sets: 3, reps: '10' },
      { name: 'Glute Bridge', sets: 3, reps: '12' },
      { name: 'Plank', sets: 3, reps: '30s' },
    ],
  },
  lower_body_cardio: {
    title: 'Lower Body + Cardio',
    estimated_minutes: 28,
    exercises: [
      { name: 'Reverse Lunge', sets: 3, reps: '10/leg' },
      { name: 'Step Jack', sets: 3, reps: '30s' },
      { name: 'Wall Sit', sets: 3, reps: '35s' },
      { name: 'Mountain Climber', sets: 3, reps: '30s' },
    ],
  },
  core_strength: {
    title: 'Core Stability',
    estimated_minutes: 24,
    exercises: [
      { name: 'Dead Bug', sets: 3, reps: '10/side' },
      { name: 'Bird Dog', sets: 3, reps: '10/side' },
      { name: 'Side Plank', sets: 3, reps: '25s/side' },
      { name: 'Hollow Hold', sets: 3, reps: '20s' },
    ],
  },
  upper_body_endurance: {
    title: 'Upper Body Endurance',
    estimated_minutes: 27,
    exercises: [
      { name: 'Incline Push-Up', sets: 3, reps: '12' },
      { name: 'Chair Dip', sets: 3, reps: '10' },
      { name: 'Superman Hold', sets: 3, reps: '30s' },
      { name: 'Shadow Boxing', sets: 3, reps: '45s' },
    ],
  },
  mobility_recovery: {
    title: 'Mobility + Recovery',
    estimated_minutes: 20,
    exercises: [
      { name: 'Cat-Cow Stretch', sets: 2, reps: '45s' },
      { name: 'Hip Flexor Stretch', sets: 2, reps: '35s/side' },
      { name: 'Hamstring Stretch', sets: 2, reps: '35s/side' },
      { name: 'Breathing Cooldown', sets: 1, reps: '2m' },
    ],
  },
};

function buildWorkoutDay(dayNumber) {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 30) {
    throw new AppError('day must be between 1 and 30', 400);
  }

  if (restDays.has(dayNumber)) {
    return {
      day: dayNumber,
      type: 'rest',
      title: 'Recovery Day',
      focus_key: 'rest',
      estimated_minutes: 0,
      exercises: [],
    };
  }

  const cycleIndex = (dayNumber - 1) % focusRotation.length;
  const focusKey = focusRotation[cycleIndex];
  const template = focusTemplates[focusKey];

  return {
    day: dayNumber,
    type: 'workout',
    title: template.title,
    focus_key: focusKey,
    estimated_minutes: template.estimated_minutes,
    exercises: template.exercises.map((exercise) => ({ ...exercise })),
  };
}

function getProgram() {
  const days = Array.from({ length: 30 }, (_, index) => buildWorkoutDay(index + 1));
  return {
    total_days: 30,
    rest_days: Array.from(restDays),
    days,
  };
}

module.exports = {
  getProgram,
  buildWorkoutDay,
};
