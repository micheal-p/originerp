import User from '../models/User.js';
import { ApiError } from '../middleware/error.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { audit } from '../utils/audit.js';

const REFRESH_COOKIE = 'oo_refresh';
const isProd = process.env.NODE_ENV === 'production';

const refreshCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function issueSession(res, user) {
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOpts);
  return { accessToken: signAccessToken(user), user: user.toPublic() };
}

// POST /auth/login  { email, password }
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required.');

    // Need passwordHash (select:false by default).
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
    const ok = user && (await user.verifyPassword(password));
    if (!ok) {
      audit(req, 'auth.login.failed', { target: email });
      throw new ApiError(401, 'Incorrect email or password.');
    }
    if (user.status !== 'active') throw new ApiError(403, 'Your account has been disabled.');

    user.lastLoginAt = new Date();
    await user.save();
    audit(req, 'auth.login', { userId: user._id, tenantId: user.tenantId, target: user.email });

    res.json(issueSession(res, user));
  } catch (err) {
    next(err);
  }
}

// POST /auth/refresh  (refresh token from httpOnly cookie)
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, 'No active session.');

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw new ApiError(401, 'Account is inactive.');

    res.json(issueSession(res, user));
  } catch (err) {
    next(err);
  }
}

// POST /auth/logout
export async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOpts, maxAge: undefined });
  res.json({ ok: true });
}

// POST /auth/change-password  { currentPassword, newPassword }  (authenticated)
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8)
      throw new ApiError(400, 'New password must be at least 8 characters.');

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.verifyPassword(currentPassword || '')))
      throw new ApiError(401, 'Current password is incorrect.');

    await user.setPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
    audit(req, 'auth.password.change', { target: user.email });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
