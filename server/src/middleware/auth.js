import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from './error.js';

/**
 * Authenticate the request from the Bearer access token, load the user, and
 * attach both `req.user` (the Mongoose doc) and `req.auth` (decoded token).
 * Also enforces tenant scoping — the user's tenantId is the only one in play.
 */
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required.');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Session expired or invalid. Please sign in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw new ApiError(401, 'Account is inactive.');

    req.user = user;
    req.auth = payload;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    next(err);
  }
}
