'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmxyopohngslqvzknjnt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl';
const supabase = createClient(supabaseUrl, supabaseKey);

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  // Nav-click logo transition: a full-screen deep-green overlay shows the
  // wordmark animating in before the page scrolls to the clicked section.
  const [navOverlay, setNavOverlay] = useState<null | { leaving: boolean }>(null);
  const navTimers = useRef<number[]>([]);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset state
  const [authMode, setAuthMode] = useState<'login' | 'reset'>('login');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setShowPreloader(false), 800);
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
    navTimers.current.push(window.setTimeout(() => { setNavOverlay(null); go(); }, 950));
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
      <style>{`
        @keyframes preloader-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes sd-logo-letter-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sd-overlay-bar { from { width: 0; } to { width: 120px; } }

        html { scroll-behavior: smooth; }

        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* globals.css centres the body with flex; a full landing page needs normal flow. */
        body { display: block; background: #ffffff; }

        .sd-page { color: #1c2b25; background: #ffffff; }
        .sd-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .sd-section { padding: 96px 0; scroll-margin-top: 80px; border-top: 1px solid #e6efe9; }
        .sd-section-soft { background: #f3f7f4; }
        .sd-eyebrow { font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #007a4d; margin: 0 0 12px 0; }
        .sd-h2 { font-size: 1.9rem; font-weight: 800; line-height: 1.25; margin: 0 0 16px 0; color: #123227; }

        /* Header */
        .sd-header { position: sticky; top: 0; z-index: 100; background: #ffffff; border-bottom: 1px solid #dce6df; }
        .sd-header-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .sd-wordmark { font-size: 1.4rem; font-weight: 800; color: #004d34; text-decoration: none; letter-spacing: -0.5px; }
        .sd-nav { display: flex; align-items: center; gap: 28px; }
        .sd-nav a { color: #1c2b25; text-decoration: none; font-size: 0.95rem; font-weight: 500; }
        .sd-nav a:hover { color: #007a4d; }
        .sd-btn { display: inline-block; background: #007a4d; color: #ffffff; border: none; border-radius: 6px; padding: 11px 20px; font-weight: 700; font-size: 0.95rem; cursor: pointer; text-decoration: none; }
        .sd-btn:hover { background: #005c3a; color: #ffffff; }
        .sd-btn-outline { display: inline-block; background: #ffffff; color: #004d34; border: 1px solid #004d34; border-radius: 6px; padding: 11px 20px; font-weight: 700; font-size: 0.95rem; cursor: pointer; text-decoration: none; }
        .sd-btn-outline:hover { background: #f3f7f4; color: #004d34; }

        /* Hero */
        .sd-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; padding: 96px 0; }
        .sd-hero h1 { font-size: 3.1rem; font-weight: 800; line-height: 1.15; letter-spacing: -1px; margin: 0 0 20px 0; color: #123227; }
        .sd-hero p { font-size: 1.15rem; line-height: 1.7; color: #5a6b63; margin: 0 0 32px 0; }
        .sd-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
        .sd-hero img { width: 100%; height: 340px; object-fit: cover; border-radius: 16px; border: 1px solid #dce6df; display: block; }

        /* Features */
        .sd-feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 40px; }
        .sd-feature { border: 1px solid #dce6df; border-radius: 12px; padding: 28px 24px; background: #ffffff; }
        .sd-feature i { font-size: 1.6rem; color: #007a4d; margin-bottom: 16px; }
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
        .sd-audience i { font-size: 1.4rem; color: #007a4d; margin-top: 2px; }
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
        .sd-signin-header h2 { color: #123227; font-weight: 800; margin: 0; font-size: 1.5rem; }
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
        .sd-nav-overlay.sd-leaving { opacity: 0; pointer-events: none; }
        .sd-overlay-wordmark { color: #ffffff; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
        .sd-overlay-wordmark span { display: inline-block; opacity: 0; animation: sd-logo-letter-in 0.45s ease forwards; }
        .sd-overlay-bar { height: 2px; background: rgba(255, 255, 255, 0.65); width: 0; margin-top: 16px; animation: sd-overlay-bar 0.6s ease 0.25s forwards; }

        /* Scroll-reveal (classes added from JS; content stays visible without JS) */
        .sd-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .sd-reveal.is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .sd-reveal { opacity: 1; transform: none; transition: none; }
          .sd-overlay-wordmark span { animation: none; opacity: 1; }
          .sd-overlay-bar { animation: none; width: 120px; }
        }

        /* Footer */
        .sd-footer { background: #004d34; color: #ffffff; padding: 48px 0 32px 0; }
        .sd-footer-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        .sd-footer h3 { margin: 0 0 10px 0; font-size: 1.25rem; font-weight: 800; }
        .sd-footer p { margin: 0; font-size: 0.95rem; line-height: 1.65; color: rgba(255, 255, 255, 0.85); max-width: 420px; }
        .sd-footer a { color: #ffffff; text-decoration: none; }
        .sd-footer a:hover { text-decoration: underline; }
        .sd-footer-contact p { margin-bottom: 6px; }
        .sd-footer-copy { max-width: 1100px; margin: 32px auto 0 auto; padding: 24px 24px 0 24px; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); text-align: center; }

        @media (max-width: 900px) {
          .sd-hero { grid-template-columns: 1fr; gap: 32px; padding: 56px 0; }
          .sd-hero h1 { font-size: 2.1rem; }
          .sd-hero img { height: 260px; }
          .sd-feature-grid { grid-template-columns: repeat(2, 1fr); }
          .sd-step-grid { grid-template-columns: 1fr; }
          .sd-section { padding: 64px 0; }
        }

        @media (max-width: 600px) {
          .sd-nav a { display: none; }
          .sd-hero h1 { font-size: 1.8rem; }
          .sd-hero p { font-size: 1.05rem; }
          .sd-feature-grid { grid-template-columns: 1fr; }
          .sd-audience-grid { grid-template-columns: 1fr; }
          .sd-signin-card { padding: 28px 20px; }
          .demo-grid { flex-direction: column; }
          .sd-h2 { font-size: 1.6rem; }
        }
      `}</style>

      {showPreloader && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: '#ffffff', zIndex: 99999, display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'opacity 0.5s ease-out'
        }}>
          <div style={{position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              border: '4px solid #f3f3f3', borderTop: '4px solid #004d34', borderBottom: '4px solid #004d34',
              borderRadius: '50%', animation: 'preloader-spin 1s linear infinite', zIndex: 1
            }}></div>
            <span style={{fontSize: '1.05rem', fontWeight: 800, color: '#004d34', zIndex: 2}}>SpringDrill</span>
          </div>
        </div>
      )}

      {navOverlay && (
        <div className={`sd-nav-overlay${navOverlay.leaving ? ' sd-leaving' : ''}`} aria-hidden="true">
          <div className="sd-overlay-wordmark">
            {'SpringDrill'.split('').map((letter, i) => (
              <span key={i} style={{ animationDelay: `${i * 45}ms` }}>{letter}</span>
            ))}
          </div>
          <div className="sd-overlay-bar" />
        </div>
      )}

      <div className="sd-page" id="top">
        <header className="sd-header">
          <div className="sd-header-inner">
            <a href="#top" className="sd-wordmark" onClick={(e) => handleNavClick(e, '#top')}>SpringDrill</a>
            <nav className="sd-nav">
              <a href="#features" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
              <a href="#how" onClick={(e) => handleNavClick(e, '#how')}>How it works</a>
              <a href="#schools" onClick={(e) => handleNavClick(e, '#schools')}>For schools</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, '#contact')}>Contact</a>
              <a href="#signin" className="sd-btn" onClick={(e) => handleNavClick(e, '#signin')}>Portal sign-in</a>
            </nav>
          </div>
        </header>

        <main>
          <section className="sd-wrap">
            <div className="sd-hero">
              <div>
                <h1>Report cards in minutes, not weekends.</h1>
                <p>SpringDrill helps Nigerian schools set CBT tests, mark them, auto-collate results and print report cards, generate lesson plans with AI, and give students JAMB practice.</p>
                <div className="sd-hero-actions">
                  <a href="#signin" className="sd-btn" onClick={(e) => handleNavClick(e, '#signin')}>Sign in to your portal</a>
                  <a href="#how" className="sd-btn-outline" onClick={(e) => handleNavClick(e, '#how')}>See how it works</a>
                </div>
              </div>
              <img src="/springvalleyclass.jpg" alt="Students in a classroom" />
            </div>
          </section>

          <section id="features" className="sd-section sd-section-soft">
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">What SpringDrill does</p>
              <h2 className="sd-h2">Everything a school needs to run exams and results.</h2>
              <div className="sd-feature-grid">
                <div className="sd-feature">
                  <i className="fas fa-chart-line"></i>
                  <h3>Results &amp; report cards</h3>
                  <p>Scores from class tests and exams are added up automatically into totals, averages and positions, and printed as report cards. No hand calculation, no spreadsheet wrangling.</p>
                </div>
                <div className="sd-feature">
                  <i className="fas fa-clipboard-check"></i>
                  <h3>CBT tests</h3>
                  <p>Teachers set timed computer-based tests from the question bank. Students answer on screen, and scores are recorded straight away.</p>
                </div>
                <div className="sd-feature">
                  <i className="fas fa-book-open"></i>
                  <h3>AI lesson plans</h3>
                  <p>Teachers generate lesson plans with AI from the scheme of work, then edit them before use.</p>
                </div>
                <div className="sd-feature">
                  <i className="fas fa-graduation-cap"></i>
                  <h3>JAMB practice</h3>
                  <p>Students practise with JAMB-style questions in the UTME Simulator and see their scores and progress over time.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="how" className="sd-section">
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">How it works</p>
              <h2 className="sd-h2">Three steps, from test to report card.</h2>
              <div className="sd-step-grid">
                <div className="sd-step">
                  <div className="sd-step-num">1</div>
                  <h3>Teacher sets the test</h3>
                  <p>A teacher picks a class and subject, sets questions from the bank, and opens the test.</p>
                </div>
                <div className="sd-step">
                  <div className="sd-step-num">2</div>
                  <h3>Students take it</h3>
                  <p>Students log in, answer on screen, and submit. Scores are recorded immediately.</p>
                </div>
                <div className="sd-step">
                  <div className="sd-step-num">3</div>
                  <h3>Results are ready</h3>
                  <p>Totals, averages and positions are worked out automatically, and report cards print in minutes.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="schools" className="sd-section sd-section-soft">
            <div className="sd-wrap" data-reveal>
              <p className="sd-eyebrow">Who it is for</p>
              <h2 className="sd-h2">Built for the whole school.</h2>
              <div className="sd-audience-grid">
                <div className="sd-audience">
                  <i className="fas fa-school"></i>
                  <div>
                    <h3>Schools</h3>
                    <p>Run exams, results and report cards from one portal.</p>
                  </div>
                </div>
                <div className="sd-audience">
                  <i className="fas fa-chalkboard-teacher"></i>
                  <div>
                    <h3>Teachers</h3>
                    <p>Set tests, enter scores, and plan lessons without the paperwork.</p>
                  </div>
                </div>
                <div className="sd-audience">
                  <i className="fas fa-user-graduate"></i>
                  <div>
                    <h3>Students</h3>
                    <p>Practise for JAMB and see your own results and progress.</p>
                  </div>
                </div>
                <div className="sd-audience">
                  <i className="fas fa-users"></i>
                  <div>
                    <h3>Parents</h3>
                    <p>Follow your child&apos;s results and report cards through the parent portal.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="signin" className="sd-section">
            <div className="sd-wrap" data-reveal>
              <div className="sd-signin-card">
                <div className="sd-signin-header">
                  <h2>{authMode === 'reset' ? 'Set a new password' : 'Sign in to your portal'}</h2>
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
                  For partnerships and purchases, call <b>08162337303</b>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer id="contact" className="sd-footer">
          <div className="sd-footer-inner">
            <div>
              <h3>SpringDrill</h3>
              <p>CBT tests, results and report cards for Nigerian schools.</p>
            </div>
            <div className="sd-footer-contact">
              <p>Phone: <a href="tel:+2348162337303">08162337303</a></p>
              <p>Email: <a href="mailto:adielasam2015@gmail.com">adielasam2015@gmail.com</a></p>
            </div>
          </div>
          <div className="sd-footer-copy">
            Copyright &copy; 2026 <b>SpringDrill</b> | All Rights Reserved
          </div>
        </footer>
      </div>
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
