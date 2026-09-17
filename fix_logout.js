const fs = require('fs');

const logoutLogic = `
        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
                window.location.href = '/';
            });
        }
`;

function addLogout(file) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('logoutBtn.addEventListener')) {
            content = content.replace("document.addEventListener('DOMContentLoaded', initializeDashboard);", logoutLogic + "\n        document.addEventListener('DOMContentLoaded', initializeDashboard);");
            fs.writeFileSync(file, content);
            console.log('Fixed logout in ' + file);
        }
    } catch(e) {}
}

addLogout('public/teacher_dashboard.html');
addLogout('public/admin_dashboard.html');
addLogout('public/student_dashboard.html');
