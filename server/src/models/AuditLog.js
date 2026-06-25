import mongoose from 'mongoose';

// Security baseline (FRD §4): track UserID, Action, Timestamp, IP.
const auditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true }, // e.g. 'auth.login', 'user.create', 'user.suites.update'
    target: { type: String, default: '' },     // affected entity id / email
    meta: { type: Object, default: {} },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export default mongoose.model('AuditLog', auditLogSchema);
