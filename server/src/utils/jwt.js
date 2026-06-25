import jwt from 'jsonwebtoken';

const {
  JWT_SECRET = 'dev-access-secret',
  JWT_REFRESH_SECRET = 'dev-refresh-secret',
  JWT_ACCESS_TTL = '1h',
  JWT_REFRESH_TTL = '7d',
} = process.env;

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), tenantId: String(user.tenantId), role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id), tenantId: String(user.tenantId) }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_TTL,
  });
}

export const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);
