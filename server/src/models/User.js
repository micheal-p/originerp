import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SUITE_KEYS, SUITE_ROLES } from '../config/suites.js';

/**
 * A granted suite: which module the user can open, and their role inside it.
 * Presence of the entry = access. Absence = blocked (the core requirement).
 */
const suiteGrantSchema = new mongoose.Schema(
  {
    key: { type: String, enum: SUITE_KEYS, required: true },
    role: { type: String, enum: SUITE_ROLES, default: 'member' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    jobTitle: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },

    // System-level role. super_admin = the System Admin who provisions accounts.
    role: { type: String, enum: ['super_admin', 'manager', 'staff'], default: 'staff', index: true },

    // Per-suite access grants. super_admin implicitly has all; everyone else is gated by this.
    suites: { type: [suiteGrantSchema], default: [] },

    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    ssoId: { type: String, default: null }, // Azure AD subject, when SSO is wired up later
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Email is unique per tenant, not globally (multi-tenant).
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** True if the user may open the given suite. */
userSchema.methods.canAccess = function (suiteKey) {
  if (this.role === 'super_admin') return true;
  return this.suites.some((s) => s.key === suiteKey);
};

/** Safe shape for API responses / JWT-adjacent client state. */
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    jobTitle: this.jobTitle,
    department: this.department,
    role: this.role,
    suites: this.suites.map((s) => ({ key: s.key, role: s.role })),
    status: this.status,
    mustChangePassword: this.mustChangePassword,
    lastLoginAt: this.lastLoginAt,
  };
};

export default mongoose.model('User', userSchema);
