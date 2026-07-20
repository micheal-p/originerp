// =============================================================================
// Folder-based site themes. Each theme is a self-contained module with its OWN
// composition (nav, hero, sections, footer, type, CSS) — not the shared
// 3-layout skeleton in siteLayouts.jsx. Add a theme by dropping a file here and
// registering it below; everything about it stays in that one file, trackable.
//
// PublicSite renders a folder theme when the org's theme key matches one here,
// and falls back to the legacy LAYOUTS otherwise (so nothing breaks mid-migration).
// =============================================================================
import LuminStore, { meta as luminMeta } from './lumin.jsx';

export const SITE_THEMES = {
  [luminMeta.key]: { ...luminMeta, Component: LuminStore },
};

export const getSiteTheme = (key) => (key ? SITE_THEMES[key] || null : null);
export const SITE_THEME_LIST = Object.values(SITE_THEMES);
