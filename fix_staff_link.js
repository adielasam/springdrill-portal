const fs = require('fs');
let content = fs.readFileSync('public/admin_dashboard.html', 'utf8');
content = content.replace("onclick=\"window.location.href='manage_users.html'\" style=\"cursor:pointer;\" title=\"Manage staff and teachers\"", "onclick=\"window.location.href='teacher_list'\" style=\"cursor:pointer;\" title=\"View all teachers\"");
fs.writeFileSync('public/admin_dashboard.html', content);
console.log('Updated admin_dashboard.html staff link');
