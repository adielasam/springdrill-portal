const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

function get3DIcon(type, colorKey, hexStart, hexEnd) {
    let path = '';
    if (type === 'users') path = `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`;
    if (type === 'user') path = `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`;
    if (type === 'book') path = `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>`;
    if (type === 'briefcase') path = `<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`;
    if (type === 'clock') path = `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`;
    if (type === 'user-plus') path = `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/>`;
    if (type === 'calendar-check') path = `<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>`;

    // NO ESCAPING of $ here. This is evaluated in Node before replacing into HTML.
    return `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="vol-grad-${colorKey}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${hexStart}" />
                <stop offset="100%" stop-color="${hexEnd}" />
            </linearGradient>
            <filter id="vol-shadow-${colorKey}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="${hexEnd}" flood-opacity="0.4" />
            </filter>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="14" ry="14" fill="url(#vol-grad-${colorKey})" filter="url(#vol-shadow-${colorKey})" />
        <rect x="4" y="4" width="40" height="40" rx="14" ry="14" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.3" />
        <g transform="translate(12, 12)" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))">
            ${path}
        </g>
    </svg>
    `.trim();
}

// 1. Replace all flat icon wrappers in Stat Cards
html = html.replace(/<div class="icon-3d icon-3d-blue"><i data-lucide="users"><\/i><\/div>/g, get3DIcon('users', 'blue', '#3b82f6', '#2563eb'));
html = html.replace(/<div class="icon-3d icon-3d-teal"><i data-lucide="user"><\/i><\/div>/g, get3DIcon('user', 'teal', '#14b8a6', '#0d9488'));
html = html.replace(/<div class="icon-3d icon-3d-coral"><i data-lucide="user"><\/i><\/div>/g, get3DIcon('user', 'coral', '#f43f5e', '#e11d48'));
html = html.replace(/<div class="icon-3d icon-3d-violet"><i data-lucide="library"><\/i><\/div>/g, get3DIcon('book', 'violet', '#8b5cf6', '#7c3aed'));
html = html.replace(/<div class="icon-3d icon-3d-green"><i data-lucide="briefcase"><\/i><\/div>/g, get3DIcon('briefcase', 'green', '#10b981', '#059669'));
html = html.replace(/<div class="icon-3d icon-3d-amber"><i data-lucide="clock"><\/i><\/div>/g, get3DIcon('clock', 'amber', '#f59e0b', '#d97706'));

// 2. Replace all flat icon wrappers in Quick Actions
html = html.replace(/<div class="icon-3d icon-3d-blue"><i data-lucide="user-plus"><\/i><\/div>/g, get3DIcon('user-plus', 'blue', '#3b82f6', '#2563eb'));
html = html.replace(/<div class="icon-3d icon-3d-violet"><i data-lucide="library"><\/i><\/div>/g, get3DIcon('book', 'violet', '#8b5cf6', '#7c3aed'));
html = html.replace(/<div class="icon-3d icon-3d-amber"><i data-lucide="calendar-check"><\/i><\/div>/g, get3DIcon('calendar-check', 'amber', '#f59e0b', '#d97706'));

// 3. Fix the "Classes" stat card bug
const oldChartLogic = `const labels = Object.keys(classCounts);`;
const newChartLogic = `const labels = Object.keys(classCounts);
                document.getElementById('statClasses').innerText = labels.length;`;
html = html.replace(oldChartLogic, newChartLogic);

const brokenStatClassesCode = `document.getElementById('statClasses').innerText = classCount || 0;`;
html = html.replace(brokenStatClassesCode, `// statClasses is now set by renderClassChart()`);

// 4. Update the Chart bars to use solid colors perfectly matching the palette (Blue, Teal, Coral, Violet, Green, Amber)
const chartJSColorsOld = `const bgColors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf'];`;
const chartJSColorsOldAlt = `const bgColors = ['#2563eb', '#0d9488', '#f43f5e', '#7c3aed', '#059669', '#f59e0b', '#3b82f6', '#14b8a6', '#e11d48', '#8b5cf6', '#10b981', '#d97706'];`;

const chartJSColorsNew = `const bgColors = ['#3b82f6', '#14b8a6', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#2563eb', '#0d9488', '#e11d48', '#7c3aed', '#059669', '#d97706'];`;

if(html.includes(chartJSColorsOld)) {
    html = html.replace(chartJSColorsOld, chartJSColorsNew);
} else if(html.includes(chartJSColorsOldAlt)) {
    html = html.replace(chartJSColorsOldAlt, chartJSColorsNew);
}

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Successfully applied 3D icons, fixed classes stat, and applied chart solid colors.');
