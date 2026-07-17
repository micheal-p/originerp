// ============================================================================
// Collarone assistant — landing-page AI chat endpoint (stub).
//
// The floating "Chat with us" widget on the landing page calls this. The AI
// provider integration (OpenAI batch credits) is implemented by the platform
// owner — this stub documents the contract and ships the FULL knowledge pack
// the model should be grounded in, so wiring it up is only the API call.
//
// CONTRACT (what client/src/pages/ChatWidget.jsx sends and expects):
//
//   POST /api/chat
//   Body: { messages: [{ role: 'user' | 'assistant', content: '<text>' }, ...] }
//         (full conversation so far, oldest first, max ~20 turns, each ≤1000 chars)
//   200 → { reply: '<assistant text>', suggestHuman: <boolean> }
//         suggestHuman: true when the visitor should be handed to a person
//         (pricing negotiation, complaints, partnership, anything unsure) —
//         the widget then shows the WhatsApp/call/contact card under the reply.
//   4xx/5xx → { error: '<message>' } — the widget shows a friendly fallback
//         plus the human-contact card, so a failure is never a dead end.
//
// IMPLEMENTATION NOTES for the real version:
//   - Ground the model with SYSTEM_PROMPT + KNOWLEDGE below (this corpus is
//     small enough to inject whole — no vector store needed; keep it updated).
//   - Never let it invent prices, dates or features not in KNOWLEDGE.
//   - Rate-limit by IP (this endpoint is public and unauthenticated).
//   - Keep replies under ~120 words, warm Nigerian business English.
//   - Set suggestHuman when the user asks for a person, a discount, support
//     on an existing account, or anything KNOWLEDGE cannot answer.
// ============================================================================

export const SYSTEM_PROMPT = `You are the Collarone assistant on collarone.app — warm, sharp, straight-talking Nigerian business English. You help visitors understand Collarone and decide to sign up. Answer ONLY from the knowledge provided; if something isn't covered, say so plainly and offer the human team. Keep replies short (under 120 words), conversational, no bullet-point walls unless asked. Never invent prices, discounts or launch dates. When the visitor asks to talk to someone, wants a custom deal, has an account problem, or you can't help — say you'll connect them and set suggestHuman true.`;

export const KNOWLEDGE = `
WHAT COLLARONE IS
Collarone is the business platform for Nigerian companies: HR, payroll, CRM, finance and more — 16 live suites behind one login, priced and billed in naira. A company signs up, gets its own isolated workspace, and turns on whichever suites it needs. Staff accounts are created by the company's own admin (no public staff signup). Every company's data is isolated from every other company's at the database level, and every screen checks the viewer's role.

THE 16 SUITES
Core: HR & Staff, Leave Management, Task & Report, Visitor Management, Payroll, CRM.
Extended: Time & Attendance, Benefits, IT Assets, Procurement, Inventory, Finance, Projects, Documents, Trade Documents, Automation.

FLAGSHIP FEATURES
- Employee 360: click any staff member and see pay, leave, attendance, assets, documents, reviews and cases on one page.
- HR Letters engine: confirmation, promotion, introduction, verification, query and warning letters — written manually, from templates, or drafted by Collarone AI — rendered live on the company's own letterhead (8 templates or an uploaded letterhead, with logo and authorized signature), auto-numbered, and filed into Documents automatically.
- Probation flow: probation end dates trigger a confirm/extend/exit decision; confirming generates the letter.
- Disciplinary flow: query letter → written response → outcome — the proper fair-hearing sequence.
- HR analytics: headcount, attrition, tenure, hiring trend, work anniversaries, and statutory compliance (pension/HMO coverage; group life is a legal requirement at 5+ staff under the Pension Reform Act).
- Payroll: Nigerian PAYE, Pension, NHF, NSITF; payslips; a Banking Wall for whoever liaises with the bank. Collarone never touches the company's bank account — it prepares the instruction, their bank executes it. Payroll is available to Nigerian-registered companies.
- CRM: contacts, companies, WhatsApp-first activity log, a deals pipeline valued in naira with follow-up reminders, and a Messages inbox fed by the company's website forms.
- Website: every tier includes a website builder (10 themes: online store with cart + bank-transfer/pay-on-delivery checkout, landing pages, company profiles). Companies that already have a website just link it instead.
- Jobs: every company gets a public careers page (collarone.app/careers/their-handle) and all open roles also appear on the platform-wide board at collarone.app/jobs. Candidates apply with no account.

PRICING (all naira, billed in Nigeria, no forex markup; rate locks at sign-up)
Every tier is à la carte — pick any suites:
- Startup: ₦15,000/month, 3 suites included, extra suites ₦8,000/month each.
- Standard: ₦25,000/month, 5 suites included, extra suites ₦6,000/month each.
- Enterprise: ₦45,000/month, 8 suites included, extra suites ₦4,000/month each; custom work can be scoped on request.
Every tier adds ₦2,000 per staff member per month. Paying yearly saves 15%. There is a price calculator on the pricing section of the homepage.

SIGNING UP / ACTIVATION
Sign up at collarone.app/signup: pick a plan, name the company and choose a handle (their workspace lives at handle.collarone.app), say whether they already have a website, brand the space, create the admin account. During early access, payment is confirmed personally — the visitor WhatsApps their reference to 0814 812 8551 and the space is activated the same day. Promo codes exist for trials and discounts.

SECURITY & TRUST
One isolated workspace per company, enforced in the database (row-level security), verified directly. Role checks on every screen. Payroll is instruction-only (no funds held). Built, supported and priced in Nigeria.

CONTACT / HUMANS
WhatsApp and phone: 0814 812 8551 (fastest). Contact form: collarone.app/contact — messages land in the team's inbox and are answered from there. Founder: Aniebiet Pius, Nigeria.

HONEST LIMITS (do not oversell)
- Automated SMS/email reminders are not live yet; in-app reminders and tasks are.
- Some AI features are rolling out progressively.
- Social media (Instagram/Facebook DM) inboxes are not integrated.
If asked about anything not listed here, offer the human team instead of guessing.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // AI provider not wired yet — the widget shows a warm fallback plus the
  // human-contact card, so visitors are never stuck.
  return res.status(501).json({
    error: 'assistant_not_configured',
  });
}
