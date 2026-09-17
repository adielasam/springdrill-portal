const fs = require('fs');
let dashboardHtml = fs.readFileSync('public/teacher_dashboard.html', 'utf8');

function generatePage(title, activeTab, innerContent, extraScript = '') {
    let page = dashboardHtml;
    page = page.replace('<title>SPRINGDRILL - Staff Dashboard</title>', `<title>SPRINGDRILL - ${title}</title>`);
    
    // Update active tab
    page = page.replace('<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item active">Overview</div></a>', '<a href="teacher_dashboard.html" style="text-decoration:none;"><div class="tab-item">Overview</div></a>');
    page = page.replace(`<a href="${activeTab.url}" style="text-decoration:none;"><div class="tab-item">${activeTab.name}</div></a>`, `<a href="${activeTab.url}" style="text-decoration:none;"><div class="tab-item active">${activeTab.name}</div></a>`);
    
    const contentStart = page.indexOf('<div class="content-grid">');
    const contentEnd = page.indexOf('</div>\r\n\r\n    </div>\r\n\r\n    <script', contentStart) || page.indexOf('</div>\n\n    </div>\n\n    <script', contentStart);
    
    if (contentStart > -1) {
        const beforeContent = page.substring(0, contentStart);
        const scriptPos = page.indexOf('<script type="module">');
        const afterContent = page.substring(scriptPos);
        page = beforeContent + innerContent + '\n    </div>\n\n    ' + afterContent.replace('</script>', extraScript + '\n</script>');
    }
    return page;
}

const enrollmentContent = `
        <div class="p-4 bg-white" style="min-height: 80vh;">
            <div class="panel border-0 shadow-sm mb-4">
                <div class="panel-header bg-success text-white"><i class="fas fa-filter"></i> Select Teaching Group</div>
                <div class="panel-body bg-light border border-success border-top-0 border-opacity-25 rounded-bottom">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label text-muted small fw-bold text-uppercase">Class</label>
                            <select class="form-select border-success border-opacity-50" id="enrollClassFilter">
                                <option value="">-- Select Class --</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label text-muted small fw-bold text-uppercase">Subject</label>
                            <select class="form-select border-success border-opacity-50" id="enrollSubjectFilter" disabled>
                                <option value="">-- Select Subject --</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="panel border-0 shadow-sm text-center py-3">
                        <h6 class="text-muted small text-uppercase fw-bold">Class Students</h6>
                        <h2 id="statClassStudents">0</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="panel border-0 shadow-sm text-center py-3">
                        <h6 class="text-muted small text-uppercase fw-bold">Assigned To This Teacher</h6>
                        <h2 id="statAssignedHere" class="text-success">0</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="panel border-0 shadow-sm text-center py-3">
                        <h6 class="text-muted small text-uppercase fw-bold">Assigned Elsewhere</h6>
                        <h2 id="statAssignedElsewhere" class="text-warning">0</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="panel border-0 shadow-sm text-center py-3">
                        <h6 class="text-muted small text-uppercase fw-bold">Pending Changes</h6>
                        <h2 id="statPending" class="text-danger">0</h2>
                    </div>
                </div>
            </div>

            <div class="panel border-0 shadow-sm">
                <div class="panel-header bg-light text-dark fw-bold">
                    <i class="fas fa-users me-2"></i> <span id="lblListTitle">Class List</span>
                </div>
                <div class="panel-body p-0">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="text-muted small text-uppercase table-light">
                            <tr>
                                <th width="50">
                                    <input type="checkbox" id="checkAll" class="form-check-input">
                                </th>
                                <th>Student Name</th>
                                <th>Reg Number</th>
                                <th>Enrollment Status</th>
                            </tr>
                        </thead>
                        <tbody id="enrollTableBody">
                            <tr><td colspan="4" class="text-center py-5 text-muted">Select a class and subject to view students</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="panel-footer bg-light p-3 text-end" id="actionFooter" style="display: none;">
                    <button class="btn btn-success fw-bold px-4 shadow-sm" id="btnSaveEnr" onclick="saveEnrollments()"><i class="fas fa-save me-2"></i> Save Enrollments</button>
                </div>
            </div>
        </div>
`;

const enrollmentScript = `
        let currentStudents = [];
        let currentEnrollments = [];
        
        document.addEventListener('DOMContentLoaded', async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            // Load unique classes from teacher's subjects
            const { data: subjects } = await supabase.from('subjects').select('id, name, class_id, classes(name)').eq('teacher_id', session.user.id);
            if (subjects) {
                const classSelect = document.getElementById('enrollClassFilter');
                const uniqueClasses = {};
                subjects.forEach(sub => {
                    if (sub.classes) uniqueClasses[sub.class_id] = sub.classes.name;
                });
                
                Object.keys(uniqueClasses).forEach(cid => {
                    classSelect.innerHTML += \`<option value="\${cid}">\${uniqueClasses[cid]}</option>\`;
                });

                classSelect.addEventListener('change', (e) => {
                    const cid = e.target.value;
                    const subSelect = document.getElementById('enrollSubjectFilter');
                    subSelect.innerHTML = '<option value="">-- Select Subject --</option>';
                    if (!cid) {
                        subSelect.disabled = true;
                        return;
                    }
                    subSelect.disabled = false;
                    subjects.filter(s => s.class_id === cid).forEach(sub => {
                        subSelect.innerHTML += \`<option value="\${sub.id}">\${sub.name}</option>\`;
                    });
                });
                
                document.getElementById('enrollSubjectFilter').addEventListener('change', window.loadStudentsForEnrollment);
                
                document.getElementById('checkAll').addEventListener('change', (e) => {
                    document.querySelectorAll('.stu-checkbox').forEach(cb => cb.checked = e.target.checked);
                });
            }
        });

        window.loadStudentsForEnrollment = async function() {
            const cid = document.getElementById('enrollClassFilter').value;
            const sid = document.getElementById('enrollSubjectFilter').value;
            const tbody = document.getElementById('enrollTableBody');
            const actionFooter = document.getElementById('actionFooter');
            
            if (!cid || !sid) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">Select a class and subject to view students</td></tr>';
                actionFooter.style.display = 'none';
                return;
            }
            
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><i class="fas fa-spinner fa-spin text-success fa-2x"></i></td></tr>';
            
            try {
                // Fetch all students in the class
                const { data: students } = await supabase.from('students').select('user_id, first_name, surname, reg_number').eq('class_id', cid).order('surname', {ascending: true});
                currentStudents = students || [];
                
                // Fetch enrollments for this subject
                const { data: enrolls } = await supabase.from('student_subjects').select('*').eq('subject_id', sid);
                currentEnrollments = enrolls || [];
                
                let html = '';
                let assignedHere = 0;
                
                currentStudents.forEach(st => {
                    const enr = currentEnrollments.find(e => e.student_id === st.user_id);
                    const isChecked = enr && enr.status === 'approved' ? 'checked' : '';
                    let statusBadge = '<span class="badge bg-secondary">Not Enrolled</span>';
                    
                    if (enr) {
                        if (enr.status === 'approved') {
                            assignedHere++;
                            statusBadge = '<span class="badge bg-success">Enrolled</span>';
                        } else if (enr.status === 'pending') {
                            statusBadge = '<span class="badge bg-warning text-dark">Pending Approval</span>';
                        }
                    }
                    
                    html += \`
                        <tr>
                            <td>
                                <input type="checkbox" class="form-check-input stu-checkbox" value="\${st.user_id}" \${isChecked}>
                            </td>
                            <td class="fw-bold">\${st.surname} \${st.first_name}</td>
                            <td class="text-muted">\${st.reg_number || 'N/A'}</td>
                            <td>\${statusBadge}</td>
                        </tr>
                    \`;
                });
                
                if (currentStudents.length === 0) {
                    html = '<tr><td colspan="4" class="text-center py-5 text-muted">No students found in this class.</td></tr>';
                    actionFooter.style.display = 'none';
                } else {
                    actionFooter.style.display = 'block';
                }
                
                tbody.innerHTML = html;
                
                document.getElementById('statClassStudents').innerText = currentStudents.length;
                document.getElementById('statAssignedHere').innerText = assignedHere;
                
                const selSubject = document.getElementById('enrollSubjectFilter');
                document.getElementById('lblListTitle').innerText = selSubject.options[selSubject.selectedIndex].text + ' Class List';
                
            } catch(e) {
                tbody.innerHTML = \`<tr><td colspan="4" class="text-center py-5 text-danger">\${e.message}</td></tr>\`;
            }
        };

        window.saveEnrollments = async function() {
            const btn = document.getElementById('btnSaveEnr');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const sid = document.getElementById('enrollSubjectFilter').value;
                
                const selectedStudentIds = Array.from(document.querySelectorAll('.stu-checkbox:checked')).map(cb => cb.value);
                
                // Delete existing enrollments for this subject
                await supabase.from('student_subjects').delete().eq('subject_id', sid);
                
                // Insert new enrollments
                if (selectedStudentIds.length > 0) {
                    const inserts = selectedStudentIds.map(stId => ({
                        student_id: stId,
                        subject_id: sid,
                        teacher_id: session.user.id,
                        status: 'approved'
                    }));
                    await supabase.from('student_subjects').insert(inserts);
                }
                
                alert('Enrollments saved successfully!');
                window.loadStudentsForEnrollment();
            } catch(e) { alert(e.message); } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-2"></i> Save Enrollments';
            }
        };
`;

fs.writeFileSync('public/teacher_subject_enrollment.html', generatePage('Subject Enrollment', {name: 'Overview', url: 'teacher_dashboard.html'}, enrollmentContent, enrollmentScript));
console.log('teacher_subject_enrollment.html created!');
