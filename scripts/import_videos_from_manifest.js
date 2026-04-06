require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const manifestPath = process.argv[2] || path.join(process.cwd(), 'video_upload_manifest.csv');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function toExerciseKey(storageKey) {
  const base = path.basename(storageKey, path.extname(storageKey));
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toDisplayName(sourceFile) {
  const base = path.basename(sourceFile, path.extname(sourceFile));
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function mimeFromStorageKey(storageKey) {
  const ext = path.extname(storageKey).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf8').trim();
  const lines = raw.split(/\r?\n/);
  if (lines.length <= 1) {
    throw new Error('Manifest is empty.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: '+00:00',
  });

  let processed = 0;

  try {
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 5) continue;

      const [sourceFile, convertedFile, storageKey, cdnUrl, status] = cols;
      if (status !== 'ok') continue;

      const exerciseKey = toExerciseKey(storageKey);
      const displayName = toDisplayName(sourceFile);
      const mimeType = mimeFromStorageKey(storageKey);

      let fileSize = null;
      try {
        if (convertedFile && fs.existsSync(convertedFile)) {
          fileSize = fs.statSync(convertedFile).size;
        }
      } catch (_) {
        fileSize = null;
      }

      await connection.query(
        `INSERT INTO exercise_video_assets
          (exercise_key, display_name, storage_key, cdn_url, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          storage_key = VALUES(storage_key),
          cdn_url = VALUES(cdn_url),
          mime_type = VALUES(mime_type),
          file_size = VALUES(file_size),
          updated_at = CURRENT_TIMESTAMP`,
        [exerciseKey, displayName, storageKey, cdnUrl, mimeType, fileSize],
      );

      processed += 1;
    }

    const [rows] = await connection.query('SELECT COUNT(*) AS total FROM exercise_video_assets');
    console.log(`Imported/updated rows from manifest: ${processed}`);
    console.log(`Total rows in exercise_video_assets: ${rows[0].total}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
