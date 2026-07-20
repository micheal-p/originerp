// Shared domain types for Collarone.
//
// This is the incremental-TypeScript seam: plain .js files stay as they are,
// but the money model, the API layer, and anything that opts in with `@ts-check`
// pull their shapes from here so the compiler catches drift. Import extensionless
// (`from '../types'`) so both Vite and tsc resolve it regardless of a file's own
// extension.

export type PlanKey = 'startup' | 'standard' | 'enterprise';

export interface Plan {
  key: PlanKey;
  name: string;
  /** Fixed monthly platform fee in naira, before per-suite and per-staff charges. */
  baseFee: number;
  /** How many suites the base fee already covers. */
  includedSuites: number;
  /** Naira per month for each suite beyond `includedSuites`. */
  extraSuiteFee: number;
  /** Human-readable one-line summary used in marketing/chat copy. */
  price: string;
}

export type SuiteStatus = 'live' | 'soon';
export type OrgStatus = 'active' | 'pending' | 'suspended';
export type ProfileStatus = 'active' | 'invited' | 'disabled';
export type UserRole = 'super_admin' | 'manager' | 'staff';

/** A single suite grant on a user: which suite, and their role within it. */
export interface SuiteGrant {
  key: string;
  role: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  planTier: PlanKey | string;
  themeColor: string | null;
  logoUrl: string | null;
  status: OrgStatus | string;
  suitesEnabled?: unknown;
  websiteType?: string;
  externalWebsiteUrl?: string;
  country: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  jobTitle: string;
  department: string;
  departmentId: string | null;
  role: UserRole | string;
  suites: SuiteGrant[];
  status: ProfileStatus | string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  phone: string;
  whatsapp: string;
  avatarUrl: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  startDate: string;
  employmentType: string;
  managerId: string | null;
  probationEndDate: string;
  confirmedAt: string | null;
  stateOfResidence: string;
  org?: Org;
  isPlatformAdmin?: boolean;
}

/** Envelope returned by the auth endpoints (/auth/login, /auth/refresh, /me). */
export interface AuthResult {
  accessToken: string;
  user: User;
}
