'use client';

import { useEffect, useRef, useState, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { LogoMark } from './components/LogoMark';
import { DoodleBooks, DoodleCloud, DoodleFlask, DoodleLeaf, DoodlePencilFlat, DoodlePlane, DoodleSparkle } from './components/Doodles';
import { NAV_SETTLED_EVENT, PencilCursor } from './components/PencilCursor';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { SiteStyles } from './components/SiteStyles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmxyopohngslqvzknjnt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl';
const supabase = createClient(supabaseUrl, supabaseKey);

// Split a heading into per-letter spans (wrapped per word so lines can still
// break between words). Each letter carries its own --sd-d stagger delay.
function SplitLetters({ text }: { text: string }) {
  const words = text.split(' ');
  const total = text.replace(/ /g, '').length;
  const step = Math.min(30, 320 / Math.max(1, total - 1));
  let n = 0;
  return (
    <>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="sd-word">
            {word.split('').map((ch) => {
              const d = Math.round(n * step);
              n += 1;
              return (
                <span key={n} className="sd-ch" style={{ '--sd-d': `${d}ms` } as React.CSSProperties}>{ch}</span>
              );
            })}
          </span>
          {wi < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}

// Split body copy into per-word spans, each with its own --sd-d delay.
function SplitWords({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="sd-w" style={{ '--sd-d': `${Math.min(wi * 18, 380)}ms` } as React.CSSProperties}>{word}</span>
          {wi < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  // Nav-click logo transition: a full-screen deep-green overlay shows the
  // wordmark animating in before the page scrolls to the clicked section.
  const [navOverlay, setNavOverlay] = useState<null | { leaving: boolean }>(null);
  const navTimers = useRef<number[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset state
  const [authMode, setAuthMode] = useState<'login' | 'reset'>('login');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preloader: the owner's actual logo — spinning emblem, steady
  // wordmark — with a galaxy ring + progress bar, shown for a full 3s
  // (the user asked for at least 3 seconds, logo first). Reduced-motion
  // users get a short 300ms static showing instead.
  // COUPLED TIMINGS — the hero first-play timer (3150ms) and the
  // cross-page hash-scroll (3050ms) below both wait for this preloader;
  // keep them in step with PRELOADER_MS if it ever changes.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setShowPreloader(false), reduceMotion ? 300 : 3000);
    return () => clearTimeout(t);
  }, []);

  // Clear any pending nav-transition timers when the component unmounts.
  useEffect(() => {
    const timers = navTimers.current;
    return () => { timers.forEach((t) => window.clearTimeout(t)); };
  }, []);

  // Scroll-reveal: sections fade/slide in gently as they enter the viewport.
  // The reveal classes are added from JS, so the page stays fully visible
  // if JS never runs.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    els.forEach((el) => el.classList.add('sd-reveal'));
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ZRK-style text animations (PR #7, replay in PR #8): per-letter
  // headings, per-word body copy, staggered card entrances. Hidden states
  // are added from JS only, so the page stays fully visible if JS never
  // runs. Everything is on-enter (IntersectionObserver), NOT
  // scroll-scrubbed: ZRK pins sections to scroll position, which would
  // break our anchor jumps and the nav logo transition, so this keeps the
  // look without the breakage. PR #8: animations REPLAY on every re-entry
  // — once an element has fully left the viewport it resets to its hidden
  // state and animates again the next time it scrolls in.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animEls = Array.from(document.querySelectorAll('[data-anim]'));
    if (!animEls.length || reduceMotion || typeof IntersectionObserver === 'undefined') {
      return; // no base classes added: everything stays visible, no motion
    }
    animEls.forEach((el) => {
      const kind = el.getAttribute('data-anim');
      if (kind === 'letters') el.classList.add('sd-anim-letters');
      if (kind === 'words') el.classList.add('sd-anim-words');
      if (kind === 'cards') {
        el.classList.add('sd-anim-cards');
        Array.from(el.children).forEach((child, i) => {
          (child as HTMLElement).style.setProperty('--sd-i', String(i));
        });
      }
    });
    // Keyboard parity (PR #9): headings and cards are focusable so a
    // keyboard user can trigger the same replay with focus-visible.
    // Added from JS like the animation classes, so the tab order is
    // unchanged without JS. Body paragraphs stay out of the tab order.
    animEls.forEach((el) => {
      const kind = el.getAttribute('data-anim');
      if (kind === 'letters') el.setAttribute('tabindex', '0');
      if (kind === 'cards') {
        Array.from(el.children).forEach((child) => child.setAttribute('tabindex', '0'));
      }
    });
    // When each element last started animating. A reset is only armed once
    // its entrance has fully finished (~0.9s max), so fast scroll-back and
    // forth at a section edge never strobes the animation.
    const lastPlay = new Map<Element, number>();
    const RESET_COOLDOWN_MS = 1000;
    // Hero text sits behind the ~3s preloader on load, so its FIRST play
    // still comes from a timer at 3150ms; after that it joins the observer
    // and replays like everything else when the user scrolls back to top.
    const heroRoot = document.querySelector('.sd-hero');
    let heroReady = false;
    const heroTimer = window.setTimeout(() => {
      heroReady = true;
      heroRoot?.classList.add('is-in');
      animEls
        .filter((el) => el.hasAttribute('data-anim-hero'))
        .forEach((el) => {
          el.classList.add('is-in');
          lastPlay.set(el, performance.now());
        });
    }, 3150);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          // Hero text must not start before the preloader timer has fired.
          if (el.hasAttribute('data-anim-hero') && !heroReady) return;
          if (!el.classList.contains('is-in')) {
            el.classList.add('is-in');
            lastPlay.set(el, performance.now());
          }
        } else {
          // Reset only once the element has FULLY left the viewport — a
          // partial exit (e.g. a tall card grid still peeking in) must not
          // hide it — and only after its entrance has finished.
          const r = entry.boundingClientRect;
          const fullyOut = r.bottom <= 0 || r.top >= window.innerHeight;
          const playedAt = lastPlay.get(el) ?? 0;
          if (fullyOut && performance.now() - playedAt >= RESET_COOLDOWN_MS) {
            el.classList.remove('is-in');
            // A card replayed by hover keeps its sd-card-play class (its
            // fill holds the visible end state); clear it here so the card
            // returns to the hidden base state with the rest of the grid.
            if (el.getAttribute('data-anim') === 'cards') {
              Array.from(el.children).forEach((child) => child.classList.remove('sd-card-play'));
            }
          }
        }
      });
    }, { threshold: 0.15 });
    animEls.forEach((el) => observer.observe(el));

    // Hover + keyboard-focus replay (PR #9). On fine-pointer devices,
    // hovering an animated element replays its animation; keyboard focus
    // (focus-visible) does the same. Touch devices get no hover behaviour.
    // A replay is skipped while an entrance is still playing (same 1s
    // cooldown as the scroll reset), so a hover can never reset or glitch
    // a scroll-triggered animation mid-flight. Hover targets the WHOLE
    // element (heading / paragraph / card): moving the pointer across the
    // text never restarts it.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const replay = (el: Element) => {
      if (el.hasAttribute('data-anim-hero') && !heroReady) return;
      const now = performance.now();
      if (now - (lastPlay.get(el) ?? 0) < RESET_COOLDOWN_MS) return;
      lastPlay.set(el, now);
      el.classList.remove('is-in');
      void (el as HTMLElement).offsetWidth; // reflow: re-adding restarts the CSS animation
      el.classList.add('is-in');
    };
    // One card, not the whole grid: replay just that card's entrance plus
    // its inner words paragraph. The sd-card-play class is left on the
    // card afterwards (its fill holds the visible end state); the observer
    // reset above clears it when the grid scrolls out of view.
    const replayCard = (card: Element) => {
      const now = performance.now();
      if (now - (lastPlay.get(card) ?? 0) < RESET_COOLDOWN_MS) return;
      lastPlay.set(card, now);
      card.classList.remove('sd-card-play');
      void (card as HTMLElement).offsetWidth;
      card.classList.add('sd-card-play');
      const words = card.querySelector('[data-anim="words"]');
      if (words) replay(words);
    };
    const listeners: Array<() => void> = [];
    const on = (target: Element, type: string, fn: () => void) => {
      target.addEventListener(type, fn);
      listeners.push(() => target.removeEventListener(type, fn));
    };
    const focusReplay = (target: Element, fn: () => void) => () => {
      if ((target as HTMLElement).matches(':focus-visible')) fn();
    };
    animEls.forEach((el) => {
      if (el.getAttribute('data-anim') === 'cards') {
        Array.from(el.children).forEach((card) => {
          if (canHover) on(card, 'mouseenter', () => replayCard(card));
          on(card, 'focusin', focusReplay(card, () => replayCard(card)));
        });
      } else {
        if (canHover) on(el, 'mouseenter', () => replay(el));
        if (el.getAttribute('data-anim') === 'letters') {
          on(el, 'focusin', focusReplay(el, () => replay(el)));
        }
      }
    });
    return () => { window.clearTimeout(heroTimer); observer.disconnect(); listeners.forEach((off) => off()); };
  }, []);

  // Scroll progress bar + hero photo parallax (transform only, rAF-throttled).
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const bar = progressRef.current;
    const media = heroMediaRef.current;
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar && max > 0) bar.style.width = `${(window.scrollY / max) * 100}%`;
      if (media && window.scrollY < 900) {
        media.style.transform = `translateY(${Math.min(14, window.scrollY * 0.04)}px)`;
      }
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intercept a nav click: show the logo overlay first (~950ms total), then
  // smooth-scroll to the target. Never stacks, and the overlay can never
  // trap the user: a failsafe clears it after 2s no matter what.
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    if (navOverlay) return;
    const el = document.querySelector(target);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => {
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      window.history.pushState(null, '', target);
    };
    if (reduceMotion || !el) { go(); return; }
    setNavOverlay({ leaving: false });
    navTimers.current.push(window.setTimeout(() => setNavOverlay({ leaving: true }), 650));
    navTimers.current.push(window.setTimeout(() => {
      setNavOverlay(null);
      go();
      // Let the overlay unmount commit, then tell the pencil cursor the
      // new section is showing so it re-shows at the last position (on
      // touch it would otherwise stay faded from the tap that opened
      // the transition — see PencilCursor).
      navTimers.current.push(window.setTimeout(() => window.dispatchEvent(new Event(NAV_SETTLED_EVENT)), 60));
    }, 950));
    navTimers.current.push(window.setTimeout(() => setNavOverlay(null), 2000));
  };

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

  // If the user arrived from a Supabase password-recovery email, show the
  // new-password form instead of the sign-in form.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setAuthMode('reset');
    }
  }, []);

  // Cross-page anchor landing (PR #14): arriving from /contact with a
  // section hash (/#features, /#signin) must land on that section. The
  // browser's native anchor jump is lost behind the ~3s preloader, so
  // scroll to the target once the preloader has cleared (400ms under
  // reduced motion, when the preloader itself clears at 300ms). The
  // recovery hash is excluded — it switches the auth form instead.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.includes('type=recovery')) return;
    const id = hash.slice(1);
    if (!id || !/^[A-Za-z][\w-]*$/.test(id)) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, reduceMotion ? 400 : 3050);
    return () => window.clearTimeout(t);
  }, []);

  const fillDemoStudent = () => {
    setEmail('sam.john4331@springdrill.edu');
    setPassword('Spring7067!');
  };

  const fillDemoTeacher = () => {
    setEmail('chukwuemaka.john1560@springdrill.edu');
    setPassword('Spring1187!');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileErr || !profile) throw new Error('Could not verify account role.');

      if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
          await supabase.auth.signOut();
          throw new Error('This temporary account has expired.');
      }

      if (profile.role === 'admin') {
        window.location.href = '/admin_dashboard.html';
      } else if (profile.role === 'teacher') {
        window.location.href = '/teacher_dashboard.html';
      } else if (profile.role === 'student') {
        window.location.href = '/student_dashboard.html';
      } else {
        throw new Error('Invalid role assigned to this account.');
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetMessage(null);
    if (!email) {
      setError('Type your email address above first, then tap Forgot Password.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (resetError) throw resetError;
      setResetMessage('Password reset email sent. Check your inbox for the link.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setAuthMode('login');
      setNewPassword('');
      setConfirmPassword('');
      setResetMessage('Password updated. Sign in with your new password.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SiteStyles />
      <style>{`
        @keyframes sd-logo-letter-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sd-overlay-bar { from { width: 0; } to { width: 120px; } }

        /* Preloader: the owner's actual logo — the emblem spins (1.5s
           per rotation, exactly 2 turns in the 3s showing, ending
           upright) while the wordmark stays steady and readable — with
           a galaxy ring (a dashed orbit carrying dots and sparkles,
           rotating around the logo) plus two rings spreading outward,
           and a progress bar filling beneath it across the full 3s.
           The whole showing lasts 3s (see the timer above — the user
           asked for at least 3 seconds, logo first). The emblem and
           wordmark images are preloaded in the document head so they
           render in the very first frame. Reduced motion: static logo,
           full bar, no spin or pulse. */
        .sd-preloader { position: fixed; inset: 0; background: #ffffff; z-index: 99999; display: flex; flex-direction: column; gap: 30px; align-items: center; justify-content: center; }
        .sd-preloader-galaxy { position: relative; width: min(430px, 88vw); display: flex; align-items: center; justify-content: center; }
        .sd-preloader-lockup { position: relative; z-index: 2; display: flex; align-items: center; gap: 14px; }
        .sd-preloader-emblem { display: block; width: 118px; height: 118px; animation: sd-emblem-spin 1.5s linear infinite; }
        @keyframes sd-emblem-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sd-preloader-wordmark { display: block; height: 62px; width: auto; }
        .sd-preloader-orbit { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1; width: 118%; height: auto; overflow: visible; pointer-events: none; }
        .sd-galaxy-spin { transform-box: fill-box; transform-origin: center; animation: sd-galaxy-spin 9s linear infinite; }
        @keyframes sd-galaxy-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sd-preloader-pulse { position: absolute; inset: -32px -8px; border: 2px solid rgba(0, 122, 77, 0.35); border-radius: 50%; animation: sd-preloader-pulse 2.2s ease-out infinite; pointer-events: none; }
        .sd-preloader-pulse-2 { animation-delay: 1.1s; }
        @keyframes sd-preloader-pulse { 0% { transform: scale(0.72); opacity: 0.7; } 100% { transform: scale(1.14); opacity: 0; } }
        .sd-preloader-bar { width: min(240px, 60vw); height: 6px; border-radius: 999px; background: #e6efe9; overflow: hidden; }
        .sd-preloader-bar-fill { height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #007a4d, #4D9F5F); animation: sd-preloader-fill 3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes sd-preloader-fill { from { width: 0; } to { width: 100%; } }

        /* Base, header, footer, contact and section styles are shared with
           the contact page — they ship from <SiteStyles /> (rendered first
           in this component). Only home-only rules live in this block. */

        /* Hero background (magnific Template 1 "Back to School" format): a
           diagonal pale-mint blob sweeping from the top-right to the
           centre, green hills rising behind a dark-brown desk band that
           spans the FULL width of the scene and grounds it, white clouds,
           one paper plane with a dashed trail, sparkles and scattered
           leaves. A stack of books, an Erlenmeyer flask and a pencil
           lying on the desk rest on the band, and extra clouds, leaves
           and sparkles fill the white left area. The scene is decorative
           only — content sits above it. Floating doodles live in the
           mint area, the top/bottom padding strips and the empty side
           margins, never over the headline, subtext, buttons, or the
           photo's focal area. */
        .sd-hero-section { position: relative; overflow: hidden; }
        .sd-hero-section .sd-wrap { position: relative; z-index: 1; }
        .sd-hero-scene { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .sd-hero-scene-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        /* Section scenes and floating doodles (.sd-scene, .sd-doodle)
           ship from <SiteStyles /> — the contact page shares them. */

        /* Hero */
        .sd-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; padding: 96px 0; }
        /* Display heading in ChunkFive (single weight 400). */
        .sd-hero h1 { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); font-size: 3.1rem; font-weight: 400; line-height: 1.15; letter-spacing: -1px; margin: 0 0 20px 0; color: #123227; }
        .sd-hero p { font-size: 1.15rem; line-height: 1.7; color: #5a6b63; margin: 0 0 32px 0; }
        .sd-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
        /* Premium frame for the one hero photo: green ring + soft outer glow
           + deep shadow, so the photo reads on the pale-mint scene.
           Box-shadow (not a pseudo-element) so it survives the wrapper's
           overflow: hidden and the parallax transform. */
        .sd-hero-media { overflow: hidden; border-radius: 16px; border: 2px solid #007a4d; box-shadow: 0 0 0 6px rgba(0, 122, 77, 0.12), 0 24px 48px rgba(18, 50, 39, 0.18); }
        .sd-hero-media img { width: 100%; height: 340px; object-fit: cover; display: block; border: none; border-radius: 0; transform: scale(1.06); }
        .sd-hero.is-in .sd-hero-media img { animation: sd-photo-settle 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes sd-photo-settle { from { transform: scale(1.06); } to { transform: scale(1); } }

        /* Features */
        .sd-feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 40px; }
        .sd-feature { border: 1px solid #dce6df; border-radius: 12px; padding: 28px 24px; background: #ffffff; }
        .sd-feature h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 10px 0; color: #123227; }
        .sd-feature p { font-size: 0.95rem; line-height: 1.65; color: #5a6b63; margin: 0; }

        /* How it works */
        .sd-step-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
        .sd-step { background: #ffffff; border: 1px solid #dce6df; border-radius: 12px; padding: 28px 24px; }
        .sd-step-num { font-size: 2rem; font-weight: 800; color: #007a4d; line-height: 1; margin-bottom: 14px; }
        .sd-step h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 10px 0; color: #123227; }
        .sd-step p { font-size: 0.95rem; line-height: 1.65; color: #5a6b63; margin: 0; }

        /* Who it is for */
        .sd-audience-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 40px; }
        .sd-audience { display: flex; gap: 16px; align-items: flex-start; }
        .sd-audience .sd-icon { width: 40px; height: 40px; flex-shrink: 0; margin: 0; }
        .sd-audience .sd-icon svg { width: 22px; height: 22px; }
        .sd-audience h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 6px 0; color: #123227; }
        .sd-audience p { font-size: 0.95rem; line-height: 1.65; color: #5a6b63; margin: 0; }

        /* Sign-in */
        .sd-signin-card {
          background: #ffffff;
          border: 1px solid #dce6df;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          padding: 36px;
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .sd-signin-header { text-align: center; margin-bottom: 28px; }
        .sd-signin-header h2 { font-family: var(--font-chunkfive, Georgia, 'Times New Roman', serif); color: #123227; font-weight: 400; margin: 0; font-size: 1.5rem; }
        .sd-signin-header p { color: #5a6b63; margin-top: 8px; font-size: 0.95rem; }

        .custom-input-group {
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 20px;
          transition: border-color 0.3s;
        }
        .custom-input-group:focus-within {
          border-color: #007a4d;
          box-shadow: 0 0 0 0.2rem rgba(0, 122, 77, 0.1);
        }
        .custom-input-icon { padding: 12px 15px; color: #6c757d; background: transparent; }
        .custom-input-group:focus-within .custom-input-icon { color: #007a4d; }
        .custom-input { border: none; padding: 12px 10px; width: 100%; background: transparent; outline: none; color: #333; }
        .btn-toggle-pass { background: transparent; border: none; padding: 0 15px; color: #6c757d; cursor: pointer; }
        .btn-toggle-pass:hover { color: #333; }
        .btn-toggle-pass:focus { outline: none; }

        .btn-login {
          background: #007a4d;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px;
          width: 100%;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
        }
        .btn-login:hover { background: #005c3a; }
        .btn-login:disabled { background: #6c757d; cursor: not-allowed; }

        .sd-demo-panel {
          background: #004d34;
          color: #ffffff;
          border-radius: 12px;
          padding: 24px;
          margin: 24px auto 0 auto;
          width: 100%;
          max-width: 700px;
          text-align: center;
          box-sizing: border-box;
        }
        .sd-demo-panel h3 { margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; }
        .sd-demo-panel p { margin: 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.85); }
        .demo-grid { display: flex; gap: 16px; margin-top: 18px; text-align: left; }
        .btn-demo-student, .btn-demo-teacher {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
        }
        .btn-demo-student i, .btn-demo-teacher i { color: #ffffff; font-size: 1.2rem; }
        .btn-demo-student:hover, .btn-demo-teacher:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.45);
        }

        /* Nav-click logo transition overlay */
        .sd-nav-overlay { position: fixed; inset: 0; background: #004d34; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.3s ease; }
        .sd-nav-overlay .sd-logo-mark { margin-bottom: 18px; }
        .sd-nav-overlay.sd-leaving { opacity: 0; pointer-events: none; }
        .sd-overlay-wordmark { color: #ffffff; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
        .sd-overlay-wordmark span { display: inline-block; opacity: 0; animation: sd-logo-letter-in 0.45s ease forwards; }
        .sd-overlay-bar { height: 2px; background: rgba(255, 255, 255, 0.65); width: 0; margin-top: 16px; animation: sd-overlay-bar 0.6s ease 0.25s forwards; }

        /* Scroll progress bar (width set from JS; stays 0 without JS) */
        .sd-progress { position: fixed; top: 64px; left: 0; height: 3px; width: 0; background: #007a4d; z-index: 101; }

        /* ZRK-style text animations (PR #7, replay in PR #8). Hidden states
           only apply once JS adds the sd-anim-* class, so text stays
           visible without JS. All entrances are fast (<=0.8s per element)
           and replay on every re-entry: removing .is-in returns an element
           to its hidden base state, re-adding it restarts the animation. */
        .sd-word { display: inline-block; white-space: nowrap; }
        .sd-anim-letters .sd-ch { display: inline-block; opacity: 0; transform: translateY(0.55em); }
        .sd-anim-letters.is-in .sd-ch { animation: sd-letter-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--sd-d, 0ms); }
        @keyframes sd-letter-in { from { opacity: 0; transform: translateY(0.55em); } to { opacity: 1; transform: translateY(0); } }
        .sd-anim-words .sd-w { display: inline-block; opacity: 0; transform: translateY(8px); }
        .sd-anim-words.is-in .sd-w { animation: sd-word-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--sd-d, 0ms); }
        @keyframes sd-word-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .sd-anim-cards > * { opacity: 0; transform: translateY(18px); }
        .sd-anim-cards.is-in > * { animation: sd-card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: calc(var(--sd-i, 0) * 90ms); }
        @keyframes sd-card-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

        /* Hover replay (PR #9): a hovered card replays its entrance via
           .sd-card-play (same keyframes, no stagger delay). It sits after
           the base card rule so it wins at equal specificity, and the
           scroll reset clears it when the grid leaves the viewport. */
        .sd-anim-cards > *.sd-card-play { animation: sd-card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        /* Gentle card lift on hover (fine pointers only) and on keyboard
           focus. Uses the separate translate property so it composes
           with — never fights — the entrance animation's transform. */
        .sd-feature, .sd-step, .sd-audience { transition: translate 0.25s ease, box-shadow 0.25s ease; }
        @media (hover: hover) and (pointer: fine) {
          .sd-feature:hover, .sd-step:hover { translate: 0 -4px; box-shadow: 0 10px 24px rgba(18, 50, 39, 0.12); }
          .sd-audience:hover { translate: 0 -4px; }
        }
        .sd-feature:focus-visible, .sd-step:focus-visible { translate: 0 -4px; box-shadow: 0 10px 24px rgba(18, 50, 39, 0.12); outline: 2px solid #007a4d; outline-offset: 3px; }
        .sd-audience:focus-visible { translate: 0 -4px; outline: 2px solid #007a4d; outline-offset: 3px; }
        [data-anim="letters"]:focus-visible { outline: 2px solid #007a4d; outline-offset: 3px; }

        /* Image hover zoom (PR #9 follow-up): the one hero photo gently zooms
           inside its overflow-hidden frame on fine pointers. Uses the separate
           scale property so it composes with the hero settle animation's
           transform instead of fighting it. */
        .sd-hero-media img { transition: scale 0.5s ease; }
        @media (hover: hover) and (pointer: fine) {
          .sd-hero-media:hover img { scale: 1.04; }
        }

        /* Scroll-reveal (classes added from JS; content stays visible without JS) */
        .sd-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .sd-reveal.is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .sd-reveal { opacity: 1; transform: none; transition: none; }
          .sd-overlay-wordmark span { animation: none; opacity: 1; }
          .sd-overlay-bar { animation: none; width: 120px; }
          .sd-anim-letters .sd-ch, .sd-anim-words .sd-w { opacity: 1; transform: none; animation: none; }
          .sd-anim-cards > * { opacity: 1; transform: none; animation: none; }
          .sd-feature, .sd-step, .sd-audience { transition: none; }
          .sd-feature:hover, .sd-step:hover, .sd-audience:hover,
          .sd-feature:focus-visible, .sd-step:focus-visible, .sd-audience:focus-visible { translate: none; box-shadow: none; }
          .sd-hero-media img { transform: none; animation: none; }
          .sd-hero-media img { transition: none; scale: none; }
          .sd-progress { display: none; }
          .sd-galaxy-spin { animation: none; }
          .sd-preloader-emblem { animation: none; }
          .sd-preloader-pulse { display: none; }
          .sd-preloader-bar-fill { animation: none; width: 100%; }
        }

        /* Pencil cursor styles ship from <SiteStyles /> — the contact
           page shares the cursor. */

        /* Wide-margin doodles live in the empty side margins. They stay
           visible at every width (mobile parity): below ~1240px they
           shrink slightly so they sit in the content gutter without
           crowding the text. Nothing here hides artwork. */
        @media (max-width: 1240px) {
          .sd-doodle-wide { scale: 0.85; }
        }

        @media (max-width: 900px) {
          .sd-hero { grid-template-columns: 1fr; gap: 32px; padding: 56px 0 72px; }
          .sd-hero h1 { font-size: 2.1rem; }
          .sd-hero-media img { height: 260px; }
          /* Mobile parity: the FULL Template 1 hero scene stays visible
             behind the stacked content — blob, hills, desk band, books,
             flask, pencil, clouds, leaves, sparkles and paper plane, the
             same artwork as desktop. The scene sits behind the content
             (z-index 0), the photo is opaque, the pale mint wash keeps
             the dark headline readable, and the extra bottom padding
             leaves the desk band visible below the photo. Nothing here
             hides artwork or animation. */
          .sd-feature-grid { grid-template-columns: repeat(2, 1fr); }
          .sd-step-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .sd-hero h1 { font-size: 1.8rem; }
          .sd-hero p { font-size: 1.05rem; }
          .sd-feature-grid { grid-template-columns: 1fr; }
          .sd-audience-grid { grid-template-columns: 1fr; }
          .sd-signin-card { padding: 28px 20px; }
          .demo-grid { flex-direction: column; }
        }
      `}</style>

      {showPreloader && (
        <div className="sd-preloader" aria-hidden="true">
          <div className="sd-preloader-galaxy">
            <div className="sd-preloader-pulse" />
            <div className="sd-preloader-pulse sd-preloader-pulse-2" />
            <svg className="sd-preloader-orbit" viewBox="0 0 380 200" fill="none" aria-hidden="true">
              <g className="sd-galaxy-spin">
                <ellipse cx="190" cy="100" rx="174" ry="78" stroke="#007a4d" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" />
                <circle cx="364" cy="100" r="4" fill="#007a4d" />
                <circle cx="313" cy="155" r="3" fill="#FEC60D" />
                <circle cx="190" cy="178" r="4.5" fill="#4D9F5F" />
                <circle cx="67" cy="155" r="3" fill="#007a4d" />
                <circle cx="16" cy="100" r="4" fill="#FEC60D" />
                <circle cx="67" cy="45" r="3.5" fill="#4D9F5F" />
                <circle cx="190" cy="22" r="4" fill="#007a4d" />
                <circle cx="313" cy="45" r="3" fill="#FEC60D" />
                <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z" fill="#FEC60D" transform="translate(341 139)" />
                <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z" fill="#8FD4CB" transform="translate(39 61)" />
              </g>
            </svg>
            <div className="sd-preloader-lockup">
              <img className="sd-preloader-emblem" src="/springdrill-emblem.png" alt="" fetchPriority="high" draggable={false} />
              <img className="sd-preloader-wordmark" src="/springdrill-wordmark.png" alt="SpringDrill" fetchPriority="high" draggable={false} />
            </div>
          </div>
          <div className="sd-preloader-bar"><div className="sd-preloader-bar-fill" /></div>
        </div>
      )}

      {navOverlay && (
        <div className={`sd-nav-overlay${navOverlay.leaving ? ' sd-leaving' : ''}`} aria-hidden="true">
          <LogoMark size={44} />
          <div className="sd-overlay-wordmark">
            {'SpringDrill'.split('').map((letter, i) => (
              <span key={i} style={{ animationDelay: `${i * 45}ms` }}>{letter}</span>
            ))}
          </div>
          <div className="sd-overlay-bar" />
        </div>
      )}

      <div className="sd-page" id="top">
        <SiteHeader variant="home" onNavClick={handleNavClick} />

        <div className="sd-progress" ref={progressRef} aria-hidden="true" />

        <main>
          <section className="sd-hero-section">
            <div className="sd-hero-scene" aria-hidden="true">
              <svg className="sd-hero-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 660 0 C 580 120, 500 250, 450 380 C 420 460, 405 530, 400 600 L 1200 600 L 1200 0 Z" fill="#C7EFEE" />
                <path d="M 620 600 C 640 500, 740 450, 840 470 C 940 490, 1020 440, 1100 470 C 1150 488, 1180 520, 1200 540 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 760 600 C 780 530, 880 500, 980 520 C 1060 536, 1130 520, 1200 540 L 1200 600 Z" fill="#3E8A4E" />
                <rect x="0" y="556" width="1200" height="44" fill="#512A2C" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '5%', right: '9%', width: 72, animationDuration: '7s' }}>
                <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill="#ffffff"><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '15%', right: '3%', width: 44, opacity: 0.85, animationDuration: '8s', animationDelay: '-2s' }}>
                <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill="#ffffff"><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '2%', right: '22%', width: 150, animationDuration: '8s', animationDelay: '-1.5s' }}>
                <svg viewBox="0 0 140 70" fill="none" aria-hidden="true"><path d="M6 60C44 56 66 40 106 18" stroke="#512A2D" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" /><path d="M102 8L136 16 106 26 111 16Z" fill="#ffffff" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '11%', right: '36%', width: 20, animationDuration: '6s', animationDelay: '-1s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#ffffff" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '9%', right: '8%', width: 24, animationDuration: '7.5s', animationDelay: '-3s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#FEC60D" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '22%', right: '28%', width: 16, opacity: 0.9, animationDuration: '6.5s', animationDelay: '-2s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#ffffff" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '7%', right: '18%', width: 30, animationDuration: '7s', animationDelay: '-2.5s' }}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><g transform="rotate(25 16 16)"><path d="M6 26C6 12 16 4 28 4c0 14-8 22-22 22z" fill="#2F7A3E" /><path d="M8 24C14 18 20 12 26 6" stroke="#1E5A2A" strokeWidth="1.5" strokeLinecap="round" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '18%', right: '4%', width: 24, animationDuration: '6.5s', animationDelay: '-0.5s' }}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><g transform="rotate(-15 16 16)"><path d="M6 26C6 12 16 4 28 4c0 14-8 22-22 22z" fill="#7CB85C" /><path d="M8 24C14 18 20 12 26 6" stroke="#2F7A3E" strokeWidth="1.5" strokeLinecap="round" /></g></svg>
              </span>
              {/* White left area: the Template 1 sample carries its cartoon
                  artifacts all round the scene, so the white space gets the
                  same language. Clouds here use a pale mint fill so they
                  read on white. Top-strip items stay above the headline;
                  margin items (sd-doodle-wide) stay visible at every width
                  (mobile parity) and shrink slightly below ~1240px. */}
              <span className="sd-doodle sd-doodle-float" style={{ top: '3%', left: '5%', width: 64, animationDuration: '7s', animationDelay: '-1s' }}>
                <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill="#DDEDE8"><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '8%', left: '15%', width: 40, opacity: 0.9, animationDuration: '8s', animationDelay: '-2s' }}>
                <svg viewBox="0 0 80 48" fill="none" aria-hidden="true"><g fill="#E4F2EF"><circle cx="26" cy="30" r="12" /><circle cx="42" cy="21" r="14" /><circle cx="58" cy="30" r="10" /><rect x="16" y="30" width="52" height="11" rx="5.5" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', left: '36%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#FEC60D" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-wide sd-doodle-float" style={{ top: '14%', left: '2.5%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#8FD4CB" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-wide sd-doodle-float" style={{ top: '38%', left: '1.8%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><g transform="rotate(25 16 16)"><path d="M6 26C6 12 16 4 28 4c0 14-8 22-22 22z" fill="#2F7A3E" /><path d="M8 24C14 18 20 12 26 6" stroke="#1E5A2A" strokeWidth="1.5" strokeLinecap="round" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-wide sd-doodle-float" style={{ bottom: '24%', left: '3.5%', width: 20, animationDuration: '6.5s', animationDelay: '-0.5s' }}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><g transform="rotate(-20 16 16)"><path d="M6 26C6 12 16 4 28 4c0 14-8 22-22 22z" fill="#7CB85C" /><path d="M8 24C14 18 20 12 26 6" stroke="#2F7A3E" strokeWidth="1.5" strokeLinecap="round" /></g></svg>
              </span>
              <span className="sd-doodle sd-doodle-wide sd-doodle-float" style={{ bottom: '30%', left: '6%', width: 14, animationDuration: '7.5s', animationDelay: '-3s' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="#FEC60D" /></svg>
              </span>
              {/* Desk set (Template 1): a stack of three books, an
                  Erlenmeyer flask with orange liquid, and a green pencil
                  lying on the desk. They sit low on the band (bottom ~6%)
                  so their bases overlap the desk's top edge and read as
                  resting on it; the gentle float never lifts them clear. */}
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6%', right: '2.5%', width: 78, animationDuration: '7s', animationDelay: '-1s' }}>
                <svg viewBox="0 0 90 60" fill="none" aria-hidden="true"><rect x="6" y="46" width="76" height="14" rx="3" fill="#2E7CC4" /><rect x="12" y="49.5" width="58" height="7" rx="2" fill="#EAF4FB" /><rect x="12" y="31" width="68" height="14" rx="3" fill="#FFFFFF" stroke="#2E7CC4" strokeWidth="2" /><rect x="18" y="34.5" width="50" height="7" rx="2" fill="#DCEBF8" /><rect x="20" y="16" width="56" height="14" rx="3" fill="#7FB3E0" /><rect x="26" y="19.5" width="38" height="7" rx="2" fill="#EAF4FB" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6%', right: '10.5%', width: 42, animationDuration: '8s', animationDelay: '-2s' }}>
                <svg viewBox="0 0 48 64" fill="none" aria-hidden="true"><path d="M20 4h8v10l10 20c2.4 4.8 3.6 8 3.6 11a9.4 9.4 0 0 1-9.4 9.4H15.8A9.4 9.4 0 0 1 6.4 45c0-3 1.2-6.2 3.6-11L20 14V4z" fill="#FFFFFF" stroke="#512A2C" strokeWidth="2" strokeLinejoin="round" /><path d="M13 40h22l3.4 6.8c.8 1.6 1.2 3 1.2 4.4a6.4 6.4 0 0 1-6.4 6.4H14.8a6.4 6.4 0 0 1-6.4-6.4c0-1.4.4-2.8 1.2-4.4L13 40z" fill="#F59645" /><circle cx="20" cy="48" r="2.2" fill="#FDE3C8" /><circle cx="28" cy="52" r="1.6" fill="#FDE3C8" /><circle cx="25" cy="43" r="1.3" fill="#FDE3C8" /><rect x="18" y="2" width="12" height="5" rx="2" fill="#512A2C" /></svg>
              </span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6.2%', left: '3.5%', width: 96, animationDuration: '7s', animationDelay: '-1.5s' }}>
                <svg viewBox="0 0 120 20" fill="none" aria-hidden="true" style={{ transform: 'rotate(-4deg)' }}><rect x="26" y="4" width="72" height="12" fill="#4D9F5F" /><rect x="26" y="4" width="72" height="3" fill="#6BBF7B" /><path d="M26 4L6 10l20 6V4z" fill="#F2D8A7" /><path d="M12 7.5L6 10l6 2.5V7.5z" fill="#2B2B2B" /><rect x="98" y="4" width="8" height="12" fill="#C0C7CE" /><rect x="106" y="4" width="10" height="12" rx="2" fill="#F472B6" /></svg>
              </span>
            </div>
            <div className="sd-wrap">
            <div className="sd-hero">
              <div>
                <h1 data-anim="letters" data-anim-hero><SplitLetters text="Report cards in minutes, not weekends." /></h1>
                <p data-anim="words" data-anim-hero><SplitWords text="SpringDrill helps Nigerian schools set CBT tests, mark them, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice." /></p>
                <div className="sd-hero-actions">
                  <a href="#signin" className="sd-btn" onClick={(e) => handleNavClick(e, '#signin')}>Sign in to your portal</a>
                  <a href="#how" className="sd-btn-outline" onClick={(e) => handleNavClick(e, '#how')}>See how it works</a>
                </div>
              </div>
              <div className="sd-hero-media" ref={heroMediaRef}>
                <img src="/hero-classroom.jpg" alt="Teacher guiding students at computers in a Nigerian classroom" />
              </div>
            </div>
            </div>
          </section>

          <section id="features" className="sd-section sd-section-soft">
            {/* Full-colour Template 1 scene: mint blob, hills, clouds,
                paper plane, leaves, sparkles, books and flask — behind
                the content at every width. */}
            <div className="sd-scene" aria-hidden="true">
              <svg className="sd-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 660 0 C 580 120, 500 250, 450 380 C 420 460, 405 530, 400 600 L 1200 600 L 1200 0 Z" fill="#C7EFEE" />
                <path d="M 620 600 C 640 500, 740 450, 840 470 C 940 490, 1020 440, 1100 470 C 1150 488, 1180 520, 1200 540 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 760 600 C 780 530, 880 500, 980 520 C 1060 536, 1130 520, 1200 540 L 1200 600 Z" fill="#3E8A4E" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', left: '4%', width: 64, animationDuration: '7s', animationDelay: '-1s' }}><DoodleCloud fill="#DDEDE8" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '6%', left: '22%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '3%', right: '6%', width: 130, animationDuration: '8s', animationDelay: '-1.5s' }}><DoodlePlane /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '12%', right: '16%', width: 48, opacity: 0.9, animationDuration: '8s', animationDelay: '-2s' }}><DoodleCloud fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '20%', right: '30%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '34%', left: '2%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}><DoodleLeaf fill="#2F7A3E" stroke="#1E5A2A" rotate={25} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '55%', right: '1.8%', width: 24, animationDuration: '6.5s', animationDelay: '-0.5s' }}><DoodleLeaf fill="#7CB85C" stroke="#2F7A3E" rotate={-15} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '30%', left: '3%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#8FD4CB" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', left: '3.5%', width: 42, animationDuration: '8s', animationDelay: '-2s' }}><DoodleFlask /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', right: '2.5%', width: 78, animationDuration: '7s', animationDelay: '-1s' }}><DoodleBooks /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '14%', right: '12%', width: 20, animationDuration: '7.5s', animationDelay: '-3s' }}><DoodleSparkle fill="#FEC60D" /></span>
            </div>
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">What SpringDrill does</p>
              <h2 className="sd-h2" data-anim="letters"><SplitLetters text="Everything a school needs to run exams and results." /></h2>
              <div className="sd-feature-grid" data-anim="cards">
                <div className="sd-feature">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg></span>
                  <h3>Results &amp; report cards</h3>
                  <p data-anim="words"><SplitWords text="Scores from class tests and exams are added up automatically into totals, averages and positions, and printed as report cards. No hand calculation, no spreadsheet wrangling." /></p>
                </div>
                <div className="sd-feature">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg></span>
                  <h3>CBT tests</h3>
                  <p data-anim="words"><SplitWords text="Teachers set timed computer-based tests from the question bank. Students answer on screen, and scores are recorded straight away." /></p>
                </div>
                <div className="sd-feature">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg></span>
                  <h3>AI lesson plans</h3>
                  <p data-anim="words"><SplitWords text="Teachers generate lesson plans with AI from the scheme of work, then edit them before use." /></p>
                </div>
                <div className="sd-feature">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg></span>
                  <h3>JAMB practice</h3>
                  <p data-anim="words"><SplitWords text="Students practise with JAMB-style questions in the UTME Simulator and see their scores and progress over time." /></p>
                </div>
              </div>
            </div>
          </section>

          <section id="how" className="sd-section">
            {/* Full-colour Template 1 scene, mirrored: mint blob sweeping
                from the top-left, hills at the bottom-right, paper plane,
                clouds, pencil, leaves and sparkles — behind the content
                at every width. */}
            <div className="sd-scene" aria-hidden="true">
              <svg className="sd-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 540 0 C 620 120, 700 250, 750 380 C 780 460, 795 530, 800 600 L 0 600 L 0 0 Z" fill="#C7EFEE" />
                <path d="M 620 600 C 640 500, 740 450, 840 470 C 940 490, 1020 440, 1100 470 C 1150 488, 1180 520, 1200 540 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 760 600 C 780 530, 880 500, 980 520 C 1060 536, 1130 520, 1200 540 L 1200 600 Z" fill="#3E8A4E" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', left: '5%', width: 130, animationDuration: '8s', animationDelay: '-1.5s' }}><DoodlePlane /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', right: '5%', width: 60, animationDuration: '7s', animationDelay: '-1s' }}><DoodleCloud fill="#DDEDE8" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '8%', right: '20%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '14%', left: '14%', width: 44, opacity: 0.9, animationDuration: '8s', animationDelay: '-2s' }}><DoodleCloud fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '30%', left: '2%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#8FD4CB" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '40%', right: '2%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}><DoodleLeaf fill="#2F7A3E" stroke="#1E5A2A" rotate={-15} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '32%', left: '2.5%', width: 22, animationDuration: '6.5s', animationDelay: '-0.5s' }}><DoodleLeaf fill="#7CB85C" stroke="#2F7A3E" rotate={25} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '24%', right: '8%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6%', left: '3%', width: 96, animationDuration: '7s', animationDelay: '-1.5s' }}><DoodlePencilFlat /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '6%', right: '3%', width: 64, animationDuration: '7s', animationDelay: '-1s' }}><DoodleBooks /></span>
            </div>
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">How it works</p>
              <h2 className="sd-h2" data-anim="letters"><SplitLetters text="Three steps, from test to report card." /></h2>
              <div className="sd-step-grid" data-anim="cards">
                <div className="sd-step">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></span>
                  <div className="sd-step-num">1</div>
                  <h3>Teacher sets the test</h3>
                  <p data-anim="words"><SplitWords text="A teacher picks a class and subject, sets questions from the bank, and opens the test." /></p>
                </div>
                <div className="sd-step">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M9 10.5l2 2 4-4" /></svg></span>
                  <div className="sd-step-num">2</div>
                  <h3>Students take it</h3>
                  <p data-anim="words"><SplitWords text="Students log in, answer on screen, and submit. Scores are recorded immediately." /></p>
                </div>
                <div className="sd-step">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg></span>
                  <div className="sd-step-num">3</div>
                  <h3>Results are ready</h3>
                  <p data-anim="words"><SplitWords text="Totals, averages and positions are worked out automatically, and report cards print in minutes." /></p>
                </div>
              </div>
            </div>
          </section>

          <section id="schools" className="sd-section sd-section-soft">
            {/* Full-colour Template 1 scene: mint blob rising from the
                bottom-left, hills grounding the section, paper plane,
                clouds, leaves, sparkles, books and flask — behind the
                content at every width. */}
            <div className="sd-scene" aria-hidden="true">
              <svg className="sd-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 600 L 0 320 C 130 280, 260 300, 340 390 C 400 460, 425 530, 435 600 Z" fill="#C7EFEE" />
                <path d="M 0 600 L 0 545 C 90 515, 200 525, 290 555 C 350 575, 400 570, 440 585 L 440 600 Z" fill="#4D9F5F" />
                <path d="M 620 600 C 640 500, 740 450, 840 470 C 940 490, 1020 440, 1100 470 C 1150 488, 1180 520, 1200 540 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 760 600 C 780 530, 880 500, 980 520 C 1060 536, 1130 520, 1200 540 L 1200 600 Z" fill="#3E8A4E" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '3%', left: '4%', width: 120, animationDuration: '8s', animationDelay: '-1.5s' }}><DoodlePlane /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', right: '6%', width: 64, animationDuration: '7s', animationDelay: '-1s' }}><DoodleCloud fill="#E4F2EF" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '6%', right: '24%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '10%', left: '10%', width: 44, opacity: 0.9, animationDuration: '8s', animationDelay: '-2s' }}><DoodleCloud fill="#DDEDE8" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '38%', right: '2%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}><DoodleLeaf fill="#2F7A3E" stroke="#1E5A2A" rotate={-20} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '55%', left: '2%', width: 24, animationDuration: '6.5s', animationDelay: '-0.5s' }}><DoodleLeaf fill="#7CB85C" stroke="#2F7A3E" rotate={25} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '28%', left: '6%', width: 14, animationDuration: '7.5s', animationDelay: '-3s' }}><DoodleSparkle fill="#8FD4CB" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '20%', right: '10%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', left: '3%', width: 42, animationDuration: '8s', animationDelay: '-2s' }}><DoodleFlask /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '5%', right: '2.5%', width: 78, animationDuration: '7s', animationDelay: '-1s' }}><DoodleBooks /></span>
            </div>
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">Who it is for</p>
              <h2 className="sd-h2" data-anim="letters"><SplitLetters text="Built for the whole school." /></h2>
              <div className="sd-audience-grid" data-anim="cards">
                <div className="sd-audience">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4h6v4" /><path d="M12 7v2" /></svg></span>
                  <div>
                    <h3>Schools</h3>
                    <p data-anim="words"><SplitWords text="Run exams, results and report cards from one portal." /></p>
                  </div>
                </div>
                <div className="sd-audience">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="M7 21h10" /><path d="M12 16v5" /></svg></span>
                  <div>
                    <h3>Teachers</h3>
                    <p data-anim="words"><SplitWords text="Set tests, enter scores, and plan lessons without the paperwork." /></p>
                  </div>
                </div>
                <div className="sd-audience">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /><line x1="22" y1="10" x2="22" y2="16" /></svg></span>
                  <div>
                    <h3>Students</h3>
                    <p data-anim="words"><SplitWords text="Practise for JAMB and see your own results and progress." /></p>
                  </div>
                </div>
                <div className="sd-audience">
                  <span className="sd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>
                  <div>
                    <h3>Parents</h3>
                    <p data-anim="words"><SplitWords text="Follow your child's results and report cards through the parent portal." /></p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="signin" className="sd-section">
            {/* Full-colour Template 1 scene: mint blobs in opposite
                corners, a hills strip grounding the section, clouds,
                paper plane, leaves, sparkles, books, pencil and flask —
                behind the sign-in card and demo panel at every width. */}
            <div className="sd-scene" aria-hidden="true">
              <svg className="sd-scene-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 0 L 430 0 C 350 80, 280 150, 220 250 C 170 330, 80 370, 0 395 Z" fill="#C7EFEE" />
                <path d="M 1200 600 L 770 600 C 850 510, 930 440, 990 340 C 1040 260, 1130 220, 1200 200 Z" fill="#C7EFEE" />
                <path d="M 0 600 L 0 562 C 180 535, 360 570, 560 552 C 760 534, 980 570, 1200 548 L 1200 600 Z" fill="#4D9F5F" />
                <path d="M 0 600 L 0 582 C 220 560, 480 590, 720 575 C 920 562, 1080 585, 1200 572 L 1200 600 Z" fill="#3E8A4E" />
              </svg>
              <span className="sd-doodle sd-doodle-float" style={{ top: '3%', left: '5%', width: 60, animationDuration: '7s', animationDelay: '-1s' }}><DoodleCloud fill="#DDEDE8" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '4%', right: '5%', width: 52, animationDuration: '8s', animationDelay: '-2s' }}><DoodleCloud fill="#E4F2EF" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '2.5%', left: '16%', width: 120, animationDuration: '8s', animationDelay: '-1.5s' }}><DoodlePlane /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '5%', right: '22%', width: 18, animationDuration: '6s', animationDelay: '-1s' }}><DoodleSparkle fill="#FEC60D" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '30%', left: '2.5%', width: 26, animationDuration: '7s', animationDelay: '-2.5s' }}><DoodleLeaf fill="#2F7A3E" stroke="#1E5A2A" rotate={25} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '42%', right: '2.5%', width: 24, animationDuration: '6.5s', animationDelay: '-0.5s' }}><DoodleLeaf fill="#7CB85C" stroke="#2F7A3E" rotate={-15} /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '55%', left: '3%', width: 16, animationDuration: '6.5s', animationDelay: '-2s' }}><DoodleSparkle fill="#8FD4CB" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ top: '62%', right: '4%', width: 18, animationDuration: '7s', animationDelay: '-1s' }}><DoodleSparkle fill="#ffffff" /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '4%', left: '3%', width: 72, animationDuration: '7s', animationDelay: '-1s' }}><DoodleBooks /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '4.5%', left: '46%', width: 88, animationDuration: '7s', animationDelay: '-1.5s' }}><DoodlePencilFlat /></span>
              <span className="sd-doodle sd-doodle-float" style={{ bottom: '4%', right: '3%', width: 40, animationDuration: '8s', animationDelay: '-2s' }}><DoodleFlask /></span>
            </div>
            <div className="sd-wrap" data-reveal>
              <div className="sd-signin-card">
                <div className="sd-signin-header">
                  <h2 data-anim="letters"><SplitLetters text={authMode === 'reset' ? 'Set a new password' : 'Sign in to your portal'} /></h2>
                  <p>{authMode === 'reset' ? 'Choose a new password for your account.' : 'Use the email and password your school gave you.'}</p>
                </div>

                {error && <div className="alert alert-danger" style={{color: '#b91c1c', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', border: '1px solid #fecaca'}}>{error}</div>}
                {resetMessage && <div style={{color: '#14532d', backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', border: '1px solid #bbf7d0'}}>{resetMessage}</div>}

                {authMode === 'login' ? (
                  <form onSubmit={handleSubmit}>
                    <div className="custom-input-group">
                      <div className="custom-input-icon"><i className="fas fa-envelope"></i></div>
                      <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="custom-input"
                        placeholder="Email Address"
                        required
                      />
                    </div>

                    <div className="custom-input-group">
                      <div className="custom-input-icon"><i className="fas fa-lock"></i></div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="custom-input"
                        placeholder="Password"
                        required
                      />
                      <button
                        type="button"
                        className="btn-toggle-pass"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                      </button>
                    </div>

                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '0.85rem'}}>
                      <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#64748b', fontWeight: '500'}}>
                        <input type="checkbox" style={{marginRight: '8px', accentColor: '#007a4d', width: '16px', height: '16px'}} /> Remember me
                      </label>
                      <button type="button" onClick={handleForgotPassword} style={{color: '#007a4d', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', padding: 0}}>Forgot Password?</button>
                    </div>

                    <button type="submit" className="btn-login" disabled={isLoading}>
                      {isLoading ? (
                        <><i className="fas fa-spinner fa-spin me-2"></i> Authenticating...</>
                      ) : (
                        'LOGIN'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    <div className="custom-input-group">
                      <div className="custom-input-icon"><i className="fas fa-lock"></i></div>
                      <input
                        type="password"
                        name="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="custom-input"
                        placeholder="New password"
                        required
                      />
                    </div>

                    <div className="custom-input-group">
                      <div className="custom-input-icon"><i className="fas fa-lock"></i></div>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="custom-input"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-login" disabled={isLoading}>
                      {isLoading ? (
                        <><i className="fas fa-spinner fa-spin me-2"></i> Updating...</>
                      ) : (
                        'SET NEW PASSWORD'
                      )}
                    </button>

                    <div style={{textAlign: 'center', marginTop: '16px'}}>
                      <button type="button" onClick={() => { setAuthMode('login'); setError(null); }} style={{color: '#007a4d', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', padding: 0}}>Back to sign-in</button>
                    </div>
                  </form>
                )}
              </div>

              <div className="sd-demo-panel">
                <h3>Try a demo account</h3>
                <p>Tap an account to fill the sign-in form.</p>

                <div className="demo-grid">
                  <button type="button" onClick={fillDemoStudent} className="btn-demo-student">
                    <i className="fas fa-user-graduate"></i>
                    <span>Demo Student</span>
                  </button>
                  <button type="button" onClick={fillDemoTeacher} className="btn-demo-teacher">
                    <i className="fas fa-chalkboard-teacher"></i>
                    <span>Demo Teacher</span>
                  </button>
                </div>

                <div style={{marginTop: '18px', fontSize: '0.9rem'}}>
                  For partnerships and purchases, call{' '}<b>08162337303</b>
                </div>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      <PencilCursor />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
