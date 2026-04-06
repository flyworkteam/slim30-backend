const express = require('express');
const { uploadAvatarHandler } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);
router.post('/avatar', upload.single('avatar'), uploadAvatarHandler);

module.exports = router;
