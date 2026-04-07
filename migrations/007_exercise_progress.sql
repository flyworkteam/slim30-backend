CREATE TABLE IF NOT EXISTS user_exercise_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  day_number TINYINT UNSIGNED NOT NULL,
  exercise_index SMALLINT UNSIGNED NOT NULL,
  exercise_title VARCHAR(191) NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  seconds_spent INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercise_progress_user_day_idx (user_id, day_number, exercise_index),
  KEY idx_exercise_progress_user_day (user_id, day_number),
  KEY idx_exercise_progress_user_completed (user_id, completed),
  CONSTRAINT fk_exercise_progress_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;