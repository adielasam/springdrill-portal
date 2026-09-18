'use client';

import { useEffect, useState, Suspense } from 'react';
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

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowPreloader(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(err);
  }, [searchParams]);

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
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileErr || !profile) throw new Error('Could not verify account role.');

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

  return (
    <>
      <style>{`
        @keyframes preloader-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .login-page-bg {
          background-color: #f0fdf4;
          background-image: 
            radial-gradient(at 40% 20%, hsla(153, 80%, 80%, 0.5) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(153, 80%, 80%, 0.5) 0px, transparent 50%);
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          flex-direction: column;
          box-sizing: border-box;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          padding: 45px 40px;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
        }

        .login-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .login-header img {
          max-height: 55px;
          margin-bottom: 15px;
        }

        .login-header h2 {
          color: #007a4d;
          font-weight: 800;
          margin: 0;
          font-size: 1.6rem;
          letter-spacing: -0.5px;
        }

        .login-header p {
          color: #64748b;
          margin-top: 8px;
          font-size: 0.95rem;
        }

        .custom-input-group {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }

        .custom-input-group:focus-within {
          border-color: #007a4d;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 122, 77, 0.1);
        }

        .custom-input-icon {
          padding: 14px 16px;
          color: #94a3b8;
          background: transparent;
        }

        .custom-input-group:focus-within .custom-input-icon {
          color: #007a4d;
        }

        .custom-input {
          border: none;
          padding: 14px 10px 14px 0;
          width: 100%;
          background: transparent;
          outline: none;
          color: #334155;
          font-size: 0.95rem;
        }

        .btn-toggle-pass {
          background: transparent;
          border: none;
          padding: 0 15px;
          color: #94a3b8;
          cursor: pointer;
        }

        .btn-toggle-pass:hover { color: #64748b; }
        .btn-toggle-pass:focus { outline: none; }

        .btn-login {
          background: #007a4d;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          width: 100%;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
          box-shadow: 0 4px 12px rgba(0, 122, 77, 0.2);
        }

        .btn-login:hover {
          background: #006640;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 122, 77, 0.3);
        }

        .btn-login:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .demo-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #334155;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 25px 30px;
          margin-top: 25px;
          width: 100%;
          max-width: 440px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.04);
        }

        .demo-grid {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        .btn-demo-student, .btn-demo-teacher {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
        }

        .btn-demo-student i { color: #3b82f6; font-size: 1.1rem; }
        .btn-demo-teacher i { color: #10b981; font-size: 1.1rem; }

        .btn-demo-student:hover, .btn-demo-teacher:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .footer-text {
          margin-top: 40px;
          color: #64748b;
          font-size: 0.85rem;
          text-align: center;
        }
      `}</style>
      
      {showPreloader && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: '#ffffff', zIndex: 99999, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', transition: 'opacity 0.5s ease-out'
        }}>
          <div style={{position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              border: '4px solid #f3f3f3', borderTop: '4px solid #004d34', borderBottom: '4px solid #004d34',
              borderRadius: '50%', animation: 'preloader-spin 1s linear infinite', zIndex: 1
            }}></div>
            <img src="/dorvas-logo.png" alt="Logo" style={{width: 60, height: 60, zIndex: 2}} onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=SD&background=004d34&color=fff&rounded=true'
            }}/>
          </div>
        </div>
      )}

      <div className="login-page-bg">
        <div className="glass-panel">
          <div className="login-header">
            <img src="/dorvas-logo.png" alt="SpringDrill Logo" />
            <h2>Please Sign in</h2>
            <p>Welcome to SpringDrill Portal</p>
          </div>

          {error && <div className="alert alert-danger" style={{color: '#b91c1c', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', border: '1px solid #fecaca'}}>{error}</div>}
          
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
              <a href="#" style={{color: '#007a4d', textDecoration: 'none', fontWeight: '600'}}>Forgot Password?</a>
            </div>

            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? (
                <><i className="fas fa-spinner fa-spin me-2"></i> Authenticating...</>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>

        <div className="demo-panel">
          <h5 style={{margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700', fontSize: '1.1rem'}}><i className="fas fa-rocket me-2 text-warning"></i> Demo Access</h5>
          <p style={{margin: '0', fontSize: '0.9rem', color: '#64748b'}}>Select an account to auto-fill the login form instantly.</p>
          
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
          
          <div style={{marginTop: '25px', fontSize: '0.9rem', color: '#475569', fontWeight: '500'}}>
            <i className="fas fa-handshake me-2 text-primary"></i> For Partnership & Purchase: <b style={{color: '#0f172a'}}>08162337303</b>
          </div>
        </div>

        <div className="footer-text">
          Copyright &copy; 2026 <b>SpringDrill</b> | All Rights Reserved
        </div>
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

