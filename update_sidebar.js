const fs = require('fs');
let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

const reportMenu = `
            <div class="sidebar-heading">Reports</div>
            
            <a class="nav-link" data-bs-toggle="collapse" href="#juniorReportMenu" role="button" aria-expanded="false" aria-controls="juniorReportMenu">
                <i data-lucide="file-bar-chart"></i> Junior School Report
                <i class="fas fa-chevron-down ms-auto" style="font-size: 10px;"></i>
            </a>
            <div class="collapse" id="juniorReportMenu">
                <nav class="nav flex-column ms-3 mb-2" style="border-left: 2px solid var(--brand-100);">
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Report Setup</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Reports View</a>
                    <a href="admin_approve_reports.html" class="nav-link py-1" style="font-size: 13px;">Approve Reports</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Promotion Manager</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Transfer Manager</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Process Reports</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Publish Report</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Report Entry</a>
                </nav>
            </div>

            <a class="nav-link" data-bs-toggle="collapse" href="#highReportMenu" role="button" aria-expanded="false" aria-controls="highReportMenu">
                <i data-lucide="file-bar-chart"></i> High School Report
                <i class="fas fa-chevron-down ms-auto" style="font-size: 10px;"></i>
            </a>
            <div class="collapse" id="highReportMenu">
                <nav class="nav flex-column ms-3 mb-2" style="border-left: 2px solid var(--brand-100);">
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Report Setup</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Reports View</a>
                    <a href="admin_approve_reports.html" class="nav-link py-1" style="font-size: 13px;">Approve Reports</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Process Reports</a>
                    <a href="#" class="nav-link py-1" style="font-size: 13px;">Publish Report</a>
                </nav>
            </div>
`;

if (!html.includes('id="juniorReportMenu"')) {
    html = html.replace('<div class="sidebar-heading">Operations</div>', reportMenu + '\n            <div class="sidebar-heading">Operations</div>');
    fs.writeFileSync('public/admin_dashboard.html', html);
    console.log('Sidebar updated');
}
