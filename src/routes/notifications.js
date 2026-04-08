const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  validateSettingsPayload,
  validateCreateNotificationPayload,
  validateNotificationIdParams,
  validateNotificationListQuery,
} = require('../validation/notificationValidation');
const {
  getNotificationSettings,
  updateNotificationSettings,
  listNotifications,
  createNotificationForUser,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationForUser,
  deleteAllNotificationsForUser,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(requireAuth);

router.get('/settings', getNotificationSettings);
router.put('/settings', validateRequest({ body: validateSettingsPayload }), updateNotificationSettings);
router.get('/', validateRequest({ query: validateNotificationListQuery }), listNotifications);
router.post('/', validateRequest({ body: validateCreateNotificationPayload }), createNotificationForUser);
router.delete('/', deleteAllNotificationsForUser);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', validateRequest({ params: validateNotificationIdParams }), markNotificationRead);
router.delete('/:id', validateRequest({ params: validateNotificationIdParams }), deleteNotificationForUser);

module.exports = router;
