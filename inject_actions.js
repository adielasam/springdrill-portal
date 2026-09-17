const fs = require('fs');

let html = fs.readFileSync('public/teacher_student_profile.html', 'utf8');

const modalHTML = `
    <!-- EDIT STUDENT MODAL -->
    <div class="modal fade" id="editStudentModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header" style="background: #004d34; color: white;">
                    <h5 class="modal-title">Edit Student's Information</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4" id="editFormBody">
                    
                    <!-- STEP 1 -->
                    <div id="editStep1" class="edit-step">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Admission Year</label>
                            <input type="text" class="form-control" id="edit_admission_year" placeholder="e.g. 2018">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Reg. Number</label>
                            <input type="text" class="form-control" id="edit_reg_number">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Customer ID (Sage)</label>
                            <input type="text" class="form-control" id="edit_sage_customer_id">
                        </div>
                    </div>

                    <!-- STEP 2 -->
                    <div id="editStep2" class="edit-step" style="display:none;">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Surname</label>
                            <input type="text" class="form-control" id="edit_surname">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">First Name</label>
                            <input type="text" class="form-control" id="edit_first_name">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Middle Name</label>
                            <input type="text" class="form-control" id="edit_other_name">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Gender</label>
                            <select class="form-select" id="edit_gender">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label fw-bold">Imply PTA</label>
                                <select class="form-select" id="edit_imply_pta">
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label fw-bold">Is Last Child</label>
                                <select class="form-select" id="edit_is_last_child">
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3 -->
                    <div id="editStep3" class="edit-step" style="display:none;">
                        <div class="mb-3">
                            <label class="form-label fw-bold">State of Origin</label>
                            <input type="text" class="form-control" id="edit_state_of_origin">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Local Govt Area</label>
                            <input type="text" class="form-control" id="edit_lga">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Present Address</label>
                            <textarea class="form-control" id="edit_address" rows="2"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Permanent Address</label>
                            <textarea class="form-control" id="edit_permanent_address" rows="2"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Boarding Status</label>
                            <select class="form-select" id="edit_boarding_status">
                                <option value="Day">Day</option>
                                <option value="Boarding">Boarding</option>
                            </select>
                        </div>
                    </div>

                    <!-- STEP 4 -->
                    <div id="editStep4" class="edit-step" style="display:none;">
                        <div class="mb-3">
                            <label class="form-label fw-bold">Height</label>
                            <input type="text" class="form-control" id="edit_height" placeholder="e.g. 5ft">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Weight</label>
                            <input type="text" class="form-control" id="edit_weight" placeholder="e.g. 45kg">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Phone Number</label>
                            <input type="text" class="form-control" id="edit_phone_number">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Email</label>
                            <input type="email" class="form-control" id="edit_student_email">
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button type="button" class="btn btn-outline-danger rounded-pill px-4" id="btnModalBack" style="display:none;" onclick="changeStep(-1)">Back</button>
                    <button type="button" class="btn btn-outline-danger rounded-pill px-4" id="btnModalNext" onclick="changeStep(1)">Next</button>
                    <button type="button" class="btn btn-success rounded-pill px-4" id="btnModalSave" style="display:none;" onclick="saveStudentData()">Save changes</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- IMPERSONATE OVERLAY -->
    <div id="impersonateOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.9); z-index:9999; flex-direction:column; align-items:center; justify-content:center;">
        <i data-lucide="loader-2" class="spin mb-3" style="animation: spin 1s linear infinite; width:48px; height:48px; color: #059669;"></i>
        <h4 style="color: #059669; font-weight:700;">Logging in as student...</h4>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
`;

const jsFunctions = `
        let currentStep = 1;
        const totalSteps = 4;
        let currentStudentData = null;

        window.openEditModal = function() {
            if(!currentStudentData) return;
            
            // Populate fields
            document.getElementById('edit_admission_year').value = currentStudentData.admission_year || '';
            document.getElementById('edit_reg_number').value = currentStudentData.reg_number || '';
            document.getElementById('edit_sage_customer_id').value = currentStudentData.sage_customer_id || '';
            document.getElementById('edit_surname').value = currentStudentData.surname || '';
            document.getElementById('edit_first_name').value = currentStudentData.first_name || '';
            document.getElementById('edit_other_name').value = currentStudentData.other_name || '';
            document.getElementById('edit_gender').value = currentStudentData.gender || 'Male';
            document.getElementById('edit_imply_pta').value = currentStudentData.imply_pta ? 'true' : 'false';
            document.getElementById('edit_is_last_child').value = currentStudentData.is_last_child ? 'true' : 'false';
            document.getElementById('edit_state_of_origin').value = currentStudentData.state_of_origin || '';
            document.getElementById('edit_lga').value = currentStudentData.lga || '';
            document.getElementById('edit_address').value = currentStudentData.address || '';
            document.getElementById('edit_permanent_address').value = currentStudentData.permanent_address || '';
            document.getElementById('edit_boarding_status').value = currentStudentData.boarding_status || 'Day';
            document.getElementById('edit_height').value = currentStudentData.height || '';
            document.getElementById('edit_weight').value = currentStudentData.weight || '';
            document.getElementById('edit_phone_number').value = currentStudentData.phone_number || '';
            document.getElementById('edit_student_email').value = currentStudentData.student_email || '';

            currentStep = 1;
            updateModalUI();
            new bootstrap.Modal(document.getElementById('editStudentModal')).show();
        };

        window.changeStep = function(dir) {
            currentStep += dir;
            if(currentStep < 1) currentStep = 1;
            if(currentStep > totalSteps) currentStep = totalSteps;
            updateModalUI();
        };

        window.updateModalUI = function() {
            for(let i=1; i<=totalSteps; i++) {
                document.getElementById('editStep'+i).style.display = (i === currentStep) ? 'block' : 'none';
            }
            document.getElementById('btnModalBack').style.display = (currentStep > 1) ? 'block' : 'none';
            document.getElementById('btnModalNext').style.display = (currentStep < totalSteps) ? 'block' : 'none';
            document.getElementById('btnModalSave').style.display = (currentStep === totalSteps) ? 'block' : 'none';
        };

        window.saveStudentData = async function() {
            const btn = document.getElementById('btnModalSave');
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            const updates = {
                admission_year: document.getElementById('edit_admission_year').value,
                reg_number: document.getElementById('edit_reg_number').value,
                sage_customer_id: document.getElementById('edit_sage_customer_id').value,
                surname: document.getElementById('edit_surname').value,
                first_name: document.getElementById('edit_first_name').value,
                other_name: document.getElementById('edit_other_name').value,
                gender: document.getElementById('edit_gender').value,
                imply_pta: document.getElementById('edit_imply_pta').value === 'true',
                is_last_child: document.getElementById('edit_is_last_child').value === 'true',
                state_of_origin: document.getElementById('edit_state_of_origin').value,
                lga: document.getElementById('edit_lga').value,
                address: document.getElementById('edit_address').value,
                permanent_address: document.getElementById('edit_permanent_address').value,
                boarding_status: document.getElementById('edit_boarding_status').value,
                height: document.getElementById('edit_height').value,
                weight: document.getElementById('edit_weight').value,
                phone_number: document.getElementById('edit_phone_number').value,
                student_email: document.getElementById('edit_student_email').value
            };

            try {
                const { error } = await supabase.from('students').update(updates).eq('user_id', currentStudentData.user_id);
                if (error) throw error;
                alert('Student information updated successfully!');
                window.location.reload();
            } catch (err) {
                alert('Error saving data: ' + err.message);
                btn.innerHTML = 'Save changes';
                btn.disabled = false;
            }
        };

        window.deleteStudent = async function() {
            if(!currentStudentData) return;
            if(!confirm('Are you ABSOLUTELY sure you want to delete ' + currentStudentData.first_name + '? This action cannot be undone!')) return;
            
            try {
                const { error } = await supabase.from('students').delete().eq('user_id', currentStudentData.user_id);
                if(error) throw error;
                alert('Student deleted.');
                window.location.href = 'class_list.html';
            } catch (err) { alert('Failed to delete student: ' + err.message); }
        };

        window.deactivateStudent = async function() {
            if(!currentStudentData) return;
            if(!confirm('Deactivate this account?')) return;
            try {
                const { error } = await supabase.from('students').update({ approved: false }).eq('user_id', currentStudentData.user_id);
                if(error) throw error;
                alert('Account deactivated.');
                window.location.reload();
            } catch (err) { alert('Failed to deactivate: ' + err.message); }
        };

        window.loginAsStudent = async function() {
            if(!currentStudentData) return;
            const email = currentStudentData.student_email;
            if(!email) {
                alert('This student does not have an email address set. Please Edit Info and set an Email first to impersonate.');
                return;
            }
            
            document.getElementById('impersonateOverlay').style.display = 'flex';
            
            try {
                const response = await fetch('/api/admin/impersonate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, redirectTo: window.location.origin + '/student_dashboard.html' })
                });
                
                const data = await response.json();
                if (data.success && data.action_link) {
                    window.location.href = data.action_link;
                } else {
                    throw new Error(data.error || 'Failed to generate link');
                }
            } catch (error) {
                document.getElementById('impersonateOverlay').style.display = 'none';
                alert('Error impersonating student: ' + error.message);
            }
        };
`;

// Replace the end of body to inject modal and script
html = html.replace('</body>', modalHTML + '\n</body>');

// Inject the JS functions into the script block
html = html.replace('async function init() {', jsFunctions + '\n        async function init() {');

// We need to capture currentStudentData in init()
html = html.replace('const { data: student, error } = await supabase.from(\'students\').select(\'*, classes(name)\').eq(\'user_id\', studentId).single();', 
`const { data: student, error } = await supabase.from('students').select('*, classes(name)').eq('user_id', studentId).single();
            currentStudentData = student;`);

// Wire up the buttons in the HTML
html = html.replace(`onclick="alert('Edit Info clicked')"`, `onclick="openEditModal()"`);
html = html.replace(`onclick="alert('Delete Student clicked')"`, `onclick="deleteStudent()"`);
html = html.replace(`onclick="alert('Deactivate Account clicked')"`, `onclick="deactivateStudent()"`);
html = html.replace(`onclick="alert('Login As Student clicked')"`, `onclick="loginAsStudent()"`);

// Change the rest to simple "Coming soon" alerts
html = html.replace(`onclick="alert('Message clicked')"`, `onclick="alert('Messaging system coming in future update.')"`);
html = html.replace(`onclick="alert('Delete Promotion clicked')"`, `onclick="alert('Promotion history feature coming soon.')"`);
html = html.replace(`onclick="alert('ID Card clicked')"`, `onclick="alert('ID Card generation feature coming soon.')"`);
html = html.replace(`onclick="alert('Upload Signature clicked')"`, `onclick="alert('Signature upload feature coming soon.')"`);
html = html.replace(`onclick="alert('Export Data clicked')"`, `onclick="alert('Export feature coming soon.')"`);

fs.writeFileSync('public/teacher_student_profile.html', html);
console.log('Injected functions and modal');
