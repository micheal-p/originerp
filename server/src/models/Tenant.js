import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, lowercase: true, trim: true, unique: true },
    subscriptionPlan: { type: String, enum: ['trial', 'standard', 'enterprise'], default: 'enterprise' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    // Suites this tenant has purchased/enabled. Empty = all suites available to grant.
    enabledSuites: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Tenant', tenantSchema);
