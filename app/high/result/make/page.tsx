'use client'

import ReportClient from './ReportClient'

export default function MakeReportPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* GLOBAL DARK MODE ENGINE */
        :root { 
            --bg-color: #f4f7fa; 
            --card-bg: #ffffff; 
            --text-color: #333333; 
            --text-muted: #6c757d; 
            --border-color: #e9ecef; 
            --input-bg: #f8f9fa; 
            --stat-icon-bg: #e8f5e9;
        }
        body.dark-mode { 
            --bg-color: #121212; 
            --card-bg: #1e1e1e; 
            --text-color: #e0e0e0; 
            --text-muted: #a0a0a0; 
            --border-color: #333333; 
            --input-bg: #2c2c2c; 
            --stat-icon-bg: #1a2e21;
        }
        body { background-color: var(--bg-color); color: var(--text-color); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow-x: hidden; transition: background-color 0.3s, color 0.3s; }
        
        /* Sidebar Styling */
        .sidebar { width: 260px; position: fixed; top: 0; left: 0; height: 100vh; overflow-y: auto; background: #004d34; color: white; padding-top: 30px; z-index: 1050; transition: transform 0.3s ease; box-shadow: 4px 0 15px rgba(0,0,0,0.1);}
        .sidebar::-webkit-scrollbar { width: 10px; }
        .sidebar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 10px; }
        .sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.6); }
        .sidebar-brand { text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; }
        .nav-link { color: rgba(255,255,255,0.8); padding: 12px 20px; margin: 2px 10px; border-radius: 5px; transition: all 0.3s; display: flex; align-items: center; font-size: 0.95rem; text-decoration: none;}
        .nav-link i { width: 25px; }
        .nav-link:hover, .nav-link.active { background: rgba(255,255,255,0.15); color: white; font-weight: bold; border-left: 4px solid #f1c40f;}
        .main-content { margin-left: 260px; padding: 20px 40px; min-height: 100vh; transition: margin-left 0.3s ease; }
        
        /* Top Navbar */
        .top-navbar { background: var(--card-bg); padding: 15px 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid #007a4d; transition: all 0.3s; }
        .dark-toggle-btn { background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-color); width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
        .dark-toggle-btn:hover { transform: scale(1.1); }
        
        @media (max-width: 992px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.mobile-open { transform: translateX(0); }
            .main-content { margin-left: 0; padding: 15px; }
            .mobile-menu-toggle { display: inline-block !important; }
            .top-navbar { padding: 15px; flex-direction: column; gap: 10px; }
        }
        .mobile-menu-toggle { display: none; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; margin-right: 15px; }
      `}} />

      {/* Sidebar Shell */}
      <div className="sidebar" id="sidebar">
          <div className="sidebar-brand d-flex justify-content-between align-items-center px-3">
              <h5 className="text-white fw-bold m-0"><i className="fas fa-chalkboard-teacher text-warning me-2"></i> STAFF PORTAL</h5>
          </div>
          
          <nav className="nav flex-column mt-3">
              <a href="/teacher_dashboard.html" className="nav-link"><i className="fas fa-home"></i> Dashboard</a>
              
              <div className="px-3 py-1 text-warning small fw-bold mt-2" style={{fontSize: '0.7rem', letterSpacing: '1px'}}>HIGH SCHOOL REPORT</div>
              <a href="/high/result/make" className="nav-link active" style={{background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 'bold', borderLeft: '4px solid #f1c40f'}}>
                  <i className="fas fa-file-alt"></i> Make Report
              </a>
              
              <hr className="mx-3 my-4 border-secondary" />
              <a href="/" className="nav-link text-danger mt-auto"><i className="fas fa-power-off"></i> Secure Logout</a>
          </nav>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
          <div className="top-navbar">
              <div className="d-flex align-items-center">
                  <div className="fw-bold d-none d-md-block" style={{color: 'var(--text-muted)'}}>
                      Home &gt; High School Report &gt; <span className="text-dark fw-bold">Make Report</span>
                  </div>
              </div>
          </div>

          <ReportClient />
      </div>
    </>
  )
}
