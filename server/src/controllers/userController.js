import User from '../models/User.js';
import { ApiError } from '../middleware/error.js';
import { audit } from '../utils/audit.js';
import { SUITE_KEYS, SUITE_ROLES } from '../config/suites.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate + normalise a suite-grants array coming from the admin UI. */
function cleanSuites(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const g of input) {
    const key = g?.key;
    if (!SUITE_KEYS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, role: SUITE_ROLES.includes(g?.role) ? g.role : 'member' });
  }
  return out;
}

// GET /users  (System Admin) — list staff in the tenant
export async function listUsers(req, res, next) {
  try {
    const { q, role, suite } = req.query;
    const filter = { tenantId: req.user.tenantId };
    if (role) filter.role = role;
    if (suite) filter['suites.key'] = suite;
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { department: rx }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json({ users: users.map((u) => u.toPublic()) });
  } catch (err) {
    next(err);
  }
}

// POST /users  (System Admin) — provision a new staff account
export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'staff', jobTitle = '', department = '', suites = [] } =
      req.body || {};

    if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required.');
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Enter a valid email address.');
    if (password.length < 8) throw new ApiError(400, 'Temporary password must be at least 8 characters.');
    if (!['super_admin', 'manager', 'staff'].includes(role)) throw new ApiError(400, 'Invalid role.');

    const normEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ tenantId: req.user.tenantId, email: normEmail });
    if (exists) throw new ApiError(409, 'A user with this email already exists.');

    const user = new User({
      tenantId: req.user.tenantId,
      name: name.trim(),
      email: normEmail,
      role,
      jobTitle,
      department,
      suites: role === 'super_admin' ? [] : cleanSuites(suites),
      mustChangePassword: true,
    });
    await user.setPassword(password);
    await user.save();

    audit(req, 'user.create', { target: user.email, meta: { role, suites: user.suites.map((s) => s.key) } });
    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// PATCH /users/:id  (System Admin) — update profile/role
export async function updateUser(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!user) throw new ApiError(404, 'User not found.');

    const { name, jobTitle, department, role } = req.body || {};
    if (name !== undefined) user.name = name.trim();
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (department !== undefined) user.department = department;
    if (role !== undefined) {
      if (!['super_admin', 'manager', 'staff'].includes(role)) throw new ApiError(400, 'Invalid role.');
      user.role = role;
    }
    await user.save();
    audit(req, 'user.update', { target: user.email });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// PUT /users/:id/suites  (System Admin) — replace a user's suite grants
export async function setUserSuites(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!user) throw new ApiError(404, 'User not found.');

    user.suites = cleanSuites(req.body?.suites);
    await user.save();
    audit(req, 'user.suites.update', { target: user.email, meta: { suites: user.suites.map((s) => s.key) } });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// PATCH /users/:id/status  (System Admin) — enable / disable account
export async function setUserStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!['active', 'disabled'].includes(status)) throw new ApiError(400, 'Invalid status.');
    if (String(req.params.id) === String(req.user._id))
      throw new ApiError(400, 'You cannot change your own account status.');

    const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!user) throw new ApiError(404, 'User not found.');
    user.status = status;
    await user.save();
    audit(req, 'user.status', { target: user.email, meta: { status } });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

// POST /users/:id/reset-password  (System Admin) — set a new temporary password
export async function resetPassword(req, res, next) {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 8) throw new ApiError(400, 'Temporary password must be at least 8 characters.');

    const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!user) throw new ApiError(404, 'User not found.');
    await user.setPassword(password);
    user.mustChangePassword = true;
    await user.save();
    audit(req, 'user.password.reset', { target: user.email });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
