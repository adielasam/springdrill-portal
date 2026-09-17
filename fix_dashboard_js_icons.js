const fs = require('fs');

let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

// 1. Remove statPending assignment
html = html.replace("document.getElementById('statPending').innerText = pendingCount || 0;", "");

// 2. Add icons to the stat blocks
html = html.replace('<div class="stat-val" id="statActiveStudents">', '<i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.9;"></i>\n                      <div class="stat-val" id="statActiveStudents">');
html = html.replace('<div class="stat-val" id="statMale">', '<i data-lucide="user" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.9;"></i>\n                      <div class="stat-val" id="statMale">');
html = html.replace('<div class="stat-val" id="statFemale">', '<i data-lucide="user" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.9;"></i>\n                      <div class="stat-val" id="statFemale">');
html = html.replace('<div class="stat-val" id="statClasses">', '<i data-lucide="library" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.9;"></i>\n                      <div class="stat-val" id="statClasses">');
html = html.replace('<div class="stat-val" id="statTeachers">', '<i data-lucide="briefcase" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.9;"></i>\n                      <div class="stat-val" id="statTeachers">');

fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Fixed JS error and added icons');
