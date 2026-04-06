const requiredEnv = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
];

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
}

module.exports = {
  validateEnv,
};
