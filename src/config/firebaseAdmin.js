const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const AppError = require('../utils/appError');

let isInitialized = false;

function resolveServiceAccountPath() {
  const configured = String(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json',
  ).trim();

  if (path.isAbsolute(configured)) {
    return configured;
  }

  const projectRoot = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.resolve(process.cwd(), configured),
    path.resolve(projectRoot, configured),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function tryReadServiceAccountFromEnv() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) {
    return { serviceAccount: null, error: null };
  }

  try {
    // Accept plain JSON payload stored directly in env.
    return { serviceAccount: JSON.parse(raw), error: null };
  } catch (_) {
    try {
      // Accept base64-encoded JSON payload to simplify deployment providers.
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      return { serviceAccount: JSON.parse(decoded), error: null };
    } catch (_) {
      return {
        serviceAccount: null,
        error: new AppError('Firebase service account JSON is invalid', 503),
      };
    }
  }
}

function initializeFirebaseAdmin() {
  if (isInitialized) {
    return;
  }

  const { serviceAccount: serviceAccountFromEnv, error: serviceAccountEnvError } =
    tryReadServiceAccountFromEnv();
  const serviceAccountPath = resolveServiceAccountPath();
  const hasServiceAccountPath = fs.existsSync(serviceAccountPath);

  if (!serviceAccountFromEnv && !hasServiceAccountPath) {
    if (serviceAccountEnvError) {
      throw serviceAccountEnvError;
    }
    throw new AppError('Firebase service account is not configured', 503);
  }

  try {
    const serviceAccount =
      serviceAccountFromEnv ||
      JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    void error;
    throw new AppError('Firebase service account initialization failed', 503);
  }

  isInitialized = true;
}

async function verifyFirebaseIdToken(firebaseToken) {
  if (typeof firebaseToken !== 'string' || firebaseToken.trim().length === 0) {
    throw new AppError('firebase_token is required', 400);
  }

  initializeFirebaseAdmin();

  try {
    return await admin.auth().verifyIdToken(firebaseToken.trim());
  } catch (error) {
    if (error instanceof AppError && error.statusCode >= 500) {
      throw error;
    }
    throw new AppError('Invalid firebase token', 401);
  }
}

module.exports = {
  verifyFirebaseIdToken,
};
