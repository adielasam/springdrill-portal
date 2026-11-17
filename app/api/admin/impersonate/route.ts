import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Admin-only impersonation ("Login As Student / Login As Teacher").
//
// Two defects fixed here (Nov 2026):
// 1. The old version took NO caller credentials at all: anyone who could
//    reach this endpoint could mint a magic login link for ANY email.
//    The caller must now send its session access token, and the caller's
//    role must be admin. Same Bearer-token lock as the AI endpoints.
// 2. The old version hardcoded teacher_dashboard.html as the magic-link
//    destination for everyone, ignoring the redirect the student page
//    sent — so switching to a student landed on the staff side. The
//    destination is now the TARGET user's own dashboard, from the role
//    stored in the users table.
//
// The target is resolved from the users table: userId wins (the students
// table email is often empty or stale), email is the fallback. The email
// used for the magic link is always the one on the users row, never a
// client-supplied string alone.

// Dashboards by role — the only redirect targets this route ever emits.
const DASHBOARD_BY_ROLE: Record<string, string> = {
    admin: '/admin_dashboard.html',
    teacher: '/teacher_dashboard.html',
    student: '/student_dashboard.html',
};

type ServiceClient = SupabaseClient<any, 'public', any>;

async function callerIsAdmin(request: Request, supabaseAdmin: ServiceClient): Promise<boolean> {
    try {
        const header = request.headers.get('authorization');
        if (!header || !header.toLowerCase().startsWith('bearer ')) return false;
        const token = header.slice(7).trim();
        if (!token) return false;
        const anon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
        const { data, error } = await anon.auth.getUser(token);
        if (error || !data.user) return false;
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();
        return profile !== null && profile.role === 'admin';
    } catch {
        return false;
    }
}

// The magic link must return to the deployment that served this request
// (production, or a preview deployment under test). The host is taken from
// the request only when it is the configured site host or a *.vercel.app
// host; anything else falls back to the configured site URL, so a forged
// Host header can never steer the link elsewhere.
function siteBase(request: Request): string {
    const configured = process.env.NEXT_PUBLIC_SITE_URL || 'https://springdrill-portal.vercel.app';
    try {
        const configuredHost = new URL(configured).host;
        const forwarded = request.headers.get('x-forwarded-host');
        const host = (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('host') || '').toLowerCase();
        if (host && (host === configuredHost.toLowerCase() || host.endsWith('.vercel.app'))) {
            const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
            return `${proto}://${host}`;
        }
    } catch {
        // fall through to the configured URL
    }
    return configured;
}

export async function POST(request: Request) {
    try {
        const { email, userId, redirectTo } = await request.json();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
            return NextResponse.json({ error: 'Server configuration error. Missing service role key.' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        if (!(await callerIsAdmin(request, supabaseAdmin))) {
            return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 403 });
        }

        // Resolve the target account. userId wins; email is the fallback.
        let target: { id: string; email: string | null; role: string | null } | null = null;
        if (userId) {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, email, role')
                .eq('id', userId)
                .single();
            target = data;
        }
        if (!target && email) {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, email, role')
                .eq('email', String(email).toLowerCase())
                .single();
            target = data;
        }
        if (!target || !target.email) {
            return NextResponse.json({ error: 'That account has no sign-in email address on file.' }, { status: 400 });
        }

        // Destination: the target's own dashboard. A client-supplied
        // redirect is honoured only when it names one of the three
        // dashboard pages; the looked-up role wins on any mismatch.
        let path: string | null = DASHBOARD_BY_ROLE[target.role ?? ''] ?? null;
        if (!path && typeof redirectTo === 'string') {
            try {
                const pathname = new URL(redirectTo, siteBase(request)).pathname;
                if (Object.values(DASHBOARD_BY_ROLE).includes(pathname)) path = pathname;
            } catch {
                // ignore a malformed redirectTo; the default below applies
            }
        }
        if (!path) path = '/teacher_dashboard.html';

        // Generate a magic link for the user.
        // This allows the admin to impersonate them without knowing the password.
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: target.email,
            options: {
                redirectTo: `${siteBase(request)}${path}`
            }
        });

        if (error) {
            console.error("Failed to generate impersonation link:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, action_link: data.properties.action_link });

    } catch (error: any) {
        console.error("Exception in impersonate route:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
