// roleSwitcher.js — Educare-style "My Roles" switcher (PR #41).
//
// An account's roles = its primary users.role + any extra rows in user_roles.
// The switcher menu lists ONLY the roles the account actually holds; the
// target dashboard re-checks (guardRole) before it renders. Both fail soft:
// if user_roles does not exist yet (migration not run), the menu shows just
// the primary role and the guard lets the page load, exactly as before.
import { supabase } from './supabaseClient.js';

const ROLE_ORDER = ['vendor', 'admin', 'teacher'];
const ROLE_LABEL = { vendor: 'Vendor', admin: 'Admin', teacher: 'Teacher' };
const ROLE_DASHBOARD = { vendor: '/vendor_dashboard.html', admin: '/admin_dashboard.html', teacher: '/teacher_dashboard.html' };

export function roleLabel(role) {
    return ROLE_LABEL[role] || role;
}

export function roleDashboard(role) {
    return ROLE_DASHBOARD[role] || '/';
}

// Memoized per page load (PR #61): getMyRoles used to hit the database
// on every call — guardRole calls it, then the page called it again, and
// getSchoolScope fetched the same users row a third time, each round trip
// costing ~1s against the live database. Roles cannot change mid-page-load,
// so one fetch serves every caller on the page. Never persisted across
// logins: the module is reloaded with every page load, and a fresh page
// starts with an empty cache.
// Returns { primary, roles, userRow } or null when there is no session.
// Never throws: any failure degrades to [primary role].
let myRolesPromise = null;
export async function getMyRoles(session = null) {
    if (!myRolesPromise) myRolesPromise = fetchMyRoles(session);
    return myRolesPromise;
}

async function fetchMyRoles(session) {
    try {
        const sess = session || (await supabase.auth.getSession()).data?.session;
        if (!sess) return null;
        // One users-row fetch carries everything the page needs about the
        // signed-in account: role (guard + menu), school (scoping) and
        // name/avatar (header). Callers used to fetch this row separately.
        const { data: userRow } = await supabase
            .from('users')
            .select('school_id, role, name, avatar_url')
            .eq('id', sess.user.id)
            .single();
        const primary = userRow?.role || null;
        let roles = primary ? [primary] : [];
        try {
            const { data: extra, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', sess.user.id);
            if (!error && extra) {
                for (const r of extra) {
                    if (r.role && !roles.includes(r.role)) roles.push(r.role);
                }
            }
        } catch (e) { /* user_roles missing: primary role only */ }
        roles = ROLE_ORDER.filter(r => roles.includes(r));
        if (roles.length === 0 && primary) roles = [primary];
        return { primary, roles, userRow: userRow || null };
    } catch (e) {
        console.error('getMyRoles failed:', e);
        return { primary: null, roles: [], userRow: null };
    }
}

// Page guard: redirect when the signed-in account definitively does not hold
// this page's role. Fail-open: missing users row or any query error loads the
// page as before (the portal has never had page role guards).
export async function guardRole(pageRole, session = null) {
    try {
        const mine = await getMyRoles(session);
        if (!mine || !mine.primary) return; // no users row: do not lock anyone out
        // Multi-school (Phase 1): the vendor is the super admin, so every
        // page guard passes for them (their own admin dashboard included).
        if (mine.roles.includes('vendor')) return;
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
