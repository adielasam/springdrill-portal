const fs = require('fs');

const preloaderHtml = `
    <style>
        #preloader {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #ffffff;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.5s ease-out;
        }
        .preloader-logo-wrap {
            position: relative;
            width: 100px; height: 100px;
            display: flex; align-items: center; justify-content: center;
        }
        .preloader-logo-wrap img {
            width: 60px; height: 60px;
            z-index: 2;
        }
        .preloader-spinner {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #004d34;
            border-bottom: 4px solid #004d34;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            z-index: 1;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    <div id="preloader">
        <div class="preloader-logo-wrap">
            <div class="preloader-spinner"></div>
            <img src="/logo.png" alt="Logo" onerror="this.src='https://ui-avatars.com/api/?name=SD&background=004d34&color=fff&rounded=true'">
        </div>
    </div>
    <script>
        window.addEventListener('load', () => {
            const loader = document.getElementById('preloader');
            if(loader) {
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => loader.remove(), 500);
                }, 800);
            }
        });
    </script>
`;

const addPreloader = (path) => {
    try {
        let html = fs.readFileSync(path, 'utf8');
        if (!html.includes('preloader-logo-wrap')) {
            html = html.replace('<body>', '<body>\n' + preloaderHtml);
            fs.writeFileSync(path, html);
            console.log('Preloader added to ' + path);
        }
    } catch(e) {}
};

addPreloader('public/login.html');
addPreloader('public/admin_dashboard.html');
addPreloader('public/teacher_dashboard.html');
addPreloader('public/student_dashboard.html');
addPreloader('public/index.html');
