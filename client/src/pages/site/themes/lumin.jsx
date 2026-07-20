import { useContext, useEffect } from 'react';
import { CartProvider, CartButton, CartDrawer, CartCtx, Block } from '../siteLayouts.jsx';

// =============================================================================
// Lumin — a modern editorial storefront. NOT the shared 3-layout skeleton:
// its own sticky nav, a product-forward hero, a value marquee, a custom product
// grid with a hover-reveal add-to-cart, and a columned footer. Reuses the real
// cart + Paystack/transfer/COD checkout via the shared commerce engine.
// =============================================================================

export const meta = {
  key: 'lumin-store',
  name: 'Lumin',
  category: 'ecommerce',
  description: 'A bold, image-led storefront with a clean sticky nav and a hover-reveal product grid.',
  accent: '#E0500F',
  fonts: 'Bricolage Grotesque + Inter',
};

const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// One tuned variant so the shared Block renderer (used for content blocks like
// text / features / testimonials / faq / contact) matches Lumin's rhythm.
const V = {
  hero: 'full', card: 'rounded', btnRadius: 10, navCaps: false, narrow: false,
  display: 1.06, headingWeight: 700, h2Mode: 'left-kicker', band: 'none',
  secPad: 76, ctaMode: 'accent', footerMode: 'columns',
};

function LuminStyle({ accent }) {
  const css = `
  .lm-root { --lm-accent:${accent}; --site-accent:${accent}; --site-accent-ui:${accent}; --site-accent-dark:${accent};
    --site-bg:#fbfaf7; --site-fg:#16130f; --site-muted:#6b6660; --site-surface:#f2efe9; --site-line:#e6e1d8;
    --site-font:'Inter',system-ui,sans-serif; --site-font-display:'Bricolage Grotesque','Inter',sans-serif;
    background:var(--site-bg); color:var(--site-fg); min-height:100vh; font-family:var(--site-font); }
  .lm-nav { position:sticky; top:0; z-index:30; display:flex; align-items:center; gap:20px;
    padding:16px clamp(18px,4vw,44px); background:rgba(251,250,247,0.82); backdrop-filter:saturate(1.4) blur(12px);
    border-bottom:1px solid var(--site-line); }
  .lm-word { font-family:var(--site-font-display); font-weight:800; font-size:21px; letter-spacing:-0.02em; display:flex; align-items:center; gap:10px; }
  .lm-links { display:flex; align-items:center; gap:26px; margin-left:auto; }
  .lm-link { font-size:14px; font-weight:500; color:var(--site-fg); text-decoration:none; opacity:.8; transition:opacity .15s; position:relative; }
  .lm-link:hover, .lm-link.on { opacity:1; }
  .lm-link.on::after { content:''; position:absolute; left:0; right:0; bottom:-6px; height:2px; background:var(--lm-accent); }
  .lm-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--lm-accent); color:#fff;
    border:none; border-radius:100px; padding:13px 26px; font:inherit; font-weight:650; font-size:14.5px; cursor:pointer; text-decoration:none;
    transition:transform .15s ease, box-shadow .15s ease; }
  .lm-btn:hover { transform:translateY(-2px); box-shadow:0 10px 24px color-mix(in srgb, var(--lm-accent) 40%, transparent); }
  .lm-btn.ghost { background:transparent; color:var(--site-fg); border:1.5px solid var(--site-line); }
  .lm-hero { padding:clamp(48px,7vw,96px) clamp(18px,4vw,44px); display:grid; gap:44px; align-items:center; grid-template-columns:1.05fr 0.95fr; max-width:1200px; margin:0 auto; }
  .lm-hero.solo { grid-template-columns:1fr; text-align:center; max-width:820px; }
  .lm-eyebrow { font-size:12px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--lm-accent); margin-bottom:18px; }
  .lm-h1 { font-family:var(--site-font-display); font-weight:800; font-size:clamp(38px,6vw,68px); line-height:1.02; letter-spacing:-0.025em; margin:0 0 20px; text-wrap:balance; }
  .lm-sub { font-size:clamp(16px,2vw,18.5px); line-height:1.6; color:var(--site-muted); max-width:46ch; margin:0 0 30px; }
  .lm-hero.solo .lm-sub { margin-left:auto; margin-right:auto; }
  .lm-shot { position:relative; aspect-ratio:4/5; border-radius:22px; overflow:hidden; background:var(--site-surface); box-shadow:0 30px 60px rgba(22,19,15,0.14); }
  .lm-shot img { width:100%; height:100%; object-fit:cover; display:block; }
  .lm-marquee { overflow:hidden; border-block:1px solid var(--site-line); background:var(--site-fg); color:var(--site-bg); }
  .lm-mtrack { display:flex; gap:52px; padding:13px 0; white-space:nowrap; width:max-content; animation:lm-scroll 26s linear infinite; }
  .lm-mtrack span { font-size:13px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; display:inline-flex; align-items:center; gap:52px; }
  @keyframes lm-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .lm-sec { max-width:1120px; margin:0 auto; padding:clamp(52px,6vw,84px) clamp(18px,4vw,44px); }
  .lm-h2 { font-family:var(--site-font-display); font-weight:800; font-size:clamp(26px,3.4vw,38px); letter-spacing:-0.02em; margin:0 0 6px; }
  .lm-krule { width:46px; height:3px; background:var(--lm-accent); border-radius:2px; margin:14px 0 30px; }
  .lm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:26px; }
  .lm-pcard { border-radius:18px; overflow:hidden; background:#fff; border:1px solid var(--site-line); transition:transform .18s ease, box-shadow .18s ease; }
  .lm-pcard:hover { transform:translateY(-4px); box-shadow:0 18px 40px rgba(22,19,15,0.12); }
  .lm-pimg { aspect-ratio:1/1; overflow:hidden; background:var(--site-surface); position:relative; }
  .lm-pimg img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s ease; }
  .lm-pcard:hover .lm-pimg img { transform:scale(1.06); }
  .lm-padd { position:absolute; left:12px; right:12px; bottom:12px; opacity:0; transform:translateY(8px); transition:all .2s ease; }
  .lm-pcard:hover .lm-padd { opacity:1; transform:none; }
  .lm-pbody { padding:15px 16px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .lm-pname { font-weight:600; font-size:14.5px; }
  .lm-pprice { font-weight:700; font-size:14px; color:var(--lm-accent); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .lm-foot { border-top:1px solid var(--site-line); background:var(--site-surface); padding:52px clamp(18px,4vw,44px) 30px; }
  .lm-foot-in { max-width:1120px; margin:0 auto; display:flex; flex-wrap:wrap; gap:32px; justify-content:space-between; }
  .lm-foot-copy { max-width:1120px; margin:28px auto 0; padding-top:22px; border-top:1px solid var(--site-line); font-size:12.5px; color:var(--site-muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  @media (max-width:820px){ .lm-hero{ grid-template-columns:1fr; text-align:center } .lm-hero .lm-sub{margin-inline:auto} .lm-shot{max-width:420px;margin:0 auto} .lm-links{gap:16px} .lm-krule{margin-inline:auto} }
  `;
  return <style>{css}</style>;
}

function Hero({ c }) {
  const solo = !c.image_url;
  return (
    <div className={`lm-hero ${solo ? 'solo' : ''}`}>
      <div>
        {c.eyebrow && <div className="lm-eyebrow">{c.eyebrow}</div>}
        <h1 className="lm-h1">{c.heading}</h1>
        {c.subheading && <p className="lm-sub">{c.subheading}</p>}
        {c.button_text && <a className="lm-btn" href={c.button_link || '#shop'}>{c.button_text}</a>}
      </div>
      {!solo && <div className="lm-shot"><img src={c.image_url} alt="" /></div>}
    </div>
  );
}

function Marquee({ site }) {
  const items = ['Secure checkout', 'Fast local delivery', 'Pay on delivery available', 'Quality you can trust', site.contactPhone].filter(Boolean);
  const row = [...items, ...items];
  return (
    <div className="lm-marquee">
      <div className="lm-mtrack">{row.map((t, i) => <span key={i}>{t}<i style={{ opacity: .4 }}>◆</i></span>)}</div>
    </div>
  );
}

function Products({ c, site }) {
  const cart = useContext(CartCtx);
  const products = (site.products || []).slice(0, c.limit > 0 ? c.limit : undefined);
  if (!products.length) return null;
  return (
    <section className="lm-sec" id="shop">
      {c.heading && <><h2 className="lm-h2">{c.heading}</h2><div className="lm-krule" /></>}
      <div className="lm-grid">
        {products.map((p) => (
          <div key={p.id} className="lm-pcard">
            <div className="lm-pimg">
              {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--site-muted)', fontSize: 12 }}>No image</div>}
              {cart && <div className="lm-padd"><button className="lm-btn" style={{ width: '100%', padding: '11px' }} onClick={() => cart.add(p)}>Add to cart</button></div>}
            </div>
            <div className="lm-pbody">
              <span className="lm-pname">{p.name}</span>
              {p.price != null && <span className="lm-pprice">{money(p.price)}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LuminStore({ data, activeSlug, setActiveSlug }) {
  const accent = data.theme?.accentColor || data.theme?.accent || meta.accent;
  useEffect(() => {
    if (document.getElementById('lm-fonts')) return;
    const l = document.createElement('link');
    l.id = 'lm-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }, []);

  const page = data.pages.find((p) => p.slug === activeSlug) || data.pages.find((p) => p.is_home) || data.pages[0];
  const shop = data.pages.find((p) => p.slug === 'shop');
  const blocks = page?.blocks || [];

  return (
    <CartProvider slug={data.slug}>
      <LuminStyle accent={accent} />
      <div className="lm-root">
        <header className="lm-nav">
          <div className="lm-word">
            {data.logoUrl && <img src={data.logoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />}
            {data.siteName || data.orgName}
          </div>
          <nav className="lm-links">
            {data.pages.filter((p) => p.slug !== 'shop').map((p) => (
              <a key={p.slug} className={`lm-link ${page?.slug === p.slug ? 'on' : ''}`} href={`#${p.slug}`}
                onClick={(e) => { e.preventDefault(); setActiveSlug(p.slug); }}>{p.title}</a>
            ))}
            {shop && <a className={`lm-link ${page?.slug === 'shop' ? 'on' : ''}`} href="#shop" onClick={(e) => { e.preventDefault(); setActiveSlug('shop'); }}>Shop</a>}
            <CartButton v={V} />
          </nav>
        </header>

        <main>
          {blocks.map((b, i) => {
            const c = b.content || {};
            if (b.type === 'hero') return <div key={i}><Hero c={c} /><Marquee site={data} /></div>;
            if (b.type === 'products') return <Products key={i} c={c} site={data} />;
            // content blocks (text / features / testimonials / faq / cta / contact
            // / subscribe / image / team) reuse the tested renderer, in Lumin's
            // section rhythm and palette.
            return (
              <div key={i} className="lm-sec" style={{ paddingBlock: 'clamp(40px,5vw,68px)' }}>
                <Block block={b} site={data} v={V} i={i} />
              </div>
            );
          })}
        </main>

        <footer className="lm-foot">
          <div className="lm-foot-in">
            <div style={{ maxWidth: 320 }}>
              <div className="lm-word" style={{ marginBottom: 10 }}>{data.siteName || data.orgName}</div>
              {data.tagline && <p style={{ fontSize: 13.5, color: 'var(--site-muted)', lineHeight: 1.6, margin: 0 }}>{data.tagline}</p>}
            </div>
            {(data.contactPhone || data.contactEmail || data.contactWhatsapp) && (
              <div style={{ fontSize: 13.5, color: 'var(--site-muted)', lineHeight: 2 }}>
                <div style={{ fontWeight: 700, color: 'var(--site-fg)', marginBottom: 6, fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase' }}>Get in touch</div>
                {data.contactPhone && <div>{data.contactPhone}</div>}
                {data.contactWhatsapp && <div>WhatsApp: {data.contactWhatsapp}</div>}
                {data.contactEmail && <div>{data.contactEmail}</div>}
              </div>
            )}
          </div>
          <div className="lm-foot-copy">
            <span>© {new Date().getFullYear()} {data.siteName || data.orgName}</span>
            <span>Built with Collarone</span>
          </div>
        </footer>

        <CartDrawer site={data} v={V} />
      </div>
    </CartProvider>
  );
}
