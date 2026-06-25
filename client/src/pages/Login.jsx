import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import logo from '../assets/otg-mark.png';

export default function Login() {
  const { user, login, booting } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('email'); // microsoft-style 2-step
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!booting && user) return <Navigate to="/" replace />;

  const next = (e) => {
    e.preventDefault();
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid work email.'); return; }
    setStep('password');
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(email.trim(), password);
      nav(u.mustChangePassword ? '/change-password' : '/', { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Origin Tech Group" />
          <div className="ll-text">
            <div className="login-org">Origin Tech Group</div>
            <div className="login-sub">Org-Ops Cloud ERP</div>
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={next} className="login-form">
            <h1 className="login-h">Sign in</h1>
            <p className="login-p">Use your Origin Tech Group work account.</p>
            <div className="field">
              <input
                className="input" type="email" autoFocus placeholder="someone@origingroupng.com"
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
              />
            </div>
            {err && <div className="error-text">{err}</div>}
            <p className="login-note">No account? Your System Administrator provisions access.</p>
            <div className="login-actions">
              <button className="btn btn-primary" type="submit">Next</button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submit} className="login-form">
            <button type="button" className="login-back" onClick={() => { setStep('email'); setErr(''); }}>
              ‹ {email}
            </button>
            <h1 className="login-h">Enter password</h1>
            <div className="field">
              <input
                className="input" type="password" autoFocus placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              />
            </div>
            {err && <div className="error-text">{err}</div>}
            <div className="login-actions">
              <button className="btn btn-primary" type="submit" disabled={busy || !password}>
                {busy ? <span className="spinner" /> : 'Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="login-footer">© {new Date().getFullYear()} Origin Tech Group · Org-Ops Cloud ERP</div>
    </div>
  );
}
