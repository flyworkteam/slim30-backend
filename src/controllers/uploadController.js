const { pool } = require('../config/db');
const { uploadAvatar } = require('../services/cdnService');
const AppError = require('../utils/appError');

async function uploadAvatarHandler(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('Avatar file is required', 400);
    }

    const userId = req.userId;

    const uploadResult = await uploadAvatar({
      userId,
      originalName: req.file.originalname || 'avatar.jpg',
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    await pool.execute(
      `INSERT INTO media_assets (user_id, asset_type, storage_key, cdn_url, mime_type, file_size, created_at)
       VALUES (?, 'avatar', ?, ?, ?, ?, NOW())`,
      [
        userId,
        uploadResult.objectKey,
        uploadResult.url,
        req.file.mimetype,
        req.file.size,
      ],
    );

    await pool.execute(
      `UPDATE users
       SET avatar_url = ?, updated_at = NOW()
       WHERE id = ?`,
      [uploadResult.url, userId],
    );

    res.status(201).json({
      success: true,
      data: {
        avatar_url: uploadResult.url,
        storage_key: uploadResult.objectKey,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadAvatarHandler,
};
