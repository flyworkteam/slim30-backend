const requiredEnv = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

function parseAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function assertProductionOriginRules() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const origins = parseAllowedOrigins();
  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS is required in production');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch (error) {
      throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`);
    }

    if (parsed.protocol !== 'https:') {
      throw new Error(`ALLOWED_ORIGINS must use https in production: ${origin}`);
    }

    if (origin !== parsed.origin) {
      throw new Error(`ALLOWED_ORIGINS entries must be canonical origins without path/query: ${origin}`);
    }
  }
}

function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const requiredSecrets = ['PREMIUM_ADMIN_SECRET', 'REVENUECAT_WEBHOOK_SECRET'];
  const missing = requiredSecrets.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production secrets: ${missing.join(', ')}`);
  }
}

function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const mode = String(process.env.AUTH_MODE || '').trim().toLowerCase();
  if (mode && !new Set(['jwt', 'dev', 'auto']).has(mode)) {
    throw new Error('AUTH_MODE must be one of: jwt, dev, auto');
  }

  const resolvedMode = mode || (process.env.NODE_ENV === 'production' ? 'jwt' : 'auto');
  const requiresJwtSecret = resolvedMode === 'jwt' || (process.env.NODE_ENV === 'production' && resolvedMode === 'auto');
  if (requiresJwtSecret && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required when AUTH_MODE is jwt');
  }

  assertProductionOriginRules();
  assertProductionSecrets();
}

module.exports = {
  validateEnv,
};
