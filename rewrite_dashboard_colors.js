const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

// 1. Add new color classes to CSS
const oldCssBlock = `.icon-3d svg { width: 16px; height: 16px; stroke-width: 2.5; }`;
const newCssBlock = `.icon-3d svg { width: 16px; height: 16px; stroke-width: 2.5; }
        .icon-3d-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }
        .icon-3d-teal { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); box-shadow: 0 2px 4px rgba(13, 148, 136, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }
        .icon-3d-violet { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }
        .icon-3d-amber { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 2px 4px rgba(217, 119, 6, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }
        .icon-3d-coral { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); box-shadow: 0 2px 4px rgba(225, 29, 72, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }
        .icon-3d-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3), inset 0 1px 1px rgba(255,255,255,0.3); }`;
html = html.replace(oldCssBlock, newCssBlock);

// 2. Fix Quick Action borders to match hover colors
const oldQuickAction = `.quick-action-btn:hover { border-color: var(--brand-500); transform: translateY(-2px); box-shadow: var(--shadow-md); color: var(--text-main); }`;
const newQuickAction = `.quick-action-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); color: var(--text-main); }
        .qa-blue:hover { border-color: #3b82f6; }
        .qa-violet:hover { border-color: #8b5cf6; }
        .qa-amber:hover { border-color: #f59e0b; }`;
html = html.replace(oldQuickAction, newQuickAction);

// 3. Update Stat Cards (replace existing icon classes with the new vibrant palette)
html = html.replace('<div class="icon-3d icon-3d-info"><i data-lucide="users"></i></div>', '<div class="icon-3d icon-3d-blue"><i data-lucide="users"></i></div>');
html = html.replace('<div class="icon-3d icon-3d-neutral"><i data-lucide="user"></i></div>', '<div class="icon-3d icon-3d-teal"><i data-lucide="user"></i></div>'); // Male
html = html.replace('<div class="icon-3d icon-3d-neutral"><i data-lucide="user"></i></div>', '<div class="icon-3d icon-3d-coral"><i data-lucide="user"></i></div>'); // Female (since there are 2 neutrals, only one will be replaced first, so I use a regex)

// Safely replace Stat Cards using regex to target specific labels
html = html.replace(/<span class="stat-label">Male<\/span>[\s\S]*?<div class="icon-3d[^"]*">/g, '<span class="stat-label">Male</span>\n                        <div class="icon-3d icon-3d-teal">');
html = html.replace(/<span class="stat-label">Female<\/span>[\s\S]*?<div class="icon-3d[^"]*">/g, '<span class="stat-label">Female</span>\n                        <div class="icon-3d icon-3d-coral">');
html = html.replace(/<span class="stat-label">Classes<\/span>[\s\S]*?<div class="icon-3d[^"]*">/g, '<span class="stat-label">Classes</span>\n                        <div class="icon-3d icon-3d-violet">');
html = html.replace(/<span class="stat-label">Staff<\/span>[\s\S]*?<div class="icon-3d[^"]*">/g, '<span class="stat-label">Staff</span>\n                        <div class="icon-3d icon-3d-green">');
html = html.replace(/<span class="stat-label">Pending<\/span>[\s\S]*?<div class="icon-3d[^"]*">/g, '<span class="stat-label">Pending</span>\n                        <div class="icon-3d icon-3d-amber">');

// 4. Update Quick Actions HTML
const quickActionsOld = `<div class="row g-4 mb-5">
            <div class="col-12 col-md-4">
                <a href="admin_create_user" class="quick-action-btn">
                    <div class="icon-3d"><i data-lucide="user-plus"></i></div>
                    <span>Create Account</span>
                </a>
            </div>
            <div class="col-12 col-md-4">
                <a href="class_list" class="quick-action-btn">
                    <div class="icon-3d icon-3d-info"><i data-lucide="library"></i></div>
                    <span>Manage Classes</span>
                </a>
            </div>
            <div class="col-12 col-md-4">
                <a href="admin_attendance" class="quick-action-btn">
                    <div class="icon-3d icon-3d-warning"><i data-lucide="calendar-check"></i></div>
                    <span>Log Attendance</span>
                </a>
            </div>
        </div>`;

const quickActionsNew = `<div class="row g-4 mb-5">
            <div class="col-12 col-md-4">
                <a href="admin_create_user" class="quick-action-btn qa-blue">
                    <div class="icon-3d icon-3d-blue"><i data-lucide="user-plus"></i></div>
                    <span>Create Account</span>
                </a>
            </div>
            <div class="col-12 col-md-4">
                <a href="class_list" class="quick-action-btn qa-violet">
                    <div class="icon-3d icon-3d-violet"><i data-lucide="library"></i></div>
                    <span>Manage Classes</span>
                </a>
            </div>
            <div class="col-12 col-md-4">
                <a href="admin_attendance" class="quick-action-btn qa-amber">
                    <div class="icon-3d icon-3d-amber"><i data-lucide="calendar-check"></i></div>
                    <span>Log Attendance</span>
                </a>
            </div>
        </div>`;
html = html.replace(quickActionsOld, quickActionsNew);

// Fallback for Quick Actions if the exact string match fails
html = html.replace(/<a href="admin_create_user" class="quick-action-btn">[\s\S]*?<div class="icon-3d[^"]*">/g, '<a href="admin_create_user" class="quick-action-btn qa-blue">\n                    <div class="icon-3d icon-3d-blue">');
html = html.replace(/<a href="class_list" class="quick-action-btn">[\s\S]*?<div class="icon-3d[^"]*">/g, '<a href="class_list" class="quick-action-btn qa-violet">\n                    <div class="icon-3d icon-3d-violet">');
html = html.replace(/<a href="admin_attendance" class="quick-action-btn">[\s\S]*?<div class="icon-3d[^"]*">/g, '<a href="admin_attendance" class="quick-action-btn qa-amber">\n                    <div class="icon-3d icon-3d-amber">');

// 5. Update Chart.js logic to use the color palette array
const chartOld1 = `backgroundColor: '#10b981',`;
const chartNew1 = `backgroundColor: ['#2563eb', '#0d9488', '#f43f5e', '#7c3aed', '#059669', '#f59e0b', '#3b82f6', '#14b8a6', '#e11d48', '#8b5cf6', '#10b981', '#d97706'],`;
const chartOld2 = `borderRadius: 4,`;
const chartNew2 = `borderRadius: 4, barPercentage: 0.6,`;
html = html.replace(chartOld1, chartNew1).replace(chartOld2, chartNew2);

// 6. Make stat cards layout icon on top right
const oldStatCard = `.stat-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
        .stat-label { font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .stat-value { font-size: 32px; font-weight: 700; color: var(--text-main); line-height: 1; letter-spacing: -1px; }`;
const newStatCard = `.stat-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
        .stat-label { font-size: 14px; font-weight: 600; color: var(--text-muted); margin-top: 4px; }
        .stat-value { font-size: 36px; font-weight: 700; color: var(--text-main); line-height: 1; letter-spacing: -1px; margin-top: auto; }`;
html = html.replace(oldStatCard, newStatCard);


fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Successfully updated dashboard visual design to colorful SaaS layout.');
