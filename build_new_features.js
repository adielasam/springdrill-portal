const fs = require('fs');

// Read the base dashboard to extract the sidebar and header
let dashboardHtml = fs.readFileSync('public/teacher_dashboard.html', 'utf8');

// Function to generate a page with the shared layout
function generatePage(title, activeTab, innerContent, extraScript = '') {
    let page = dashboardHtml;
    page = page.replace('<title>SPRINGDRILL - Staff Dashboard</title>', `<title>SPRINGDRILL - ${title}</title>`);
    
    // Update active tab
    page = page.replace('<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item active">Overview</div></a>', '<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item">Overview</div></a>');
    page = page.replace(`<a href="${activeTab.url}" style="text-decoration:none;"><div class="tab-item">${activeTab.name}</div></a>`, `<a href="${activeTab.url}" style="text-decoration:none;"><div class="tab-item active">${activeTab.name}</div></a>`);
    
    // Replace content grid
    const contentStart = page.indexOf('<div class="content-grid">');
    const contentEnd = page.indexOf('</div>\r\n\r\n    </div>\r\n\r\n    <script', contentStart) || page.indexOf('</div>\n\n    </div>\n\n    <script', contentStart);
    
    if (contentStart > -1) {
        // We will just replace the inner contents of main-content after tabs
        const beforeContent = page.substring(0, contentStart);
        const scriptPos = page.indexOf('<script type="module">');
        const afterContent = page.substring(scriptPos);
        page = beforeContent + innerContent + '\n    </div>\n\n    ' + afterContent.replace('</script>', extraScript + '\n</script>');
    }
    
    // Also update the sidebar to change the active link if necessary, and add Assignments
    // Add Assignments Quick Link
    page = page.replace('<a href="teacher_subjects.html" class="quick-link-item">\r\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\r\n                <div class="quick-link-text">Assignments</div>\r\n            </a>', '<a href="teacher_assignments.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>');
    page = page.replace('<a href="teacher_subjects.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>', '<a href="teacher_assignments.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>');
    
    return page;
}

// 1. My Students Page (teacher_my_students.html)
const myStudentsContent = `
        <div class="p-4">
            <div class="panel border-0 shadow-sm mb-4">
                <div class="panel-header bg-success text-white"><i class="fas fa-filter"></i> Select Filter</div>
                <div class="panel-body bg-white">
                    <div class="row align-items-center mb-3">
                        <div class="col-md-2 text-end fw-bold text-muted small">Student form:</div>
                        <div class="col-md-8">
                            <select class="form-select" id="formFilter">
                                <option value="Subject Students">Subject Students</option>
                            </select>
                        </div>
                    </div>
                    <div class="row align-items-center">
                        <div class="col-md-2 text-end fw-bold text-muted small">Subject:</div>
                        <div class="col-md-8">
                            <select class="form-select" id="subjectFilter">
                                <option value="">Loading your subjects...</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel border-0 shadow-sm">
                <div class="panel-body p-0">
                    <table class="table table-hover table-striped mb-0 align-middle">
                        <thead class="table-light text-muted small">
                            <tr>
                                <th width="50">#</th>
                                <th>Full Name</th>
                                <th>Reg No</th>
                            </tr>
                        </thead>
                        <tbody id="studentsTableBody">
                            <tr><td colspan="3" class="text-center py-4 text-muted">Select a subject to view enrolled students</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
`;

const myStudentsScript = `
        document.addEventListener('DOMContentLoaded', async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            // Load subjects assigned to this teacher
            const { data: subjects } = await supabase.from('subjects').select('id, name, class_id, classes(name)').eq('teacher_id', session.user.id);
            const subjectSelect = document.getElementById('subjectFilter');
            if (subjects && subjects.length > 0) {
                subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
                subjects.forEach(sub => {
                    subjectSelect.innerHTML += \`<option value="\${sub.id}">\${sub.name} (\${sub.classes?.name || 'Unknown Class'})</option>\`;
                });
            } else {
                subjectSelect.innerHTML = '<option value="">No subjects assigned to you yet</option>';
            }

            subjectSelect.addEventListener('change', async (e) => {
                const subjId = e.target.value;
                const tbody = document.getElementById('studentsTableBody');
                if (!subjId) {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Select a subject to view enrolled students</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><i class="fas fa-spinner fa-spin text-success fa-2x"></i></td></tr>';
                
                // Fetch approved enrollments
                const { data: enrollments, error } = await supabase
                    .from('student_subjects')
                    .select('students(user_id, first_name, surname, reg_number)')
                    .eq('subject_id', subjId)
                    .eq('status', 'approved');
                    
                if (error) {
                    tbody.innerHTML = \`<tr><td colspan="3" class="text-danger py-4 text-center">\${error.message}</td></tr>\`;
                    return;
                }
                
                if (!enrollments || enrollments.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No students are currently approved/enrolled for this subject.</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                enrollments.forEach((enrol, idx) => {
                    const st = enrol.students;
                    if(!st) return;
                    tbody.innerHTML += \`
                        <tr>
                            <td class="fw-bold text-muted">\${idx + 1}</td>
                            <td class="fw-bold">\${st.surname} \${st.first_name}</td>
                            <td class="text-muted">\${st.reg_number || 'N/A'}</td>
                        </tr>
                    \`;
                });
            });
        });
`;

fs.writeFileSync('public/teacher_my_students.html', generatePage('My Students', {name: 'My Students', url: 'teacher_my_students.html'}, myStudentsContent, myStudentsScript));


// 2. Assignments Page (teacher_assignments.html)
const assignmentsContent = `
        <div class="p-4 bg-white" style="min-height: 80vh;">
            <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <h5 class="fw-bold text-danger text-uppercase mb-0" style="letter-spacing: 1px;">My Assignments</h5>
                <button class="btn btn-success fw-bold" onclick="new bootstrap.Modal(document.getElementById('addAssignmentModal')).show()">
                    <i class="fas fa-plus me-2"></i> Create Assignment
                </button>
            </div>

            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="text-muted small text-uppercase">
                        <tr>
                            <th width="50">#</th>
                            <th>Subject</th>
                            <th>Class</th>
                            <th>Assignment Title</th>
                            <th>Due Date</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="assignmentsTableBody">
                        <tr><td colspan="6" class="text-center py-5"><i class="fas fa-spinner fa-spin text-success fa-2x"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Create Assignment Modal -->
        <div class="modal fade" id="addAssignmentModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title"><i class="fas fa-plus-circle me-2"></i> Create New Assignment</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Subject</label>
                            <select class="form-select" id="newAssignSubject"></select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Assignment Title / Focus</label>
                            <input type="text" class="form-control" id="newAssignTitle" placeholder="e.g. Chapter 3 Exercises">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Description / Instructions</label>
                            <textarea class="form-control" id="newAssignDesc" rows="3"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Due Date</label>
                            <input type="datetime-local" class="form-control" id="newAssignDue">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Attach File (Optional)</label>
                            <input type="file" class="form-control" id="newAssignFile">
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success fw-bold px-4" id="btnSaveAssignment" onclick="saveAssignment()">Upload Assignment</button>
                    </div>
                </div>
            </div>
        </div>
`;

const assignmentsScript = `
        let mySubjectsMap = {};
        
        document.addEventListener('DOMContentLoaded', async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            // Load subjects
            const { data: subjects } = await supabase.from('subjects').select('id, name, class_id, classes(name)').eq('teacher_id', session.user.id);
            const select = document.getElementById('newAssignSubject');
            if (subjects) {
                subjects.forEach(sub => {
                    mySubjectsMap[sub.id] = { name: sub.name, className: sub.classes?.name, classId: sub.class_id };
                    select.innerHTML += \`<option value="\${sub.id}">\${sub.name} (\${sub.classes?.name})</option>\`;
                });
            }
            
            loadAssignments();
        });

        async function loadAssignments() {
            const { data: { session } } = await supabase.auth.getSession();
            const tbody = document.getElementById('assignmentsTableBody');
            
            const { data: assignments, error } = await supabase
                .from('assignments')
                .select('*, subjects(name), classes(name)')
                .eq('teacher_id', session.user.id)
                .order('created_at', { ascending: false });
                
            if (error) {
                tbody.innerHTML = \`<tr><td colspan="6" class="text-danger text-center py-4">\${error.message}</td></tr>\`;
                return;
            }
            
            if (!assignments || assignments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">You have not created any assignments yet.</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            assignments.forEach((asn, idx) => {
                const dueDateStr = asn.due_date ? new Date(asn.due_date).toLocaleString() : 'No Due Date';
                const fileLink = asn.file_url ? \`<a href="\${asn.file_url}" target="_blank" class="btn btn-sm btn-outline-primary ms-2" title="View Attachment"><i class="fas fa-paperclip"></i></a>\` : '';
                
                tbody.innerHTML += \`
                    <tr>
                        <td class="fw-bold">\${idx + 1}</td>
                        <td class="fw-bold text-dark">\${asn.subjects?.name || 'N/A'}</td>
                        <td class="text-muted">\${asn.classes?.name || 'N/A'}</td>
                        <td>\${asn.title}</td>
                        <td class="text-danger small fw-bold">\${dueDateStr}</td>
                        <td class="text-end">
                            \${fileLink}
                            <button class="btn btn-sm btn-primary fw-bold ms-2" onclick="alert('Manage submissions coming soon')"><i class="fas fa-cog me-1"></i> Manage</button>
                            <button class="btn btn-sm btn-danger fw-bold ms-1" onclick="deleteAssignment('\${asn.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                \`;
            });
        }

        window.saveAssignment = async function() {
            const btn = document.getElementById('btnSaveAssignment');
            btn.innerHTML = 'Uploading...';
            btn.disabled = true;
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const subjId = document.getElementById('newAssignSubject').value;
                if (!subjId) throw new Error("Please select a subject.");
                
                const title = document.getElementById('newAssignTitle').value;
                if (!title) throw new Error("Please enter a title.");
                
                let fileUrl = null;
                const fileInput = document.getElementById('newAssignFile');
                if (fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const fileName = \`assign_\${Date.now()}_\${file.name}\`;
                    const { error: uploadError } = await supabase.storage.from('assignments').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    
                    const { data: publicData } = supabase.storage.from('assignments').getPublicUrl(fileName);
                    fileUrl = publicData.publicUrl;
                }
                
                const { error } = await supabase.from('assignments').insert({
                    title: title,
                    description: document.getElementById('newAssignDesc').value,
                    due_date: document.getElementById('newAssignDue').value || null,
                    subject_id: subjId,
                    class_id: mySubjectsMap[subjId].classId,
                    teacher_id: session.user.id,
                    file_url: fileUrl
                });
                
                if (error) throw error;
                
                bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal')).hide();
                loadAssignments();
                alert('Assignment created successfully!');
                
            } catch(e) {
                alert('Error: ' + e.message);
            } finally {
                btn.innerHTML = 'Upload Assignment';
                btn.disabled = false;
            }
        };

        window.deleteAssignment = async function(id) {
            if(!confirm('Delete this assignment?')) return;
            await supabase.from('assignments').delete().eq('id', id);
            loadAssignments();
        }
`;

fs.writeFileSync('public/teacher_assignments.html', generatePage('Assignments', {name: 'Overview', url: 'teacher_dashboard.html'}, assignmentsContent, assignmentsScript));


// 3. Update dashboard tabs logic in teacher_dashboard.html itself
let dashHtml = fs.readFileSync('public/teacher_dashboard.html', 'utf8');
dashHtml = dashHtml.replace('<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item active">Overview</div></a>', '<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item active">Overview</div></a>');
dashHtml = dashHtml.replace('<a href="teacher_subjects.html" style="text-decoration:none;"><div class="tab-item">My Subjects</div></a>', '<a href="teacher_subjects.html" style="text-decoration:none;"><div class="tab-item">My Subjects</div></a>');
dashHtml = dashHtml.replace('<a href="class_list.html" style="text-decoration:none;"><div class="tab-item">My Students</div></a>', '<a href="teacher_my_students.html" style="text-decoration:none;"><div class="tab-item">My Students</div></a>');
dashHtml = dashHtml.replace('<a href="teacher_subjects.html" class="quick-link-item">\r\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\r\n                <div class="quick-link-text">Assignments</div>\r\n            </a>', '<a href="teacher_assignments.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>');
dashHtml = dashHtml.replace('<a href="teacher_subjects.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>', '<a href="teacher_assignments.html" class="quick-link-item">\n                <div class="circle-icon circle-green"><i class="fas fa-edit"></i></div>\n                <div class="quick-link-text">Assignments</div>\n            </a>');

// Inject Subjects Dropdown in Sidebar for teacher_dashboard.html
const sidebarSubjectsOld = '<a href="teacher_subjects.html" class="nav-link"><i class="fas fa-book"></i> Subjects</a>';
const sidebarSubjectsNew = `
            <a href="#subjectsMenu" data-bs-toggle="collapse" class="nav-link d-flex justify-content-between align-items-center">
                <span><i class="fas fa-book"></i> Subjects</span>
                <i class="fas fa-caret-down me-2"></i>
            </a>
            <div class="collapse" id="subjectsMenu">
                <a href="teacher_subjects.html" class="nav-link"><i class="fas fa-edit"></i> Subjects Overview</a>
                <a href="teacher_subject_enrollment.html" class="nav-link"><i class="fas fa-users"></i> Subjects Enrollment</a>
            </div>
`;
dashHtml = dashHtml.replace(sidebarSubjectsOld, sidebarSubjectsNew);

fs.writeFileSync('public/teacher_dashboard.html', dashHtml);
console.log('Generated new pages and updated dashboard tabs.');
