const fs = require('fs');

const SUPER_ADMIN_EMAILS = "['microsoftportharcourt@gmail.com', 'admin@springdrill.edu']";

function patchAdminCreateUser() {
    let content = fs.readFileSync('public/admin_create_user.html', 'utf8');
    
    // Inject super admin check
    const initCheck = `
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return window.location.href = '/';

                const SUPER_ADMIN_EMAILS = ['microsoftportharcourt@gmail.com', 'admin@springdrill.edu'];
                if (!SUPER_ADMIN_EMAILS.includes(session.user.email)) {
                    const roleSelect = document.getElementById('roleSelect');
                    if (roleSelect) {
                        Array.from(roleSelect.options).forEach(opt => {
                            if (opt.value === 'admin') {
                                opt.remove();
                            }
                        });
                    }
                }
`;
    content = content.replace(/const \{ data: \{ session \} \} = await supabase\.auth\.getSession\(\);\s*if \(\!session\) return window\.location\.href = '\/';/, initCheck);
    
    fs.writeFileSync('public/admin_create_user.html', content);
}

function patchManageUsers() {
    let content = fs.readFileSync('public/manage_users.html', 'utf8');
    
    // 1. Inject global SUPER_ADMIN_EMAILS and currentUserEmail
    content = content.replace("let currentTab = 'all';", "let currentTab = 'all';\n        const SUPER_ADMIN_EMAILS = ['microsoftportharcourt@gmail.com', 'admin@springdrill.edu'];\n        let currentUserEmail = '';");
    
    // 2. Fetch currentUserEmail in init
    const initCheck = `
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return window.location.href = '/';
            currentUserEmail = session.user.email;
`;
    content = content.replace(/const \{ data: \{ session \} \} = await supabase\.auth\.getSession\(\);\s*if \(\!session\) return window\.location\.href = '\/';/, initCheck);

    // 3. Update the delete button rendering logic
    const renderTableRegex = /tbody\.innerHTML = \w+\.map\(u => \{[\s\S]*?return `([\s\S]*?)`;\s*\}\)\.join\(''\);/g;
    
    content = content.replace(/tbody\.innerHTML = usersToDisplay\.map\(u => \{([\s\S]*?)return `([\s\S]*?)`;\n\s*\}\)\.join\(''\);/g, (match, beforeReturn, htmlTemplate) => {
        
        let newBefore = beforeReturn + `
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
        
        let newHtml = htmlTemplate.replace(
            /<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="window\.deleteUser\('\$\{u\.id\}'\)">[\s\S]*?<\/button>/,
            "${canDelete ? `<button class=\"btn btn-sm btn-danger fw-bold shadow-sm\" onclick=\"window.deleteUser('${u.id}', '${u.email}', '${u.role}')\">\n                                    <i class=\"fas fa-trash\"></i> Delete\n                                </button>` : ''}"
        );

        return `tbody.innerHTML = usersToDisplay.map(u => {${newBefore}return \`${newHtml}\`;\n            }).join('');`;
    });

    // 4. Update the actual deleteUser function to enforce security
    const deleteFuncRegex = /window\.deleteUser = async function\(userId\) \{([\s\S]*?)await loadUsers\(\);\n\s*\};/;
    content = content.replace(deleteFuncRegex, `window.deleteUser = async function(userId, targetEmail, targetRole) {
            if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
                alert("Action Denied: Super Admin accounts cannot be deleted.");
                return;
            }
            if (targetRole === 'admin' && !SUPER_ADMIN_EMAILS.includes(currentUserEmail)) {
                alert("Action Denied: Only Super Admins can delete Administrator accounts.");
                return;
            }
$1await loadUsers();
        };`);

    fs.writeFileSync('public/manage_users.html', content);
}

patchAdminCreateUser();
patchManageUsers();
console.log("Patched successfully.");
