// Shared landing-page chrome styles: base, header, footer, contact blocks
// and the responsive rules for them. Rendered by both the home page and
// the contact page so the header/footer/contact styling stays identical.
// Page-specific CSS (hero, animations, sign-in, pencil cursor) lives in
// app/page.tsx. The static portal pages in public/ never load this.
export function SiteStyles() {
  return (
    <style>{`
        html { scroll-behavior: smooth; }

        body, html {
          margin: 0;
          padding: 0;
          /* Metropolis (variable defined by next/font/local in layout.tsx;
             the Segoe stack is the fallback). This <style> block only
             ships on the landing pages, so the static portal pages keep
             their Segoe UI from globals.css. */
          font-family: var(--font-metropolis, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
        }

        /* globals.css centres the body with flex; a full landing page needs normal flow. */
        body { display: block; background: #ffffff; }

        .sd-page { color: #1c2b25; background: #ffffff; font-family: var(--font-metropolis, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif); }
        .sd-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .sd-section { padding: 96px 0; scroll-margin-top: 80px; border-top: 1px solid #e6efe9; }
        .sd-section-soft { background: #f3f7f4; position: relative; }
        /* Faint corner doodles on the soft sections only: two per section,
           very low opacity, in the empty bottom padding strip — never near
           text or cards. Static (no float): below the hero, calm wins. */
        .sd-corner-doodles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .sd-section-soft .sd-wrap { position: relative; z-index: 1; }
        .sd-corner-doodle { position: absolute; opacity: 0.12; color: #007a4d; line-height: 0; }
        .sd-corner-doodle svg { display: block; width: 100%; height: auto; }
        .sd-eyebrow { font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #007a4d; margin: 0 0 12px 0; }
        /* Display headings use ChunkFive (single weight 400 — a heavier
           weight would only be synthesised). Georgia is the fallback. */
        .sd-h2 { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 1.9rem; font-weight: 400; line-height: 1.25; margin: 0 0 16px 0; color: #123227; }

        /* Header — sticky with a frosted-glass blur so it reads as a modern menu */
        .sd-header { position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(220, 230, 223, 0.8); }
        .sd-header-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .sd-wordmark { font-size: 1.4rem; font-weight: 800; color: #004d34; text-decoration: none; letter-spacing: -0.5px; }
        .sd-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .sd-logo-mark { flex: none; display: block; }
        .sd-footer-brand { display: flex; align-items: center; gap: 10px; }
        .sd-menu-btn { display: none; background: none; border: none; padding: 8px; cursor: pointer; }
        .sd-nav { display: flex; align-items: center; gap: 28px; }
        .sd-nav a { color: #1c2b25; text-decoration: none; font-size: 0.95rem; font-weight: 500; position: relative; }
        .sd-nav a:hover { color: #007a4d; }
        .sd-nav a:not(.sd-btn)::after { content: ''; position: absolute; left: 0; bottom: -4px; height: 2px; width: 100%; background: #007a4d; transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
        .sd-nav a:not(.sd-btn):hover::after { transform: scaleX(1); }
        .sd-nav a.sd-active:not(.sd-btn)::after { transform: scaleX(1); }
        .sd-btn { display: inline-block; background: #007a4d; color: #ffffff; border: none; border-radius: 999px; padding: 11px 22px; font-weight: 700; font-size: 0.95rem; cursor: pointer; text-decoration: none; box-shadow: 0 2px 10px rgba(0, 122, 77, 0.25); transition: background 0.25s ease, translate 0.25s ease, box-shadow 0.25s ease; }
        .sd-btn:hover { background: #005c3a; color: #ffffff; translate: 0 -1px; box-shadow: 0 6px 16px rgba(0, 122, 77, 0.30); }
        /* The header button is an <a> inside .sd-nav, and .sd-nav a (higher
           specificity) was beating .sd-btn and leaving dark text on the green
           button — the low-contrast bug the user reported. This wins it back. */
        .sd-nav a.sd-btn, .sd-nav a.sd-btn:hover { color: #ffffff; }
        .sd-btn-outline { display: inline-block; background: #ffffff; color: #004d34; border: 1px solid #004d34; border-radius: 6px; padding: 11px 20px; font-weight: 700; font-size: 0.95rem; cursor: pointer; text-decoration: none; }
        .sd-btn-outline:hover { background: #f3f7f4; color: #004d34; }

        /* Premium thin-line icons: hand-written inline SVG, stroke-based in
           the site green. The icon rides the card entrance — it has no hidden
           state of its own, so it can never end up stuck hidden. */
        .sd-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: rgba(0, 122, 77, 0.08); color: #007a4d; margin-bottom: 16px; }
        .sd-icon svg { width: 24px; height: 24px; }

        /* Contact */
        .sd-contact-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 40px; }
        .sd-contact-block { border: 1px solid #dce6df; border-radius: 12px; padding: 28px 24px; background: #ffffff; }
        .sd-contact-block h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 10px 0; color: #123227; }
        .sd-contact-block p { font-size: 0.95rem; line-height: 1.65; color: #5a6b63; margin: 0 0 6px 0; }
        .sd-contact-block p:last-child { margin-bottom: 0; }
        /* overflow-wrap: normal keeps the email link breaking ONLY at the
           <wbr> after the @ — break-word/anywhere let greedy fill break it
           mid-domain ("gmail.c" / "om"). */
        .sd-contact-block a { color: #007a4d; font-weight: 600; text-decoration: none; overflow-wrap: normal; }
        .sd-contact-block a:hover { text-decoration: underline; }
        .sd-contact-cta { margin-top: 32px; }

        /* Footer */
        .sd-footer { background: #004d34; color: #ffffff; padding: 48px 0 32px 0; }
        .sd-footer-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        .sd-footer h3 { margin: 0 0 10px 0; font-size: 1.25rem; font-weight: 800; }
        .sd-footer p { margin: 0; font-size: 0.95rem; line-height: 1.65; color: rgba(255, 255, 255, 0.85); max-width: 420px; }
        .sd-footer a { color: #ffffff; text-decoration: none; }
        .sd-footer a:hover { text-decoration: underline; }
        .sd-footer-credit { align-self: center; }
        .sd-footer-credit p { margin: 0; }
        .sd-footer-copy { max-width: 1100px; margin: 32px auto 0 auto; padding: 24px 24px 0 24px; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); text-align: center; }

        /* Contact page: short page, so the column stretches and the footer
           sits at the bottom of tall viewports instead of floating mid-page. */
        .sd-contact-page { display: flex; flex-direction: column; min-height: 100vh; }
        .sd-contact-page main { flex: 1; display: flex; flex-direction: column; }
        .sd-contact-page main .sd-section { flex: 1; }

        @media (max-width: 900px) {
          .sd-contact-grid { grid-template-columns: repeat(2, 1fr); }
          .sd-section { padding: 64px 0; }
        }

        @media (max-width: 600px) {
          .sd-nav a { display: none; }
          .sd-menu-btn { display: flex; align-items: center; justify-content: center; }
          .sd-mobile-menu { display: flex; flex-direction: column; gap: 4px; position: fixed; top: 64px; left: 0; right: 0; z-index: 90; background: #fff; border-bottom: 1px solid rgba(220, 230, 223, 0.9); padding: 12px 24px 16px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); }
          .sd-mobile-menu a { color: #1c2b25; text-decoration: none; font-size: 1rem; font-weight: 500; padding: 10px 0; }
          .sd-mobile-menu a.sd-btn { color: #fff; text-align: center; margin-top: 8px; padding: 12px; }
          .sd-contact-grid { grid-template-columns: 1fr; }
          .sd-h2 { font-size: 1.6rem; }
        }
      `}</style>
  );
}
