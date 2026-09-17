const fs = require('fs');
const files = ['public/teacher_my_students.html', 'public/teacher_assignments.html', 'public/teacher_subject_enrollment.html'];
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
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(sidebarSubjectsOld, sidebarSubjectsNew);
    fs.writeFileSync(f, content);
});
console.log('Done replacing');
