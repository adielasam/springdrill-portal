const fs = require('fs');
let html = fs.readFileSync('public/admin_dashboard.html', 'utf8');

const newUI = `
        <div class="page-header mt-4">
            <h1>Approve Reports</h1>
            <p>Review submitted term results and teacher comments before publishing.</p>
        </div>

        <div class="premium-card p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold m-0"><i data-lucide="check-circle" class="text-success me-2"></i> Submitted Reports Pending Review</h5>
                <div class="d-flex gap-2">
                    <select id="filterClass" class="form-select w-auto">
                        <option value="">All Classes</option>
                    </select>
                    <select id="filterTerm" class="form-select w-auto">
                        <option value="">All Terms</option>
                        <option value="1">First Term</option>
                        <option value="2">Second Term</option>
                        <option value="3">Third Term</option>
                    </select>
                    <button class="btn btn-success" id="loadReportsBtn">Load Reports</button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Term / Sub-Term</th>
                            <th>1st CAT</th>
                            <th>2nd CAT</th>
                            <th>Exam</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="reportsTableBody">
                        <tr>
                            <td colspan="10" class="text-center py-4 text-muted">Select filters and click Load Reports</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                <button class="btn btn-outline-danger me-2"><i data-lucide="x-circle" class="me-2"></i>Reject Selected</button>
                <button class="btn btn-success"><i data-lucide="check-check" class="me-2"></i>Publish Approved Reports</button>
            </div>
        </div>
`;

// Extract everything up to <!-- TOPBAR -->... actually wait, the main content is right after <div class="main-content"> ... <div class="top-navbar"> ... </div>
// Let's replace the whole main-content children after top-navbar.

let startIdx = html.indexOf('<div class="row mb-4">');
if (startIdx === -1) startIdx = html.indexOf('<div class="row');
const endIdx = html.indexOf('<script type="module">');

if (startIdx !== -1 && endIdx !== -1) {
    let newHtml = html.substring(0, startIdx) + newUI + '\n    </div>\n    ' + html.substring(endIdx);
    
    // Also change the active class in sidebar
    newHtml = newHtml.replace('<a href="admin_dashboard" class="nav-link active">', '<a href="admin_dashboard" class="nav-link">');
    newHtml = newHtml.replace('<a href="admin_approve_reports.html" class="nav-link py-1"', '<a href="admin_approve_reports.html" class="nav-link py-1 active text-success fw-bold"');
    newHtml = newHtml.replace('SpringDrill / <span>Dashboard</span>', 'SpringDrill / Reports / <span>Approve Reports</span>');

    fs.writeFileSync('public/admin_approve_reports.html', newHtml);
    console.log("Created admin_approve_reports.html!");
} else {
    console.log("Could not find insertion points.");
}
