-- ============================================================================
-- Register the "Lumin" flagship storefront theme (2026-07-20). Idempotent.
-- Lumin is a folder-based theme (client/src/pages/site/themes/lumin.jsx) with
-- its OWN composition — the layout_key here only satisfies the catalog
-- constraint and drives setup_org_site's default ecommerce pages; PublicSite
-- renders the folder component by theme key, not the layout_key. sort_order 0
-- floats it to the top of the ecommerce picker as the recommended theme.
-- ============================================================================
insert into public.site_themes (key, name, category, layout_key, description, accent, font_pair, tone, sort_order)
values (
  'lumin-store', 'Lumin', 'ecommerce', 'ecommerce-grid',
  'A bold, image-led storefront — sticky nav, an editorial hero, and a product grid with a hover-reveal add-to-cart.',
  '#E0500F', 'sans-bold', 'light', 0
)
on conflict (key) do update set
  name = excluded.name, category = excluded.category, layout_key = excluded.layout_key,
  description = excluded.description, accent = excluded.accent, font_pair = excluded.font_pair,
  tone = excluded.tone, sort_order = excluded.sort_order;
