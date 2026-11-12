'use client';

import { useEffect, useRef, useState } from 'react';

// Fired by the home page when a nav-click overlay transition has finished
// and the target section is showing. The pencil listens for it and
// re-shows at the last known pointer/finger position — see below.
export const NAV_SETTLED_EVENT = 'sd:nav-settled';

// Cartoon pencil cursor: the user's pencil character image IS the cursor
// on fine-pointer devices, and appears under the fingertip on touch
// devices — on tap or drag the tip sits on the touch point, the body
// rising above the finger so it stays visible, following with the same
// smoothing and lean as the mouse, then fading out shortly after the
// finger lifts. The character stays upright — it has a face, so full
// rotation to the travel direction would turn it upside down. Instead
// it leans slightly toward the direction of travel (max ±18°), eased,
// with the graphite tip leading the lean. The tip sits exactly on the
// pointer when settled: the artwork was cropped to its solid pixels
// (113x185, soft ground shadow removed) and the tip measured at cropped
// pixel (41.5, 184.5) — 36.7% across, bottom edge — which is the
// transform-origin in the CSS block. It mounts with a fine pointer
// or touch capability, and never with a reduced-motion preference.
// No ripple, no trail, no particles — the template it learns from has none.
//
// Over the home sign-in section (#signin) the pencil morphs into a
// butterfly (the user's line-art butterfly, /butterfly-cursor.png):
// a quick fade/scale crossfade, the butterfly flying centred on the
// pointer with a gentle flutter instead of the pencil's lean, and it
// morphs back to the pencil on leaving the section. The butterfly's
// hotspot is the centre of its body, measured at 67.9% across, 66%
// down the 112x134 artwork. Hiding over text fields still wins inside
// the section — the typing cursor returns over Email/Password. The
// swap works for mouse and touch alike, and the nav-settle re-show
// re-checks which form applies. /contact has no sign-in form, so the
// pencil stays a pencil there.
//
// Shared by the home page and the contact page (landing pages only —
// never the dashboards/portal). The CSS lives in <SiteStyles />.
//
// Why the pencil used to vanish after a nav click (PR #16 root cause):
// on touch, lifting the finger after tapping a nav link scheduled the
// usual ~1.1s fade, which fired ~150ms AFTER the 950ms nav overlay
// cleared — so the newly shown section had no pencil until the next
// touch. (First-sighting placement was investigated and exonerated:
// the component never remounts on same-page anchor navigation, so the
// last position is always known.) The fix: when the nav transition
// settles, the pencil re-shows at the last known position and, for
// touch input, lingers 3s before fading as usual. Mouse input never
// auto-fades — the pencil stays until the pointer leaves the window.
export function PencilCursor() {
  const followerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ((finePointer || touchCapable) && !reduceMotion) setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = followerRef.current;
    if (!el) return;
    // The body class is what hides the OS arrow (see the CSS block) — it is
    // only added while the follower is mounted, so a failed mount can never
    // leave the user with no cursor at all.
    document.body.classList.add('sd-pencil-cursor');
    // Rendered sprite size (see .sd-pencil in the CSS block) and the tip
    // offset within it: 36.7% of 36.6px wide, full 60px height. The
    // butterfly form is 56x67 with its hotspot at the body centre.
    const OX = 13.4, OY = 60;
    const BUTTERFLY_OX = 38, BUTTERFLY_OY = 44.3;
    const MAX_LEAN = (18 * Math.PI) / 180;
    let tipX = 0, tipY = 0, targetX = 0, targetY = 0;
    let lean = 0, scale = 1, targetScale = 1;
    let placed = false;
    let lastWasTouch = false;
    let isButterfly = false;
    let raf = 0;

    // Pencil <-> butterfly morph: a class toggle on the follower (the
    // CSS crossfades the two artworks). No-op when the form is unchanged.
    const setForm = (butterfly: boolean) => {
      if (butterfly === isButterfly) return;
      isButterfly = butterfly;
      el.classList.toggle('is-butterfly', butterfly);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      // The tip IS the click point, so the chase is tight (0.2/frame) — a
      // bigger lag would make clicks feel off. The offsets follow the
      // current form, so the hotspot stays glued to the pointer through
      // the morph.
      const ox = isButterfly ? BUTTERFLY_OX : OX;
      const oy = isButterfly ? BUTTERFLY_OY : OY;
      const dx = targetX - tipX, dy = targetY - tipY;
      tipX += dx * 0.2; tipY += dy * 0.2;
      // Lean toward the horizontal direction of travel: full lean moving
      // sideways, upright moving straight up or down. The lean only
      // updates while the tip is actually moving, so the last lean
      // persists at rest — the pencil never snaps back. The butterfly
      // never leans: it eases upright and flutters via CSS instead.
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const want = isButterfly ? 0 : (dx / dist) * MAX_LEAN;
        lean += (want - lean) * 0.3;
      }
      scale += (targetScale - scale) * 0.25;
      el.style.transform = `translate3d(${tipX - ox}px, ${tipY - oy}px, 0) rotate(${lean}rad) scale(${scale})`;
    };

    // Shared by mouse and touch: steer the tip to a point, grow over
    // links/buttons, hide over text fields, and morph to the butterfly
    // over the sign-in section. The first sighting places the tip on
    // the pointer while still hidden, so it never sweeps in from a
    // corner and never visibly teleports.
    const placeAt = (x: number, y: number, target: Element | null) => {
      targetX = x; targetY = y;
      if (!placed) { tipX = targetX; tipY = targetY; placed = true; }
      const overText = !!target?.closest('input, textarea');
      const overAction = !!target?.closest('a[href], button');
      targetScale = overAction && !overText ? 1.3 : 1;
      // Butterfly form over the sign-in section (home only — /contact
      // has no #signin, so the pencil stays there). Hiding over text
      // fields still wins: the typing cursor returns over Email/Password.
      setForm(!!target?.closest('#signin'));
      // Over text fields the follower hides and the normal text cursor
      // returns (see the CSS block) — hiding the I-beam would hurt typing.
      el.style.opacity = overText ? '0' : '1';
    };
    // Touch release: the pencil lingers briefly, then fades — it never
    // vanishes instantly and never stays parked on screen. Any new
    // input (touch or mouse) cancels the pending fade.
    let fadeTimer = 0;
    const cancelFade = () => { window.clearTimeout(fadeTimer); };
    const scheduleFade = (delay = 1100) => {
      cancelFade();
      fadeTimer = window.setTimeout(() => { el.style.opacity = '0'; }, delay);
    };

    const onMove = (e: MouseEvent) => {
      cancelFade();
      lastWasTouch = false;
      placeAt(e.clientX, e.clientY, e.target as Element | null);
    };
    const onLeave = () => { el.style.opacity = '0'; };
    const onEnter = () => { if (placed) el.style.opacity = '1'; };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) onLeave(); };
    // Touch: the pencil appears under the fingertip, tip on the touch
    // point, following the finger through the same tick (same lerp and
    // lean). Only the first touch is tracked. Listeners are passive and
    // the element is pointer-events: none, so taps, links and scrolling
    // are never intercepted and no preventDefault is ever called.
    const onTouchStart = (e: TouchEvent) => {
      cancelFade();
      lastWasTouch = true;
      const t = e.touches[0];
      if (t) placeAt(t.clientX, t.clientY, e.target as Element | null);
    };
    const onTouchMove = (e: TouchEvent) => {
      cancelFade();
      lastWasTouch = true;
      const t = e.touches[0];
      if (t) placeAt(t.clientX, t.clientY, e.target as Element | null);
    };
    const onTouchEnd = (e: TouchEvent) => {
      // Only fade once every finger is up — a second finger still down
      // keeps the pencil tracking.
      if (e.touches.length === 0) scheduleFade();
    };
    // Nav settled: the overlay has cleared and the target section is
    // showing. Re-show at the last known position (re-checking what is
    // under it, since the scroll moved content under the pointer). If
    // the pointer was never seen there is no position to show — never
    // park the pencil at an arbitrary default. Touch lingers 3s so the
    // pencil is actually seen on the new section; mouse never fades.
    const onNavSettled = () => {
      if (!placed) return;
      cancelFade();
      const under = document.elementFromPoint(targetX, targetY) as Element | null;
      const overText = !!under?.closest('input, textarea');
      const overAction = !!under?.closest('a[href], button');
      targetScale = overAction && !overText ? 1.3 : 1;
      setForm(!!under?.closest('#signin'));
      el.style.opacity = overText ? '0' : '1';
      if (lastWasTouch && !overText) scheduleFade(3000);
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener(NAV_SETTLED_EVENT, onNavSettled);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelFade();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener(NAV_SETTLED_EVENT, onNavSettled);
      document.body.classList.remove('sd-pencil-cursor');
    };
  }, [active]);

  if (!active) return null;
  return (
    <div ref={followerRef} className="sd-pencil" aria-hidden="true">
      <img className="sd-pencil-art" src="/pencil-cursor.png" alt="" draggable={false} />
      <img className="sd-butterfly-art" src="/butterfly-cursor.png" alt="" draggable={false} />
    </div>
  );
}
