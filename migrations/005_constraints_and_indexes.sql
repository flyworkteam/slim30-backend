SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'onboarding_answers'
        AND index_name = 'idx_onboarding_answers_user_updated'
    ),
    'SELECT 1',
    'CREATE INDEX idx_onboarding_answers_user_updated ON onboarding_answers (user_id, updated_at)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'subscriptions'
        AND index_name = 'idx_subscriptions_user_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_subscriptions_user_status_created ON subscriptions (user_id, status, created_at)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'subscriptions'
        AND index_name = 'idx_subscriptions_user_status_expires'
    ),
    'SELECT 1',
    'CREATE INDEX idx_subscriptions_user_status_expires ON subscriptions (user_id, status, expires_at)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO user_workout_progress (user_id, day_number, completed, completed_at, created_at, updated_at)
SELECT source.user_id,
       1,
       MAX(source.completed),
       MIN(source.completed_at),
       NOW(),
       NOW()
FROM user_workout_progress source
WHERE source.day_number = 0
  AND NOT EXISTS (
    SELECT 1
    FROM user_workout_progress existing
    WHERE existing.user_id = source.user_id
      AND existing.day_number = 1
  )
GROUP BY source.user_id;

UPDATE user_workout_progress target
JOIN (
  SELECT user_id,
         MAX(completed) AS merged_completed,
         MIN(completed_at) AS merged_completed_at
  FROM user_workout_progress
  WHERE day_number = 0
  GROUP BY user_id
) source
  ON source.user_id = target.user_id
 AND target.day_number = 1
SET target.completed = GREATEST(target.completed, source.merged_completed),
    target.completed_at = CASE
      WHEN target.completed_at IS NULL THEN source.merged_completed_at
      ELSE target.completed_at
    END,
    target.updated_at = NOW();

DELETE source
FROM user_workout_progress source
JOIN user_workout_progress target
  ON target.user_id = source.user_id
 AND target.day_number = 1
WHERE source.day_number = 0;

DELETE FROM user_workout_progress
WHERE day_number = 0;

INSERT INTO user_workout_progress (user_id, day_number, completed, completed_at, created_at, updated_at)
SELECT source.user_id,
       30,
       MAX(source.completed),
       MIN(source.completed_at),
       NOW(),
       NOW()
FROM user_workout_progress source
WHERE source.day_number > 30
  AND NOT EXISTS (
    SELECT 1
    FROM user_workout_progress existing
    WHERE existing.user_id = source.user_id
      AND existing.day_number = 30
  )
GROUP BY source.user_id;

UPDATE user_workout_progress target
JOIN (
  SELECT user_id,
         MAX(completed) AS merged_completed,
         MIN(completed_at) AS merged_completed_at
  FROM user_workout_progress
  WHERE day_number > 30
  GROUP BY user_id
) source
  ON source.user_id = target.user_id
 AND target.day_number = 30
SET target.completed = GREATEST(target.completed, source.merged_completed),
    target.completed_at = CASE
      WHEN target.completed_at IS NULL THEN source.merged_completed_at
      ELSE target.completed_at
    END,
    target.updated_at = NOW();

DELETE FROM user_workout_progress
WHERE day_number > 30;

UPDATE notification_settings
SET reminder_hour = CASE
  WHEN reminder_hour < 0 THEN 0
  WHEN reminder_hour > 23 THEN 23
  ELSE reminder_hour
END;

UPDATE subscriptions
SET price = 0.00
WHERE price < 0;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'user_workout_progress'
        AND constraint_name = 'chk_workout_day_range'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE user_workout_progress ADD CONSTRAINT chk_workout_day_range CHECK (day_number BETWEEN 1 AND 30)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'user_workout_progress'
        AND constraint_name = 'chk_workout_completed_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE user_workout_progress ADD CONSTRAINT chk_workout_completed_bool CHECK (completed IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'notification_settings'
        AND constraint_name = 'chk_notification_reminder_hour'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_reminder_hour CHECK (reminder_hour BETWEEN 0 AND 23)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'notification_settings'
        AND constraint_name = 'chk_notification_daily_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_daily_bool CHECK (daily_reminder_enabled IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'notification_settings'
        AND constraint_name = 'chk_notification_workout_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_workout_bool CHECK (workout_reminder_enabled IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'notification_settings'
        AND constraint_name = 'chk_notification_progress_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE notification_settings ADD CONSTRAINT chk_notification_progress_bool CHECK (progress_summary_enabled IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'notifications'
        AND constraint_name = 'chk_notifications_is_read_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE notifications ADD CONSTRAINT chk_notifications_is_read_bool CHECK (is_read IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'users'
        AND constraint_name = 'chk_users_is_deleted_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD CONSTRAINT chk_users_is_deleted_bool CHECK (is_deleted IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'users'
        AND constraint_name = 'chk_users_is_premium_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD CONSTRAINT chk_users_is_premium_bool CHECK (is_premium IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'users'
        AND constraint_name = 'chk_users_trial_used_bool'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD CONSTRAINT chk_users_trial_used_bool CHECK (trial_used IN (0, 1))'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'subscriptions'
        AND constraint_name = 'chk_subscriptions_price_nonnegative'
        AND constraint_type = 'CHECK'
    ),
    'SELECT 1',
    'ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_price_nonnegative CHECK (price >= 0)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
