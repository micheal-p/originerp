import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  listUsers,
  createUser,
  updateUser,
  setUserSuites,
  setUserStatus,
  resetPassword,
} from '../controllers/userController.js';

const router = Router();

// Entire admin surface is System-Admin only.
router.use(authenticate, requireRole('super_admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.put('/:id/suites', setUserSuites);
router.patch('/:id/status', setUserStatus);
router.post('/:id/reset-password', resetPassword);

export default router;
