const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const logoHTML = '<img src="dorvas-logo.png" alt="Dorvas" style="max-height: 50px;" />';
const logoHTMLStudent = '<h5 class="text-white fw-bold m-0"><img src="dorvas-logo.png" alt="Dorvas" style="max-height: 40px; margin-right: 10px;" /></h5>';

fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Admin Dashboard / Admin Approve Reports / Class List (has <div class="icon-3d">...</div>\n<h4>SpringDrill</h4>)
        const pAdmin = /<div class="sidebar-brand">[\s\S]*?<\/div>/;
        if (content.includes('<h4>SpringDrill</h4>') && pAdmin.test(content)) {
            content = content.replace(pAdmin, `<div class="sidebar-brand">\n            ${logoHTML}\n        </div>`);
            modified = true;
        }

        // Student Dashboard (has <h5 class="text-white fw-bold m-0"><i class="fas fa-graduation-cap text-warning me-2"></i> SPRINGDRILL</h5>)
        const pStudent = /<h5 class="text-white fw-bold m-0"><i class="fas fa-graduation-cap.*?<\/i> SPRINGDRILL<\/h5>/;
        if (pStudent.test(content)) {
            content = content.replace(pStudent, logoHTMLStudent);
            modified = true;
        }
        
        // Some teacher files which weren't replaced? Wait, my previous script did:
        // teacher_dashboard, etc. but maybe it missed others.
        const pTeacher = /<span><i class="fas fa-layer-group"><\/i> SPRINGDRILL<\/span>/;
        if (pTeacher.test(content)) {
            content = content.replace(pTeacher, logoHTML);
            modified = true;
        }

        // The remaining <h4 class="text-success fw-bold mb-0">SPRINGDRILL</h4>
        const pLogoArea = /<h4 class="text-success fw-bold mb-0">SPRINGDRILL<\/h4>/;
        if (pLogoArea.test(content)) {
            content = content.replace(pLogoArea, logoHTML);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Replaced logo in', file);
        }
    }
});
