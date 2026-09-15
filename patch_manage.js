const fs = require('fs');
let content = fs.readFileSync('public/manage_users.html', 'utf8');

// 1. Inject global SUPER_ADMIN_EMAILS and currentUserEmail
content = content.replace("let currentTab = 'all';", "let currentTab = 'all';\n        const SUPER_ADMIN_EMAILS = ['microsoftportharcourt@gmail.com', 'admin@springdrill.edu'];\n        let currentUserEmail = '';");

// 2. Fetch currentUserEmail in init
const initTarget = "const { data: { session } } = await supabase.auth.getSession();";
const initReplacement = "const { data: { session } } = await supabase.auth.getSession();\n            if (!session) return window.location.href = '/';\n            currentUserEmail = session.user.email;";
content = content.replace(initTarget, initReplacement);

// 3. Update the delete button rendering logic
const mapTarget = "tbody.innerHTML = usersToDisplay.map(u => {";
const mapReplacement = "tbody.innerHTML = usersToDisplay.map(u => {\n                let canDelete = true;\n                const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUserEmail);\n                const isTargetSuperAdmin = SUPER_ADMIN_EMAILS.includes(u.email);\n\n                if (u.role === 'admin' && !isSuperAdmin) {\n                    canDelete = false;\n                }\n                if (isTargetSuperAdmin) {\n                    canDelete = false;\n                }\n";
content = content.replace(mapTarget, mapReplacement);

const deleteBtnTarget = `<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="window.deleteUser('\${u.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>`;
const deleteBtnReplacement = `\${canDelete ? \`<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="window.deleteUser('\${u.id}', '\${u.email}', '\${u.role}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>\` : ''}`;
content = content.replace(deleteBtnTarget, deleteBtnReplacement);

// 4. Update the actual deleteUser function to enforce security
const deleteFuncTarget = `window.deleteUser = async function(userId) {
            if (!confirm("Are you sure you want to permanently delete this user's data from the directory?")) return;
            document.getElementById('loadingOverlay').style.display = 'flex';`;
const deleteFuncReplacement = `window.deleteUser = async function(userId, targetEmail, targetRole) {
            if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
                alert("Action Denied: Super Admin accounts cannot be deleted.");
                return;
            }
            if (targetRole === 'admin' && !SUPER_ADMIN_EMAILS.includes(currentUserEmail)) {
                alert("Action Denied: Only Super Admins can delete Administrator accounts.");
                return;
            }
            if (!confirm("Are you sure you want to permanently delete this user's data from the directory?")) return;
            document.getElementById('loadingOverlay').style.display = 'flex';`;
content = content.replace(deleteFuncTarget, deleteFuncReplacement);

fs.writeFileSync('public/manage_users.html', content);
console.log("Patched manage_users.html");
