const fs = require('fs');
let html = fs.readFileSync('public/teacher_attendance.html', 'utf8');

// replace title
html = html.replace('Daily Attendance Tracker', 'View Class Attendance');
html = html.replace('Mark Register', 'Attendance Record');
html = html.replace(/<button class="btn btn-primary btn-lg fw-bold shadow-sm px-5" id="saveBtn"[\s\S]*?<\/button>/, '');

// In renderTable:
// replace buttons with badges
html = html.replace(/<div class="status-group">[\s\S]*?<\/div>/g, 
`<div class="status-group">
    <span class="badge ${'${state === \'Present\' ? \'bg-success\' : state === \'Absent\' ? \'bg-danger\' : state === \'Late\' ? \'bg-warning text-dark\' : \'bg-secondary\'}'}">
        ${'${state || \'Not Marked\'}'}
    </span>
</div>`);

const newLoad = `
        window.loadRoster = async () => {
            currentClassId = document.getElementById('classSelect').value;
            currentDate = document.getElementById('dateSelect').value;

            if (!currentClassId) return alert("Please select a class first.");
            if (!currentDate) return alert("Please select a date.");

            document.getElementById('rosterSection').style.display = 'block';
            document.getElementById('displayDateBadge').innerText = new Date(currentDate).toDateString();
            document.getElementById('rosterBody').innerHTML = '<tr><td colspan="4" class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-success"></i></td></tr>';

            try {
                // Fetch Students
                const { data: students, error } = await supabase.from('students').select('*').eq('class_id', currentClassId).eq('approved', true).order('first_name');
                if (error) throw error;

                if (!students || students.length === 0) {
                    document.getElementById('rosterBody').innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No students found in this class.</td></tr>';
                    return;
                }

                rosterData = students;
                attendanceState = {};
                
                // Fetch Attendance
                const { data: attData } = await supabase.from('attendance').select('student_id, status').eq('class_id', currentClassId).eq('date', currentDate);
                if (attData) {
                    attData.forEach(a => attendanceState[a.student_id] = a.status);
                }

                renderTable();

            } catch (err) {
                document.getElementById('rosterBody').innerHTML = \`<tr><td colspan="4" class="text-center py-5 text-danger">Error: \${err.message}</td></tr>\`;
            }
        };
`;

html = html.replace(/window\.loadRoster = async \(\) => \{[\s\S]*?\};/, newLoad);
html = html.replace(/window\.saveAttendance = async \(\) => \{[\s\S]*?\};/, '');
html = html.replace(/window\.setStatus = \(studentId, status\) => \{[\s\S]*?\};/, '');

// Make sure sidebar active is correct
html = html.replace('href="teacher_attendance.html"', 'href="teacher_attendance.html"'); 

fs.writeFileSync('public/teacher_view_attendance.html', html);
console.log('Created teacher_view_attendance.html');
