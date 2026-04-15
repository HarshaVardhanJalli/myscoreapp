/**
 * User Routes
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/search', authenticate, (req, res, next) => userController.searchUsers(req, res, next));
router.get('/me', authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.put('/me', authenticate, (req, res, next) => userController.updateProfile(req, res, next));
router.put('/me/push-token', authenticate, (req, res, next) => userController.updatePushToken(req, res, next));
router.get('/me/subscription', authenticate, (req, res, next) => userController.getSubscription(req, res, next));
router.post('/me/subscribe', authenticate, (req, res, next) => userController.subscribe(req, res, next));
router.get('/me/notifications', authenticate, (req, res, next) => userController.getNotifications(req, res, next));
router.put('/me/notifications/read', authenticate, (req, res, next) => userController.markNotificationsRead(req, res, next));
router.put('/me/notifications/:notificationId/read', authenticate, (req, res, next) => userController.markNotificationsRead(req, res, next));

router.get('/:id', optionalAuth, (req, res, next) => userController.getProfile(req, res, next));
router.post('/:id/follow', authenticate, (req, res, next) => userController.follow(req, res, next));
router.delete('/:id/follow', authenticate, (req, res, next) => userController.unfollow(req, res, next));
router.get('/:id/followers', optionalAuth, (req, res, next) => userController.getFollowers(req, res, next));
router.get('/:id/following', optionalAuth, (req, res, next) => userController.getFollowing(req, res, next));

export default router;
