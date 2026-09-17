const fs = require('fs');
let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');
const oldColors = `const bgColors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#0d9488', '#14b8a6', '#2dd4bf'];`;
const newColors = `const bgColors = ['#2563eb', '#0d9488', '#f43f5e', '#7c3aed', '#059669', '#f59e0b', '#3b82f6', '#14b8a6', '#e11d48', '#8b5cf6', '#10b981', '#d97706'];`;
html = html.replace(oldColors, newColors);
fs.writeFileSync('public/admin_dashboard.html', html);
console.log('Fixed chart colors');
