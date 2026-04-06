const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const AppError = require('../utils/appError');

let isInitialized = false;

function resolveServiceAccountPath() {
  const configured = String(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json',
  ).trim();

  return path.resolve(process.cwd(), configured);
}

function initializeFirebaseAdmin() {
  if (isInitialized) {
    return;
  }

  const serviceAccountPath = resolveServiceAccountPath();
  if (!fs.existsSync(serviceAccountPath)) {
    throw new AppError('Firebase service account is not configured', 503);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
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
