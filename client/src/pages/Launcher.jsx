import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGet } from '../api/client.js';
import { SUITE_META, tierLabel } from '../config/suites.js';
import AppLayout from '../components/AppLayout.jsx';
import SuiteIcon from '../components/SuiteIcon.jsx';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

function SuiteTile({ s, onOpen }) {
  const meta = SUITE_META[s.key] || {};
  const locked = !s.granted;
  const soon = s.granted && s.status === 'soon';
  return (
    <button className={`tile ${locked ? 'tile-locked' : ''} ${soon ? 'tile-soon' : ''}`}
      onClick={() => s.openable && onOpen(s)} disabled={!s.openable}
      title={locked ? 'You have not been granted access to this suite' : soon ? 'Coming soon' : `Open ${s.name}`}>
      <span className="tile-icon" style={{ background: locked ? '#c8c6c4' : meta.tint || 'var(--brand)' }}>
        <SuiteIcon name={locked ? 'lock' : meta.icon || 'grid'} size={26} color="#fff" />
      </span>
      <span className="tile-body">
        <span className="tile-name">{s.name}</span>
        <span className="tile-desc">{s.desc}</span>
      </span>
      <span className="tile-foot">
        {locked && <span className="badge badge-soon">No access</span>}
        {soon && <span className="badge badge-soon">Coming soon</span>}
        {s.openable && s.suiteRole === 'manager' && <span className="badge badge-core">Manager</span>}
        {s.openable && s.suiteRole === 'member' && <span className="badge badge-admin">Member</span>}
      </span>
    </button>
  );
}

export default function Launcher() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [suites, setSuites] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet('/me/suites')
      .then((d) => { setSuites(d.suites); setIsAdmin(d.isSystemAdmin); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const core = suites.filter((s) => s.tier === 'core');
  const extended = suites.filter((s) => s.tier === 'extended');
  const grantedCount = suites.filter((s) => s.granted).length;

  return (
    <AppLayout breadcrumb={[{ label: 'Home' }]}>
      <div className="home-hero">
        <p className="hk">{greeting()},</p>
        <h1>{user?.name?.split(' ')[0] || 'there'}</h1>
        <p>
          {isAdmin
            ? 'You have full access as System Administrator. Pick a suite or open the Admin Center.'
            : `You have access to ${grantedCount} suite${grantedCount === 1 ? '' : 's'}. Pick one to get started.`}
        </p>
      </div>

      {err && <div className="error-text">{err}</div>}
      {loading ? (
        <div className="tile-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="tile tile-skeleton" />)}</div>
      ) : (
        <>
          <div className="suite-group">
            <div className="group-head"><h2>{tierLabel.core}</h2><span className="group-line" /></div>
            <div className="tile-grid">{core.map((s) => <SuiteTile key={s.key} s={s} onOpen={(x) => nav(`/suite/${x.key}`)} />)}</div>
          </div>
          <div className="suite-group">
            <div className="group-head"><h2>{tierLabel.extended}</h2><span className="group-line" /></div>
            <div className="tile-grid">{extended.map((s) => <SuiteTile key={s.key} s={s} onOpen={(x) => nav(`/suite/${x.key}`)} />)}</div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
