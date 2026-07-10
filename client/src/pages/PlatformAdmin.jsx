import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../api/client.js';
import { OTG_ORG_ID } from '../config/org.js';
import AppLayout from '../components/AppLayout.jsx';

const STATUS_LABEL = { pending_payment: 'Pending payment', active: 'Active', suspended: 'Suspended', cancelled: 'Cancelled' };
const naira = (kobo) => `₦${(kobo / 100).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const DAY_MS = 24 * 60 * 60 * 1000;

function DeleteOrgModal({ org, onClose, onConfirm, busy }) {
  const [text, setText] = useState('');
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>Delete {org.name}</h2>
          <button className="iconbtn dark" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
            This permanently deletes {org.name} — every staff account, the organization record, and its billing history. This cannot be undone.
          </p>
          <div className="field">
            <label>Type <strong>{org.slug}</strong> to confirm</label>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={org.slug} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn" style={{ background: '#c02b2b', color: '#fff' }} disabled={text !== org.slug || busy} onClick={onConfirm}>
              {busy ? <span className="spinner" /> : 'Delete permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlatformAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirming, setConfirming] = useState(null); // transaction id
  const [deleteTarget, setDeleteTarget] = useState(null); // org
  const [deleting, setDeleting] = useState(false);

  const flash = (msg, isErr) => { setToast({ msg, isErr }); setTimeout(() => setToast(null), 3200); };

  const load = () => {
    setLoading(true);
    Promise.all([apiGet('/platform/organizations'), apiGet('/platform/profiles'), apiGet('/platform/transactions')])
      .then(([o, p, t]) => { setOrgs(o.organizations); setProfiles(p.profiles); setTransactions(t.transactions); })
      .catch((e) => flash(e.message, true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const staffCountByOrg = useMemo(() => {
    const m = {};
    profiles.forEach((p) => { m[p.org_id] = (m[p.org_id] || 0) + 1; });
    return m;
  }, [profiles]);

  const activeLast24h = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    return profiles.filter((p) => p.last_login_at && new Date(p.last_login_at).getTime() > cutoff).length;
  }, [profiles]);

  const pendingTx = transactions.filter((t) => t.status === 'pending');
  const orgName = (id) => orgs.find((o) => o.id === id)?.name || id.slice(0, 8);

  const confirmPayment = async (txId) => {
    setConfirming(txId);
    try {
      await apiPost('/platform/confirm-payment', { transactionId: txId });
      flash('Payment confirmed — organization activated.');
      load();
    } catch (e) { flash(e.message, true); } finally { setConfirming(null); }
  };

  const deleteOrg = async () => {
    setDeleting(true);
    try {
      await apiPost('/platform/delete-org', { orgId: deleteTarget.id });
      flash(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      load();
    } catch (e) { flash(e.message, true); } finally { setDeleting(false); }
  };

  const stat = (label, value) => (
    <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 650, fontFamily: 'ui-monospace, monospace', marginTop: 6 }}>{value}</div>
    </div>
  );

  return (
    <AppLayout breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Platform Admin' }]} title="Platform Admin">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stat('Organizations', orgs.length)}
        {stat('Signed-up users', profiles.length)}
        {stat('Active in last 24h', activeLast24h)}
        {stat('Pending payments', pendingTx.length)}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -12, marginBottom: 24 }}>
        "Active in last 24h" is based on real sign-in timestamps, not live presence — there's no real-time online tracking yet.
        For page-visitor analytics, see Vercel's Web Analytics dashboard for this project. For uptime/status, that belongs on a dedicated monitoring service, not a number in here.
      </p>

      {pendingTx.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>Pending payments</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Organization</th><th>Type</th><th>Reference</th><th>Amount</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {pendingTx.map((t) => (
                  <tr key={t.id}>
                    <td>{orgName(t.org_id)}</td>
                    <td>{t.type === 'activation_fee' ? 'Activation fee' : 'Seat credits'}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{t.reference}</td>
                    <td>{naira(t.amount_kobo)}</td>
                    <td>{fmtDate(t.created_at)}</td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} disabled={confirming === t.id} onClick={() => confirmPayment(t.id)}>
                        {confirming === t.id ? <span className="spinner" /> : 'Confirm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>Organizations</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Handle</th><th>Plan</th><th>Status</th><th>Staff</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="td-empty">Loading…</td></tr>}
            {!loading && orgs.length === 0 && <tr><td colSpan={7} className="td-empty">No organizations yet.</td></tr>}
            {!loading && orgs.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{o.slug}</td>
                <td style={{ textTransform: 'capitalize' }}>{o.plan_tier}</td>
                <td><span className={`status-dot ${o.status === 'active' ? 'active' : 'disabled'}`} />{STATUS_LABEL[o.status] || o.status}</td>
                <td>{staffCountByOrg[o.id] || 0}</td>
                <td>{fmtDate(o.created_at)}</td>
                <td>
                  {o.id !== OTG_ORG_ID && (
                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, color: '#c02b2b', borderColor: '#e7b8b8' }} onClick={() => setDeleteTarget(o)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteOrgModal org={deleteTarget} busy={deleting} onClose={() => setDeleteTarget(null)} onConfirm={deleteOrg} />
      )}
      {toast && <div className={`toast ${toast.isErr ? 'error' : ''}`}>{toast.msg}</div>}
    </AppLayout>
  );
}
