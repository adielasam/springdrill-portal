const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const logoReplacement = '<img src="dorvas-logo.png" alt="Dorvas Logo" style="max-height: 50px; padding: 5px;" />';

// Replace in all HTML files in public/
fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Pattern 1: sidebar-brand span
        const p1 = /<span><i class="fas fa-layer-group"><\/i>\s*SPRINGDRILL<\/span>/g;
        if (p1.test(content)) {
            content = content.replace(p1, logoReplacement);
            modified = true;
        }

        // Pattern 2: logo-area h4
        const p2 = /<h4 class="text-success fw-bold mb-0">SPRINGDRILL<\/h4>/g;
        if (p2.test(content)) {
            content = content.replace(p2, logoReplacement);
            modified = true;
        }
        
        // Pattern 3: any other SPRINGDRILL header in logo-area
        const p3 = /<div class="logo-area">\s*<h4.*?>.*?<\/h4>\s*<\/div>/g;
        // wait, I don't want to over-replace. Let's just do p1 and p2.

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log('Replaced logo in', file);
        }
    }
});

// Replace in app/page.tsx
const appPage = 'app/page.tsx';
if (fs.existsSync(appPage)) {
    let content = fs.readFileSync(appPage, 'utf8');
    let modified = false;

    // Preloader logo
    if (content.includes('src="/logo.png"')) {
        content = content.replace(/src="\/logo\.png"/g, 'src="/dorvas-logo.png"');
        modified = true;
    }

    // Main login left logo
    const loginLeftRegex = /<i className="fas fa-graduation-cap"><\/i>\s*<h2>SPRINGDRILL<\/h2>/;
    if (loginLeftRegex.test(content)) {
        content = content.replace(loginLeftRegex, '<img src="/dorvas-logo.png" alt="Dorvas Logo" style={{maxHeight: "80px", marginBottom: "15px"}} />\n            <h2 style={{color: "white"}}>SPRINGDRILL</h2>');
        modified = true;
    } else if (/<i class="fas fa-graduation-cap"><\/i>\s*<h2>SPRINGDRILL<\/h2>/.test(content)) {
        // sometimes written with class instead of className if they just pasted HTML
        content = content.replace(/<i class="fas fa-graduation-cap"><\/i>\s*<h2>SPRINGDRILL<\/h2>/, '<img src="/dorvas-logo.png" alt="Dorvas Logo" style={{maxHeight: "80px", marginBottom: "15px"}} />\n            <h2 style={{color: "white"}}>SPRINGDRILL</h2>');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(appPage, content);
        console.log('Replaced logo in app/page.tsx');
    }
}
