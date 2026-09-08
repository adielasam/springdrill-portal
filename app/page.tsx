'use client';

import { login } from './actions';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);

    const theme = localStorage.getItem('SPRINGDRILL_THEME');
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      setIsDark(true);
    }
  }, [searchParams]);

  const toggleTheme = () => {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const dark = body.classList.contains('dark-mode');
    localStorage.setItem('SPRINGDRILL_THEME', dark ? 'dark' : 'light');
    setIsDark(dark);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    // Let the form naturally submit to the action
    // We are just hooking in to show loading state
  };

  return (
    <>
      <button className="dark-toggle-btn" onClick={toggleTheme} title="Toggle Dark Mode">
        <i className={isDark ? 'fas fa-sun text-warning' : 'fas fa-moon'} id="themeIcon"></i>
      </button>

      <div className="login-wrapper">
        <div className="login-left">
          <i className="fas fa-graduation-cap"></i>
          <h2>SPRINGDRILL</h2>
          <p>The ultimate digital infrastructure for modern schools. Manage CBT, Results, eClassrooms, and Administration all in one secure place.</p>
        </div>

        <div className="login-right">
          <div className="demo-box">
            <h6 className="fw-bold mb-2" style={{ color: '#007a4d' }}>
              <i className="fas fa-rocket text-warning me-2"></i>Test Drive the Portal!
            </h6>
            <p className="small mb-3" style={{ color: 'var(--text-color)' }}>
              Want to see how this system works? Try it using the demo credentials below:
            </p>

            <div className="row g-2">
              <div className="col-sm-6">
                <div className="demo-creds shadow-sm">
                  <div className="demo-title"><i className="fas fa-user-graduate me-1"></i> Student Login</div>
                  <span className="text-muted">Email:</span> <span className="fw-bold text-primary" style={{ wordBreak: 'break-all' }}>sam.john4331@springdrill.edu</span><br />
                  <span className="text-muted">Pass:</span> <span className="fw-bold text-dark">Spring7067!</span>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="demo-creds shadow-sm">
                  <div className="demo-title"><i className="fas fa-chalkboard-teacher me-1"></i> Teacher Login</div>
                  <span className="text-muted">Email:</span> <span className="fw-bold text-primary" style={{ wordBreak: 'break-all' }}>chukwuemaka.john1560@springdrill.edu</span><br />
                  <span className="text-muted">Pass:</span> <span className="fw-bold text-dark">Spring1187!</span>
                </div>
              </div>
            </div>

            <div className="partnership-btn shadow-sm">
              <i className="fas fa-handshake me-2"></i> For Partnership & Purchase: 08162337303
            </div>
          </div>

          <h3>Account Login</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form action={login} onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label"><i className="fas fa-envelope me-1"></i> USERNAME OR EMAIL</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-user"></i></span>
                <input type="email" name="email" className="form-control" placeholder="Enter your registered email" required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label"><i className="fas fa-lock me-1"></i> PASSWORD</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-key"></i></span>
                <input type="password" name="password" className="form-control" placeholder="Enter your secure password" required />
              </div>
            </div>

            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" id="rememberMe" style={{ accentColor: '#007a4d' }} />
              <label className="form-check-label small fw-bold" htmlFor="rememberMe" style={{ color: 'var(--text-muted)' }}>
                Remember me
              </label>
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin me-2"></i> Authenticating...</>
              ) : (
                <>Secure Sign In <i className="fas fa-arrow-right ms-2"></i></>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
