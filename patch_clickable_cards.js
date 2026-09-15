const fs = require('fs');

let content = fs.readFileSync('public/admin_dashboard.html', 'utf8');

// Replace stat cards to be clickable
const replacements = [
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Total Students</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='class_list.html'" style="cursor:pointer;" title="View all classes and students">\n                    <div class="stat-header">\n                        <span class="stat-label">Total Students</span>`
    },
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Male</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='class_list.html'" style="cursor:pointer;" title="View all students">\n                    <div class="stat-header">\n                        <span class="stat-label">Male</span>`
    },
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Female</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='class_list.html'" style="cursor:pointer;" title="View all students">\n                    <div class="stat-header">\n                        <span class="stat-label">Female</span>`
    },
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Classes</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='class_list.html'" style="cursor:pointer;" title="Manage classes">\n                    <div class="stat-header">\n                        <span class="stat-label">Classes</span>`
    },
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Staff</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='manage_users.html'" style="cursor:pointer;" title="Manage staff and teachers">\n                    <div class="stat-header">\n                        <span class="stat-label">Staff</span>`
    },
    {
        from: `<div class="premium-card stat-card">\n                    <div class="stat-header">\n                        <span class="stat-label">Pending</span>`,
        to: `<div class="premium-card stat-card" onclick="window.location.href='manage_users.html'" style="cursor:pointer;" title="View pending approvals">\n                    <div class="stat-header">\n                        <span class="stat-label">Pending</span>`
    }
];

let successCount = 0;
replacements.forEach(rep => {
    // Handling CRLF vs LF issues in case they exist
    const regexFrom = new RegExp(rep.from.replace(/\\n/g, '\\r?\\n'), 'g');
    if (regexFrom.test(content)) {
        content = content.replace(regexFrom, rep.to);
        successCount++;
    }
});

if (successCount === replacements.length) {
    fs.writeFileSync('public/admin_dashboard.html', content);
    console.log("Successfully patched admin_dashboard.html");
} else {
    console.error("Failed to patch all stat cards. Success count: " + successCount);
}
