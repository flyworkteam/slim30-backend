ALTER TABLE users
  ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN premium_expires_at DATETIME NULL,
  ADD COLUMN trial_used TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_type VARCHAR(32) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  external_subscription_id VARCHAR(191) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_subscriptions_user_status (user_id, status),
  KEY idx_subscriptions_external_id (external_subscription_id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
