'use client';

import { useState } from 'react';
import { LogoMark } from './LogoMark';

// Shared site header for the landing pages. Two variants:
// - 'home': in-page anchors play the nav-overlay transition via onNavClick
//   (passed in by the home page, which owns the overlay); the Contact link
//   is a plain link to /contact, since its target is another page.
// - 'contact': every link is a plain cross-page link (no overlay — the
//   transition only ever scrolls within the home page); Contact is the
//   active item. The hamburger menu works identically on both pages.
export type NavClickHandler = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => void;

export function SiteHeader({ variant, onNavClick }: { variant: 'home' | 'contact'; onNavClick?: NavClickHandler }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = variant === 'home';

  const links = isHome
    ? [
        { label: 'Features', href: '#features', anchor: '#features' },
        { label: 'How it works', href: '#how', anchor: '#how' },
        { label: 'For schools', href: '#schools', anchor: '#schools' },
      ]
    : [
        { label: 'Features', href: '/#features', anchor: null },
        { label: 'How it works', href: '/#how', anchor: null },
        { label: 'For schools', href: '/#schools', anchor: null },
      ];

  const anchorClick = (anchor: string | null) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    if (anchor && onNavClick) onNavClick(e, anchor);
  };
  const brandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isHome && onNavClick) onNavClick(e, '#top');
  };

  return (
    <>
      <header className="sd-header">
        <div className="sd-header-inner">
          <a href={isHome ? '#top' : '/'} className="sd-brand" onClick={brandClick}><LogoMark size={30} /><span className="sd-wordmark">SpringDrill</span></a>
          <nav className="sd-nav">
            {links.map((link) => (
              <a key={link.label} href={link.href} onClick={link.anchor ? anchorClick(link.anchor) : undefined}>{link.label}</a>
            ))}
            <a href="/contact" className={isHome ? undefined : 'sd-active'} aria-current={isHome ? undefined : 'page'}>Contact</a>
            <a href={isHome ? '#signin' : '/#signin'} className="sd-btn" onClick={isHome ? anchorClick('#signin') : undefined}>Portal sign-in</a>
          </nav>
          <button type="button" className="sd-menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="sd-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12 M18 6L6 18" stroke="#004d34" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16 M4 12h16 M4 17h16" stroke="#004d34" strokeWidth="2" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="sd-mobile-menu" id="sd-mobile-menu">
          {links.map((link) => (
            <a key={link.label} href={link.href} onClick={anchorClick(link.anchor)}>{link.label}</a>
          ))}
          <a href="/contact" className={isHome ? undefined : 'sd-active'} aria-current={isHome ? undefined : 'page'} onClick={() => setMenuOpen(false)}>Contact</a>
          <a href={isHome ? '#signin' : '/#signin'} className="sd-btn" onClick={anchorClick(isHome ? '#signin' : null)}>Portal sign-in</a>
        </div>
      )}
    </>
  );
}
