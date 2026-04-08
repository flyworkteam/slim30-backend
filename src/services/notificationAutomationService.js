const { pool } = require('../config/db');
const { normalizeLanguageCode } = require('../utils/locale');

const SIX_HOURS = 6;
const DISPATCH_WINDOW_MINUTES = 15;
const SCHEDULED_ICON_NAME = 'fireworks';
const SCHEDULED_ICON_BG_HEX = '#DFFFE9';
const DEFAULT_TIMEZONE = 'Europe/Istanbul';

const messageCatalog = {
  tr: {
    title: 'Slim30 Hatirlatmasi',
    bodies: [
      'Bugunun hedefi seni bekliyor. Baslamaya ne dersin.',
      'Saglikli hedefin icin kucuk bir adim atabilirsin.',
      'Bugunku ilerlemeni kaydetmeyi unutma.',
      'Programinda bugun icin yeni bir hedef var.',
      '30 gunluk hedefin icin bir adim daha atabilirsin.',
      'Slim30da bugunun planini baslatabilirsin.',
    ],
  },
  en: {
    title: 'Slim30 Reminder',
    bodies: [
      'Your goal for today is waiting. Ready to begin?',
      'You can take one small step toward your healthy goal.',
      'Do not forget to log your progress for today.',
      'There is a new goal in your program for today.',
      'You can take one more step toward your 30-day goal.',
      'You can start today\'s Slim30 plan now.',
    ],
  },
};

function resolveMessagePack(languageCode) {
  return messageCatalog[normalizeLanguageCode(languageCode) || 'en'] || messageCatalog.en;
}

function resolveTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch (_) {
    return DEFAULT_TIMEZONE;
  }
}

function getLocalDateParts(now, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);
  const map = Object.create(null);
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number.parseInt(map.year, 10),
    month: Number.parseInt(map.month, 10),
    day: Number.parseInt(map.day, 10),
    hour: Number.parseInt(map.hour, 10),
    minute: Number.parseInt(map.minute, 10),
  };
}

function isWithinDispatchWindow(localMinute) {
  return Number.isInteger(localMinute)
    && localMinute >= 0
    && localMinute < DISPATCH_WINDOW_MINUTES;
}

function isReminderDue(reminderHour, localHour, localMinute) {
  if (!Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23) {
    return false;
  }

  const delta = (localHour - reminderHour + 24) % 24;
  return delta % SIX_HOURS === 0 && isWithinDispatchWindow(localMinute);
}

function pickNextBody(previousBody, bodies) {
  if (!Array.isArray(bodies) || bodies.length === 0) {
    return '';
  }

  if (!previousBody) {
    return bodies[0];
  }

  const lastIndex = bodies.findIndex((body) => body === previousBody);
  if (lastIndex === -1) {
    return bodies[0];
  }

  return bodies[(lastIndex + 1) % bodies.length];
}

function formatDateTimeForSql(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function listSchedulableUsers() {
  const [rows] = await pool.execute(
    `SELECT u.id,
            u.language,
            u.timezone,
            COALESCE(ns.daily_reminder_enabled, 1) AS daily_reminder_enabled,
            COALESCE(ns.workout_reminder_enabled, 1) AS workout_reminder_enabled,
            COALESCE(ns.progress_summary_enabled, 1) AS progress_summary_enabled,
            COALESCE(ns.reminder_hour, 9) AS reminder_hour
       FROM users u
       LEFT JOIN notification_settings ns ON ns.user_id = u.id
      WHERE COALESCE(u.is_deleted, 0) = 0`,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    language: row.language,
    timeZone: row.timezone,
    dailyReminderEnabled: Boolean(row.daily_reminder_enabled),
    workoutReminderEnabled: Boolean(row.workout_reminder_enabled),
    progressSummaryEnabled: Boolean(row.progress_summary_enabled),
    reminderHour: Number(row.reminder_hour),
  }));
}

async function getLatestScheduledNotification(userId) {
  const [rows] = await pool.execute(
    `SELECT id, body, created_at
       FROM notifications
      WHERE user_id = ? AND icon_name = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, SCHEDULED_ICON_NAME],
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: Number(rows[0].id),
    body: rows[0].body,
    createdAt: new Date(rows[0].created_at),
  };
}

async function createScheduledReminder(userId, payload) {
  await pool.execute(
    `INSERT INTO notifications (user_id, title, body, icon_name, icon_bg_hex, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      userId,
      payload.title,
      payload.body,
      SCHEDULED_ICON_NAME,
      SCHEDULED_ICON_BG_HEX,
      formatDateTimeForSql(payload.createdAt),
    ],
  );
}

async function dispatchScheduledNotifications(now = new Date()) {
  const users = await listSchedulableUsers();
  let createdCount = 0;

  for (const user of users) {
    if (!user.dailyReminderEnabled && !user.workoutReminderEnabled) {
      continue;
    }

    const timeZone = resolveTimeZone(user.timeZone);
    const local = getLocalDateParts(now, timeZone);
    if (!isReminderDue(user.reminderHour, local.hour, local.minute)) {
      continue;
    }

    const latest = await getLatestScheduledNotification(user.id);
    if (latest) {
      const elapsedMs = now.getTime() - latest.createdAt.getTime();
      if (elapsedMs >= 0 && elapsedMs < SIX_HOURS * 60 * 60 * 1000) {
        continue;
      }
    }

    const pack = resolveMessagePack(user.language);
    const body = pickNextBody(latest?.body ?? null, pack.bodies);
    if (!body) {
      continue;
    }

    await createScheduledReminder(user.id, {
      title: pack.title,
      body,
      createdAt: now,
    });
    createdCount += 1;
  }

  return createdCount;
}

function createNotificationScheduler({
  intervalMs = 15 * 60 * 1000,
  runOnStart = true,
  logger = console,
} = {}) {
  let timer = null;

  const run = async () => {
    try {
      const createdCount = await dispatchScheduledNotifications();
      if (createdCount > 0) {
        logger.info?.(`[notifications] created ${createdCount} scheduled reminder(s)`);
      }
    } catch (error) {
      logger.error?.('[notifications] scheduler failed:', error.message);
    }
  };

  if (runOnStart) {
    void run();
  }

  timer = setInterval(() => {
    void run();
  }, intervalMs);

  return {
    stop() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

module.exports = {
  SIX_HOURS,
  DISPATCH_WINDOW_MINUTES,
  SCHEDULED_ICON_NAME,
  SCHEDULED_ICON_BG_HEX,
  getLocalDateParts,
  isReminderDue,
  pickNextBody,
  dispatchScheduledNotifications,
  createNotificationScheduler,
};
