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
  const [isDark, setIsDark] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowPreloader(false), 800);
    return () => clearTimeout(t);
  }, []);

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

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .login-page-bg {
          background: linear-gradient(rgba(0, 77, 52, 0.4), rgba(0, 77, 52, 0.7)), url('/tech3.jpg') no-repeat center center fixed;
          background-size: cover;
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
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.2);
          padding: 40px;
          width: 100%;
          max-width: 450px;
          position: relative;
          z-index: 10;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-header img {
          max-height: 60px;
          margin-bottom: 15px;
        }

        .login-header h2 {
          color: #007a4d;
          font-weight: 700;
          margin: 0;
          font-size: 1.5rem;
        }

        .login-header p {
          color: #666;
          margin-top: 5px;
          font-size: 0.95rem;
        }

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

        .custom-input-icon {
          padding: 12px 15px;
          color: #6c757d;
          background: transparent;
        }

        .custom-input {
          border: none;
          padding: 12px 10px;
          width: 100%;
          background: transparent;
          outline: none;
          color: #333;
        }

        .btn-toggle-pass {
          background: transparent;
          border: none;
          padding: 0 15px;
          color: #6c757d;
          cursor: pointer;
        }

        .btn-toggle-pass:focus {
          outline: none;
        }

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
        }

        .btn-login:hover {
          background: #005c3a;
        }

        .btn-login:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .demo-panel {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          color: white;
          border-radius: 10px;
          padding: 20px;
          margin-top: 30px;
          width: 100%;
          max-width: 700px;
          text-align: center;
        }

        .demo-grid {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          text-align: left;
        }

        .demo-card {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .footer-text {
          margin-top: 30px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          text-align: center;
        }
        
        .footer-text a {
          color: #f1c40f;
          text-decoration: none;
        }
        
        @media (max-width: 768px) {
          .demo-grid { flex-direction: column; }
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

          {error && <div className="alert alert-danger" style={{color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', border: '1px solid #f5c6cb'}}>{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="custom-input-group">
              <div className="custom-input-icon"><i className="fas fa-envelope"></i></div>
              <input type="email" name="email" className="custom-input" placeholder="Email Address" required />
            </div>

            <div className="custom-input-group">
              <div className="custom-input-icon"><i className="fas fa-lock"></i></div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
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
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#555'}}>
                <input type="checkbox" style={{marginRight: '8px', accentColor: '#007a4d'}} /> Remember me
              </label>
              <a href="#" style={{color: '#007a4d', textDecoration: 'none', fontWeight: 'bold'}}>Forgot Password?</a>
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
          <h5 style={{margin: '0 0 5px 0', color: '#f1c40f'}}><i className="fas fa-rocket me-2"></i> Test Drive the Portal</h5>
          <p style={{margin: '0', fontSize: '0.9rem'}}>Experience SpringDrill using these demo credentials</p>
          
          <div className="demo-grid">
            <div className="demo-card">
              <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#3498db'}}><i className="fas fa-user-graduate me-1"></i> Student Login</div>
              <div style={{fontSize: '0.85rem', marginBottom: '4px'}}><span style={{opacity: 0.7}}>Email:</span> <b>sam.john4331@springdrill.edu</b></div>
              <div style={{fontSize: '0.85rem'}}><span style={{opacity: 0.7}}>Pass:</span> <b>Spring7067!</b></div>
            </div>
            <div className="demo-card">
              <div style={{fontWeight: 'bold', marginBottom: '8px', color: '#2ecc71'}}><i className="fas fa-chalkboard-teacher me-1"></i> Teacher Login</div>
              <div style={{fontSize: '0.85rem', marginBottom: '4px'}}><span style={{opacity: 0.7}}>Email:</span> <b>chukwuemaka.john1560@springdrill.edu</b></div>
              <div style={{fontSize: '0.85rem'}}><span style={{opacity: 0.7}}>Pass:</span> <b>Spring1187!</b></div>
            </div>
          </div>
          
          <div style={{marginTop: '15px', fontSize: '0.9rem', color: '#f1c40f'}}>
            <i className="fas fa-handshake me-2"></i> For Partnership & Purchase: <b>08162337303</b>
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

