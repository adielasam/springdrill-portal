// roleSwitcher.js — Educare-style "My Roles" switcher (PR #41).
//
// An account's roles = its primary users.role + any extra rows in user_roles.
// The switcher menu lists ONLY the roles the account actually holds; the
// target dashboard re-checks (guardRole) before it renders. Both fail soft:
// if user_roles does not exist yet (migration not run), the menu shows just
// the primary role and the guard lets the page load, exactly as before.
import { supabase } from './supabaseClient.js';

const ROLE_ORDER = ['admin', 'teacher'];
const ROLE_LABEL = { admin: 'Admin', teacher: 'Teacher' };
const ROLE_DASHBOARD = { admin: '/admin_dashboard.html', teacher: '/teacher_dashboard.html' };

export function roleLabel(role) {
    return ROLE_LABEL[role] || role;
}

export function roleDashboard(role) {
    return ROLE_DASHBOARD[role] || '/';
}

// Returns { primary, roles } or null when there is no session.
// Never throws: any failure degrades to [primary role].
export async function getMyRoles() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        const { data: userRow } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
        const primary = userRow?.role || null;
        let roles = primary ? [primary] : [];
        try {
            const { data: extra, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id);
            if (!error && extra) {
                for (const r of extra) {
                    if (r.role && !roles.includes(r.role)) roles.push(r.role);
                }
            }
        } catch (e) { /* user_roles missing: primary role only */ }
        roles = ROLE_ORDER.filter(r => roles.includes(r));
        if (roles.length === 0 && primary) roles = [primary];
        return { primary, roles };
    } catch (e) {
        console.error('getMyRoles failed:', e);
        return { primary: null, roles: [] };
    }
}

// Page guard: redirect when the signed-in account definitively does not hold
// this page's role. Fail-open: missing users row or any query error loads the
// page as before (the portal has never had page role guards).
export async function guardRole(pageRole) {
    try {
        const mine = await getMyRoles();
        if (!mine || !mine.primary) return; // no users row: do not lock anyone out
        if (mine.roles.includes(pageRole)) return;
        const fallback = mine.roles[0];
        window.location.href = fallback ? roleDashboard(fallback) : '/';
    } catch (e) {
        console.error('guardRole failed (loading page anyway):', e);
    }
}

// Fill a Bootstrap dropdown <ul> with the My Roles section, inserted before
// the divider element with id dividerId. Current role gets a check mark.
export function buildMyRolesMenu(menuEl, dividerId, myRoles, currentRole) {
    if (!menuEl || !myRoles || myRoles.roles.length === 0) return;
    const divider = dividerId ? document.getElementById(dividerId) : null;
    const header = document.createElement('li');
    header.innerHTML = '<h6 class="dropdown-header" style="font-size: 11px; letter-spacing: 0.05em;">MY ROLES</h6>';
    const items = myRoles.roles.map(role => {
        const li = document.createElement('li');
        const isCurrent = role === currentRole;
        li.innerHTML = '<a class="dropdown-item' + (isCurrent ? ' active' : '') + '" href="' + roleDashboard(role) + '" style="font-size: 13px; font-weight: 500;">'
            + (isCurrent ? '✓ ' : '') + roleLabel(role) + (isCurrent ? ' (current)' : '') + '</a>';
        return li;
    });
    if (divider && divider.parentNode === menuEl) {
        menuEl.insertBefore(header, divider);
        items.forEach(li => menuEl.insertBefore(li, divider));
    } else {
        menuEl.appendChild(header);
        items.forEach(li => menuEl.appendChild(li));
    }
}
