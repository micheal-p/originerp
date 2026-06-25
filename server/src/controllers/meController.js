import { SUITES } from '../config/suites.js';

// GET /me  → current user profile
export async function getMe(req, res) {
  res.json({ user: req.user.toPublic() });
}

/**
 * GET /me/suites → the full catalog annotated with this user's access, so the
 * launcher can render every tile and grey out the ones they can't open.
 */
export async function getMySuites(req, res) {
  const user = req.user;
  const tiles = SUITES.map((s) => {
    const grant = user.suites.find((g) => g.key === s.key);
    const granted = user.role === 'super_admin' || Boolean(grant);
    return {
      ...s,
      granted,
      suiteRole: user.role === 'super_admin' ? 'manager' : grant?.role || null,
      // openable only if granted AND the suite is live
      openable: granted && s.status === 'live',
    };
  });
  res.json({ suites: tiles, isSystemAdmin: user.role === 'super_admin' });
}
