const fs = require('fs');

let html = fs.readFileSync('public/teacher_list.html', 'utf8');

const oldPassHTML = `<label class="form-label">New Password</label>
                            <input type="password" class="form-control" id="editPassword" placeholder="Leave blank to keep current">`;

const newPassHTML = `<label class="form-label">New Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="editPassword" placeholder="Leave blank to keep current" style="border-right: none;">
                                <span class="input-group-text" style="background: transparent; cursor: pointer; border-left: none;" onclick="togglePasswordVisibility('editPassword', this)">
                                    <i data-lucide="eye" class="toggle-icon"></i>
                                </span>
                            </div>`;

html = html.replace(oldPassHTML, newPassHTML);

const jsFunction = `window.togglePasswordVisibility = function(inputId, spanEl) {
            const input = document.getElementById(inputId);
            const icon = spanEl.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.setAttribute('data-lucide', 'eye-off');
            } else {
                input.type = 'password';
                icon.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
        };

        window.closeEditModal = function() {`;

html = html.replace('window.closeEditModal = function() {', jsFunction);

fs.writeFileSync('public/teacher_list.html', html);
console.log('Added password reveal to teacher_list.html');
