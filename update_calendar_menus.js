const fs = require('fs');

function addMenu(file) {
    let html = fs.readFileSync(file, 'utf8');

    const calendarMenu = `
            <a href="#calendarMenu" data-bs-toggle="collapse" class="nav-link d-flex justify-content-between align-items-center">
                <span><i class="fas fa-calendar-day"></i> Calendar</span>
                <i class="fas fa-caret-down me-2"></i>
            </a>
            <div class="collapse" id="calendarMenu">
                <a href="view_calendar.html" class="nav-link ps-4"><i class="fas fa-calendar-alt me-2"></i> View Calendar</a>
                <a href="manage_calendar.html" class="nav-link ps-4"><i class="fas fa-cog me-2"></i> Manage Calendar</a>
            </div>
    `;

    html = html.replace(/<a href="#" class="nav-link" onclick="alert\('Calendar coming soon'\)"><i class="fas fa-calendar-day"><\/i> Calendar<\/a>/, calendarMenu);
    
    fs.writeFileSync(file, html);
    console.log('Added Calendar menu to ' + file);
}

addMenu('public/teacher_dashboard.html');
addMenu('public/admin_dashboard.html');
addMenu('public/student_dashboard.html');
