const fs = require('fs');
const path = require('path');
const publicDir = 'public';

fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        const badPattern = /<div class="sidebar-brand">\s*<img src="dorvas-logo\.png" alt="Dorvas" style="max-height: 50px;" \/>\s*<\/div>\s*<h4>SpringDrill<\/h4>\s*<\/div>/g;
        
        if (badPattern.test(content)) {
            content = content.replace(badPattern, '<div class="sidebar-brand">\n            <img src="dorvas-logo.png" alt="Dorvas" style="max-height: 50px;" />\n        </div>');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Fixed', file);
        }
    }
});
