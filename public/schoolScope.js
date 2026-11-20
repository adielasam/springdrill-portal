// schoolScope.js — shared multi-school scope helper (PR #60).
//
// One idea, used by every school-facing admin page: the page shows the data
// of the EFFECTIVE school — the signed-in school admin's own school, or, for
// the vendor (super admin), the partner school they chose to view on the
// vendor dashboard ("Open workspace"). The vendor's choice is stored in
// sessionStorage ('sd_view_school'), so it lasts for the tab and clears when
// the tab closes; it is never a login and it never changes who is signed in.
//
// The NULL rule (PR #59, kept here): when there is no effective school —
// the vendor looking at nobody in particular — there is no filter, so the
// owner sees everything, exactly as before. Spring Valley's behaviour is
// unchanged in every mode.
//
// This is UI scoping only: it filters the queries the page itself makes. It
// is not RLS — a crafted request could still touch another school's rows.
// That is the known Phase 2 follow-up, not something this helper claims.
import { supabase } from './supabaseClient.js';
import { getMyRoles } from './roleSwitcher.js';

const VIEW_KEY = 'sd_view_school';

export function getViewSchool() {
    try {
        const raw = window.sessionStorage && sessionStorage.getItem(VIEW_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
    } catch (e) { /* malformed entry: treat as absent */ }
    return null;
}

export function setViewSchool(school) {
    try {
        if (!school || !school.id) return;
        sessionStorage.setItem(VIEW_KEY, JSON.stringify({ id: school.id, name: school.name || '', slug: school.slug || '' }));
    } catch (e) { /* storage unavailable */ }
}

export function clearViewSchool() {
    try { sessionStorage.removeItem(VIEW_KEY); } catch (e) { /* ignore */ }
}

// The viewer's scope: who they are, which school's data the page should
// show, and whether this is the vendor looking into a partner's workspace.
// Takes the session the caller already has (optional — fetched when not
// passed). The users row is NOT fetched here: getMyRoles (memoized per page
// load, PR #61) already fetched it, so this reuses that one row instead of
// querying users a second time.
export async function getSchoolScope(session = null) {
    const empty = { viewerSchoolId: null, role: null, viewSchool: null, effectiveSchoolId: null, effectiveSchool: null, isViewMode: false, viewerRow: null };
    const sess = session || (await supabase.auth.getSession()).data?.session;
    if (!sess) return empty;
    const mine = await getMyRoles(sess);
    const viewer = mine?.userRow || null;
    const viewerSchoolId = viewer ? viewer.school_id : null;
    const role = viewer ? viewer.role : null;
    const isVendor = role === 'vendor';
    // Only the vendor can view another school: a school admin's own
    // school_id always wins, even if a stale view entry is lying around.
    const viewSchool = isVendor ? getViewSchool() : null;
    const effectiveSchoolId = (isVendor && viewSchool) ? viewSchool.id : viewerSchoolId;
    let effectiveSchool = null;
    if (effectiveSchoolId) {
        const { data: school } = await supabase.from('schools').select('*').eq('id', effectiveSchoolId).single();
        if (school) effectiveSchool = school;
    }
    return { viewerSchoolId, role, viewSchool, effectiveSchoolId, effectiveSchool, isViewMode: isVendor && !!viewSchool, viewerRow: viewer };
}

// Add a school filter to a Supabase query builder, or leave it alone when
// there is no effective school (the vendor's global view).
export function scopeEq(query, schoolId) {
    return schoolId ? query.eq('school_id', schoolId) : query;
}

// "Viewing {school} as vendor" pill, in the style of the impersonation
// pill (PR #38): fixed, top-right, dark green. Exit clears the view and
// returns to the vendor dashboard. Injected once per page.
export function renderViewPill(scope) {
    if (!scope || !scope.isViewMode || !scope.effectiveSchool) return;
    if (document.getElementById('schoolScopeViewPill')) return;
    const pill = document.createElement('div');
    pill.id = 'schoolScopeViewPill';
    pill.style.cssText = 'position:fixed;right:16px;top:16px;z-index:9998;display:flex;align-items:center;gap:10px;background:#1a3c34;color:#fff;padding:10px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:13px;';
    const label = document.createElement('span');
    label.textContent = 'Viewing ' + scope.effectiveSchool.name + ' as vendor';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Exit view';
    btn.style.cssText = 'border:none;border-radius:999px;padding:6px 12px;font-weight:700;font-size:13px;cursor:pointer;background:#fff;color:#1a3c34;';
    btn.addEventListener('click', () => {
        clearViewSchool();
        window.location.href = '/vendor_dashboard.html';
    });
    pill.appendChild(label);
    pill.appendChild(btn);
    document.body.appendChild(pill);
}
