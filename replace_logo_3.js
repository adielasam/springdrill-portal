const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const logoHTMLStudent = '<h5 class="text-white fw-bold m-0"><img src="dorvas-logo.png" alt="Dorvas" style="max-height: 40px; margin-right: 10px;" /></h5>';

fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        const p1 = /<h5.*?>\s*<i class="fas fa-graduation-cap.*?<\/i>\s*SPRINGDRILL\s*<\/h5>/gi;
        if (p1.test(content)) {
            content = content.replace(p1, logoHTMLStudent);
            modified = true;
        }

        const p2 = /<i class="fas fa-graduation-cap fa-2x.*?<\/i>\s*SPRINGDRILL/gi;
        if (p2.test(content)) {
            content = content.replace(p2, '<img src="dorvas-logo.png" alt="Dorvas" style="max-height: 40px; margin-right: 10px;" />');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Replaced logo in', file);
        }
    }
});
