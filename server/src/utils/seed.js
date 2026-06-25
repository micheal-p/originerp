import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';

const {
  MONGO_URI = 'mongodb://127.0.0.1:27017/org_ops_erp',
  SEED_TENANT_NAME = 'Origin Tech Group',
  SEED_TENANT_DOMAIN = 'origingroupng.com',
  SEED_ADMIN_EMAIL = 'admin@origingroupng.com',
  SEED_ADMIN_PASSWORD = 'ChangeMe!2026',
  SEED_ADMIN_NAME = 'System Administrator',
} = process.env;

async function run() {
  await connectDB(MONGO_URI);

  let tenant = await Tenant.findOne({ domain: SEED_TENANT_DOMAIN });
  if (!tenant) {
    tenant = await Tenant.create({ name: SEED_TENANT_NAME, domain: SEED_TENANT_DOMAIN });
    console.log(`[seed] created tenant "${tenant.name}" (${tenant.domain})`);
  } else {
    console.log(`[seed] tenant "${tenant.name}" already exists`);
  }

  const email = SEED_ADMIN_EMAIL.toLowerCase().trim();
  let admin = await User.findOne({ tenantId: tenant._id, email });
  if (!admin) {
    admin = new User({
      tenantId: tenant._id,
      name: SEED_ADMIN_NAME,
      email,
      role: 'super_admin',
      jobTitle: 'System Administrator',
      department: 'IT',
      mustChangePassword: true,
    });
    await admin.setPassword(SEED_ADMIN_PASSWORD);
    await admin.save();
    console.log(`[seed] created System Admin → ${email}  /  ${SEED_ADMIN_PASSWORD}`);
    console.log('[seed] ⚠ change this password immediately after first login.');
  } else {
    console.log(`[seed] System Admin ${email} already exists — left untouched`);
  }

  await mongoose.disconnect();
  console.log('[seed] done.');
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
