import AuditLog from '../models/AuditLog.js';

/** Fire-and-forget audit write. Never blocks the request path. */
export function audit(req, action, { target = '', meta = {}, userId, tenantId } = {}) {
  const entry = {
    action,
    target,
    meta,
    userId: userId ?? req?.user?.id ?? null,
    tenantId: tenantId ?? req?.user?.tenantId ?? null,
    ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
  };
  AuditLog.create(entry).catch((e) => console.warn('[audit] write failed:', e.message));
}
