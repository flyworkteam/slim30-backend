const multer = require('multer');
const AppError = require('../utils/appError');

const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    void req;
    if (!allowedMimes.has(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG and WEBP are allowed', 400));
    }

    return cb(null, true);
  },
});

module.exports = {
  upload,
};
