const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

function get3DIcon(type, colorKey, hexStart, hexEnd) {
    let path = '';
    if (type === 'users') path = `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`;

    return `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="margin: -12px;">
        <defs>
            <linearGradient id="vol-grad-${colorKey}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${hexStart}" />
                <stop offset="100%" stop-color="${hexEnd}" />
            </linearGradient>
            <filter id="vol-shadow-${colorKey}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="${hexEnd}" flood-opacity="0.4" />
            </filter>
        </defs>
        <rect x="6" y="6" width="36" height="36" rx="12" ry="12" fill="url(#vol-grad-${colorKey})" filter="url(#vol-shadow-${colorKey})" />
        <rect x="6" y="6" width="36" height="36" rx="12" ry="12" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.3" />
        <g transform="translate(12, 12)" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))">
            ${path}
        </g>
    </svg>
    `.trim();
}

// Just replace Total Students icon
html = html.replace(/<div class="icon-3d icon-3d-blue"><i data-lucide="users"><\/i><\/div>/, get3DIcon('users', 'blue', '#3b82f6', '#2563eb'));

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Successfully injected single 3D icon for testing.');
