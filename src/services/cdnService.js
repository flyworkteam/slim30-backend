const https = require('node:https');
const AppError = require('../utils/appError');

function requireCdnConfig() {
  const storageZone = process.env.CDN_STORAGE_ZONE || process.env.CDN_USERNAME;
  const accessKey = process.env.CDN_ACCESS_KEY || process.env.CDN_PASSWORD;
  const hostname = process.env.CDN_HOSTNAME;

  if (!storageZone || !accessKey || !hostname) {
    throw new AppError('CDN configuration is incomplete', 500);
  }

  return { storageZone, accessKey, hostname };
}

function uploadBufferToBunny({ storageZone, accessKey, objectKey, buffer, contentType }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = https.request(
      {
        hostname: 'storage.bunnycdn.com',
        method: 'PUT',
        path: `/${storageZone}/${objectKey}`,
        headers: {
          AccessKey: accessKey,
          'Content-Type': contentType,
          'Content-Length': buffer.length,
        },
      },
      (response) => {
        if (settled) {
          return;
        }
        if (response.statusCode === 201) {
          settled = true;
          resolve();
          return;
        }

        settled = true;
        reject(new AppError('CDN upload failed', 502));
      },
    );

    request.setTimeout(10_000, () => {
      if (settled) {
        return;
      }
      settled = true;
      request.destroy();
      reject(new AppError('CDN upload timeout', 504));
    });

    request.on('error', () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new AppError('CDN connection failed', 503));
    });

    request.write(buffer);
    request.end();
  });
}

async function uploadAvatar({ userId, originalName, buffer, mimeType }) {
  const { storageZone, accessKey, hostname } = requireCdnConfig();
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
  const safeExt = String(ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const objectKey = `avatars/user-${userId}-${Date.now()}.${safeExt || 'jpg'}`;

  await uploadBufferToBunny({
    storageZone,
    accessKey,
    objectKey,
    buffer,
    contentType: mimeType,
  });

  return {
    objectKey,
    url: `https://${hostname}/${objectKey}`,
  };
}

module.exports = {
  uploadAvatar,
};
