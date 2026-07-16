import { useState } from 'react';
import { LegalNav, LegalFooter } from './LegalChrome.jsx';
import { apiPost } from '../api/client.js';
import './Legal.css';

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim()) return setError('Your name is required.');
    if (!f.email.trim() && !f.phone.trim()) return setError('An email or phone number is required so we can reply.');
    if (!f.message.trim()) return setError('Tell us a bit about what you need.');
    setBusy(true);
    try {
      await apiPost('/contact', f);
      setSent(true);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg">
      <LegalNav />

      <div className="lg-body">
        <p className="lg-kicker">Get in touch</p>
        <h1 className="lg-h1">Contact us</h1>
        <p className="lg-updated">We read every message personally — expect a reply the same working day.</p>

        {sent ? (
          <div style={{ background: 'var(--accent-soft, #FFF1EA)', border: '1px solid rgba(255,91,31,0.25)', borderRadius: 14, padding: '24px 26px', marginTop: 28 }}>
            <strong style={{ display: 'block', fontSize: 16, marginBottom: 6 }}>Message sent.</strong>
            <p style={{ margin: 0 }}>Thanks, {f.name.split(' ')[0]} — we'll get back to you shortly. In a hurry? <a href="https://wa.me/2348148128551" target="_blank" rel="noreferrer">WhatsApp us</a> instead.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <div className="field"><label>Name *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required autoFocus /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@company.com" /></div>
            <div className="field"><label>Phone / WhatsApp</label><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0801 234 5678" /></div>
            <div className="field"><label>Company</label><input className="input" value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
            <div className="field"><label>Message *</label><textarea className="input" rows={5} value={f.message} onChange={(e) => set('message', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} required /></div>
            {error && <p style={{ color: '#C0392B', fontSize: 13.5, margin: 0 }}>{error}</p>}
            <button className="btn btn-primary" disabled={busy} style={{ alignSelf: 'flex-start', padding: '11px 26px' }}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 40, fontSize: 14, color: 'rgba(10,14,26,0.6)' }}>
          Prefer a faster channel? <a href="https://wa.me/2348148128551" target="_blank" rel="noreferrer">WhatsApp 0814 812 8551</a> or <a href="mailto:hello@collarone.app">hello@collarone.app</a>.
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
