import { ApiError } from './error.js';
import { isValidSuite } from '../config/suites.js';

/** Require one of the given system roles (e.g. requireRole('super_admin')). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    if (!roles.includes(req.user.role))
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    next();
  };
}

/**
 * Gate a suite's API surface. This is the server-side enforcement of the core
 * rule: "if your account was not granted a suite, you cannot access it."
 * Reads the suite key from the route param `:suite` unless one is passed in.
 */
export function requireSuite(fixedKey) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    const key = fixedKey || req.params.suite;
    if (!isValidSuite(key)) return next(new ApiError(404, 'Unknown suite.'));
    if (!req.user.canAccess(key))
      return next(new ApiError(403, 'You have not been granted access to this suite.'));
    next();
  };
}
