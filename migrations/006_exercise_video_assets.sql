CREATE TABLE IF NOT EXISTS exercise_video_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exercise_key VARCHAR(191) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  cdn_url VARCHAR(512) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  file_size BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercise_video_assets_exercise_key (exercise_key),
  UNIQUE KEY uq_exercise_video_assets_storage_key (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
