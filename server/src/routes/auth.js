import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, logout, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Throttle brute-force on login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many attempts. Try again later.' },
});

router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);

export default router;
