const fs = require('fs');

let content = fs.readFileSync('public/manage_users.html', 'utf8');

// The replacement code:
const jsSuperAdminInit = `
let currentTab = 'all';
const SUPER_ADMIN_EMAILS = ['microsoftportharcourt@gmail.com', 'admin@springdrill.edu'];
let currentUserEmail = '';
`;

content = content.replace(/let currentTab = 'all';/, jsSuperAdminInit);

const jsSuperAdminLoad = `
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return window.location.href = '/';
            currentUserEmail = session.user.email;
`;

content = content.replace(/const\s+\{\s*data:\s*\{\s*session\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getSession\(\);\s*if\s*\(\!session\)\s*return\s*window\.location\.href\s*=\s*'\/';/, jsSuperAdminLoad);


const mapLogic = `
                let canDelete = true;
                const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUserEmail);
                const isTargetSuperAdmin = SUPER_ADMIN_EMAILS.includes(u.email);

                if (u.role === 'admin' && !isSuperAdmin) {
                    canDelete = false; // Normal admin cannot delete other admins
                }
                if (isTargetSuperAdmin) {
                    canDelete = false; // No one can delete a super admin from the dashboard
                }
`;

content = content.replace(/tbody\.innerHTML\s*=\s*usersToDisplay\.map\(u\s*=>\s*\{/, "tbody.innerHTML = usersToDisplay.map(u => {" + mapLogic);


content = content.replace(/<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="window\.deleteUser\('\$\{u\.id\}'\)">[\s\S]*?<\/button>/g, `\${canDelete ? \`<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="window.deleteUser('\${u.id}', '\${u.email}', '\${u.role}')"><i class="fas fa-trash"></i> Delete</button>\` : ''}`);


const newDeleteFunction = `
        window.deleteUser = async function(userId, targetEmail, targetRole) {
            if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
                alert("Action Denied: Super Admin accounts cannot be deleted.");
                return;
            }
            if (targetRole === 'admin' && !SUPER_ADMIN_EMAILS.includes(currentUserEmail)) {
                alert("Action Denied: Only Super Admins can delete Administrator accounts.");
                return;
            }
            if (!confirm("Are you sure you want to permanently delete this user's data from the directory?")) return;
            document.getElementById('loadingOverlay').style.display = 'flex';
            await supabase.from('students').delete().eq('user_id', userId);
            await supabase.from('teachers').delete().eq('user_id', userId);
            await supabase.from('users').delete().eq('id', userId);
            await loadUsers();
        };
`;

content = content.replace(/window\.deleteUser\s*=\s*async\s*function\(userId\)\s*\{[\s\S]*?await loadUsers\(\);\s*\};/g, newDeleteFunction);

fs.writeFileSync('public/manage_users.html', content);
console.log("Patched correctly!");
