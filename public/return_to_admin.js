// return_to_admin.js — "Return to Admin" pill for impersonated sessions.
//
// When an admin switches to view the portal as a student or teacher, the
// impersonating page saves the admin session in sessionStorage (tab-scoped,
// same-origin) under SD_IMPERSONATE_RETURN before following the magic link.
// This script, included on the student and teacher dashboards, restores that
// session on click — no password needed — and drops the saved copy. Closing
// the tab drops it too; signing in again as admin always remains the fallback.
import { supabase } from './supabaseClient.js';

const KEY = 'SD_IMPERSONATE_RETURN';

function readSaved() {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (saved && saved.access_token && saved.refresh_token) return saved;
    } catch (e) { /* malformed entry: treat as absent */ }
    return null;
}

const saved = readSaved();
if (saved) {
    const pill = document.createElement('div');
    pill.id = 'returnToAdminPill';
    pill.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:10px;background:#1a3c34;color:#fff;padding:10px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:13px;';
    const label = document.createElement('span');
    label.textContent = 'Viewing as ' + (saved.asName || 'user') + ' (' + (saved.asRole || 'user') + ')';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Return to Admin';
    btn.style.cssText = 'border:none;border-radius:999px;padding:6px 12px;font-weight:700;font-size:13px;cursor:pointer;background:#fff;color:#1a3c34;';
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Returning...';
        try {
            const { error } = await supabase.auth.setSession({
                access_token: saved.access_token,
                refresh_token: saved.refresh_token
            });
            sessionStorage.removeItem(KEY);
            if (error) throw error;
            window.location.href = '/admin_dashboard.html';
        } catch (e) {
            sessionStorage.removeItem(KEY);
            window.location.href = '/';
        }
    });
    pill.appendChild(label);
    pill.appendChild(btn);
    document.body.appendChild(pill);
}
