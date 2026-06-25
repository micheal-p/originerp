import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSuite } from '../middleware/rbac.js';
import { getMe, getMySuites } from '../controllers/meController.js';
import { SUITES, getSuite } from '../config/suites.js';

const router = Router();

router.use(authenticate);

// Current user + their suite access map (drives the launcher).
router.get('/me', getMe);
router.get('/me/suites', getMySuites);

// Public catalog (authenticated) — names/descriptions only.
router.get('/catalog', (_req, res) => res.json({ suites: SUITES }));

/**
 * Gated suite entry point. Every suite's API will live under /suites/:suite/...
 * and pass through requireSuite — the server-side enforcement of access.
 * For now it returns a landing payload proving the gate works end-to-end.
 */
router.get('/suites/:suite', requireSuite(), (req, res) => {
  const meta = getSuite(req.params.suite);
  const grant = req.user.suites.find((g) => g.key === req.params.suite);
  res.json({
    suite: meta,
    access: {
      role: req.user.role === 'super_admin' ? 'manager' : grant?.role || 'member',
      enteredBy: req.user.email,
    },
  });
});

export default router;
