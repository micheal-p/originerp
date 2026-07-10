// Vercel serverless function — real health check, not a fabricated status.
// GET is safe to call anytime (used by the public /status page indirectly,
// and by anyone spot-checking). It only WRITES a row to status_checks when
// called with the header Vercel automatically attaches to Cron-triggered
// requests (Authorization: Bearer $CRON_SECRET) — set CRON_SECRET in the
// Vercel project env vars and configure the cron schedule in vercel.json for
// this to actually start recording history.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dxekronjsvnwmnbanlqh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  const startedAt = Date.now();
  let dbOk = false;

  try {
    if (SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      const { error } = await admin.from('organizations').select('id').limit(1);
      dbOk = !error;
    }
  } catch {
    dbOk = false;
  }

  const responseMs = Date.now() - startedAt;
  const apiOk = true; // this function executed, so the API itself is up
  const status = apiOk && dbOk ? 'operational' : dbOk ? 'degraded' : 'down';

  const isCron = CRON_SECRET && req.headers.authorization === `Bearer ${CRON_SECRET}`;
  if (isCron && SERVICE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    await admin.from('status_checks').insert({ api_ok: apiOk, db_ok: dbOk, response_ms: responseMs });
  }

  return res.status(200).json({ status, apiOk, dbOk, responseMs, checkedAt: new Date().toISOString() });
}
