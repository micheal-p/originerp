import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGet } from '../api/client.js';
import { SUITE_META, tierLabel } from '../config/suites.js';
import AppLayout from '../components/AppLayout.jsx';
import SuiteIcon from '../components/SuiteIcon.jsx';
import ProductTour, { tourSeen } from '../components/ProductTour.jsx';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

function SuiteTile({ s, onOpen, index, reduce }) {
  const meta = SUITE_META[s.key] || {};
  // A coming-soon suite reads "Coming soon" for everyone — access hasn't
  // been granted to anyone because there's nothing to grant yet.
  const soon = s.status === 'soon';
  const locked = !soon && !s.granted;
  return (
    <motion.button
      className={`tile ${locked ? 'tile-locked' : ''} ${soon ? 'tile-soon' : ''}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.2, 0.7, 0.3, 1] }}
      whileHover={s.openable && !reduce ? { y: -5, transition: { duration: 0.2 } } : undefined}
      whileTap={s.openable ? { scale: 0.97 } : undefined}
      onClick={() => s.openable && onOpen(s)} disabled={!s.openable}
      title={locked ? 'You have not been granted access to this suite' : soon ? 'Coming soon' : `Open ${s.name}`}>
      <span className="tile-icon" style={{ background: locked ? 'rgba(10,14,26,0.28)' : meta.tint || 'var(--brand)' }}>
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
    </motion.button>
  );
}

export default function Launcher() {
  // First-run product tour (skippable, replayable from Help via /?tour=1)
  const [params] = useSearchParams();
  const [tour, setTour] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  const reduce = useReducedMotion();
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

  // Start the tour on a first visit (or ?tour=1 replay) once tiles exist.
  useEffect(() => {
    if (loading) return;
    if (params.get('tour') === '1' || !tourSeen(user?.id)) {
      const t = setTimeout(() => setTour(true), 600);
      return () => clearTimeout(t);
    }
  }, [loading]); // eslint-disable-line

  const TOUR_STEPS = [
    { title: 'Welcome to Collarone', body: `This is ${user?.org?.name || 'your company'}'s own workspace — every tool your team uses lives behind this one login. This quick tour shows you around; skip it anytime.` },
    { target: '[data-tour="tiles"]', title: 'Your suites', body: 'Each tile is a full suite — open any of them. Locked tiles are suites your admin hasn\'t switched on for you yet.' },
    { target: '[data-tour="search"]', title: 'Search everything', body: 'Find people, suites and admin pages from anywhere — start typing and jump straight there.' },
    { target: '[data-tour="waffle"]', title: 'Switch suites fast', body: 'The grid button hops between suites without going back home.' },
    { target: '[data-tour="account"]', title: 'Your profile', body: 'Your photo, phone, date of birth, home address and emergency contact live here — keep them current, HR uses them.' },
    { target: '[data-tour="org"]', title: 'You\'re in the right place', body: 'This chip always shows whose workspace you\'re in. Your company\'s data is completely isolated from every other company on Collarone.' },
    { title: 'That\'s the basics', body: 'Explore any suite — everything is built to be self-explanatory from here. Replay this tour anytime from the Help page.' },
  ];

  const core = suites.filter((s) => s.tier === 'core');
  const extended = suites.filter((s) => s.tier === 'extended');
  const grantedCount = suites.filter((s) => s.granted).length;

  return (
    <AppLayout breadcrumb={[{ label: 'Home' }]}>
      <motion.div
        className="home-hero"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
      >
        <p className="hk">{greeting()},</p>
        <h1>{user?.name?.split(' ')[0] || 'there'}</h1>
        <p>
          {isAdmin
            ? 'You have full access as System Administrator. Pick a suite or open the Admin Center.'
            : `You have access to ${grantedCount} suite${grantedCount === 1 ? '' : 's'}. Pick one to get started.`}
        </p>
      </motion.div>

      {err && <div className="error-text">{err}</div>}
      {loading ? (
        <div className="tile-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="tile tile-skeleton" />)}</div>
      ) : (
        <>
          <div className="suite-group">
            <div className="group-head"><h2>{tierLabel.core}</h2><span className="group-line" /></div>
            <div className="tile-grid" data-tour="tiles">{core.map((s, i) => <SuiteTile key={s.key} s={s} index={i} reduce={reduce} onOpen={(x) => nav(`/suite/${x.key}`)} />)}</div>
          </div>
          <div className="suite-group">
            <div className="group-head"><h2>{tierLabel.extended}</h2><span className="group-line" /></div>
            <div className="tile-grid">{extended.map((s, i) => <SuiteTile key={s.key} s={s} index={core.length + i} reduce={reduce} onOpen={(x) => nav(`/suite/${x.key}`)} />)}</div>
          </div>
        </>
      )}
          {tour && <ProductTour steps={TOUR_STEPS} userId={user?.id} onClose={() => setTour(false)} />}
    </AppLayout>
  );
}
