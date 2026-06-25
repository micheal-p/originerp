/**
 * Suite catalog — the single source of truth for every module in the platform.
 * The client mirrors this list (client/src/config/suites.js) for rendering tiles,
 * but the SERVER is authoritative for access decisions.
 *
 * `key`      stable identifier used in user grants, routes and API scopes
 * `tier`     "core" (MVP) | "extended" (post-MVP)
 * `status`   "live" (usable now) | "soon" (tile shows, entry blocked)
 */
export const SUITES = [
  { key: 'hr',          name: 'HR & Staff',        tier: 'core',     status: 'live', desc: 'Employee records, org structure, onboarding.' },
  { key: 'leave',       name: 'Leave Management',  tier: 'core',     status: 'live', desc: 'Requests, approvals and balance tracking.' },
  { key: 'tasks',       name: 'Task & Report',     tier: 'core',     status: 'live', desc: 'Assignments, priorities and productivity reports.' },
  { key: 'visitors',    name: 'Visitor Management', tier: 'core',    status: 'live', desc: 'Front-desk check-in, host alerts, visitor logs.' },
  { key: 'it-assets',   name: 'IT Assets',         tier: 'extended', status: 'soon', desc: 'Asset tracking, assignment and lifecycle.' },
  { key: 'procurement', name: 'Procurement',       tier: 'extended', status: 'soon', desc: 'Purchase requests, vendors and approvals.' },
  { key: 'inventory',   name: 'Inventory',         tier: 'extended', status: 'soon', desc: 'Stock levels, low-stock alerts, warehouses.' },
  { key: 'finance',     name: 'Finance',           tier: 'extended', status: 'soon', desc: 'Expenses, budgets and financial reports.' },
  { key: 'projects',    name: 'Projects',          tier: 'extended', status: 'soon', desc: 'Milestones, boards and collaboration.' },
  { key: 'documents',   name: 'Documents',         tier: 'extended', status: 'soon', desc: 'Secure storage, versioning, permissions.' },
];

export const SUITE_KEYS = SUITES.map((s) => s.key);

/** Per-suite roles a granted user can hold (drives Manager vs Staff dashboards). */
export const SUITE_ROLES = ['manager', 'member'];

export const isValidSuite = (key) => SUITE_KEYS.includes(key);

export const getSuite = (key) => SUITES.find((s) => s.key === key) || null;
