import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a teacher or school-admin login for one school (multi-school
// Phase 1: setup wizard step 5, and the vendor dashboard "Create admin
// login"). Runs with the service key so creating the account never signs
// the caller out (the browser signUp call would switch the session to the
// new account). The caller must be the vendor, or an admin of THIS school.
// Same Bearer-token lock as the admin impersonation route.

type ServiceClient = SupabaseClient<any, 'public', any>;

async function callerCanStaff(
    request: Request,
    supabaseAdmin: ServiceClient,
    schoolId: number
): Promise<boolean> {
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
        // select('*'): school_id may not exist yet before the migration.
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
        if (!profile) return false;
        if (profile.role === 'vendor') return true;
        if (profile.role === 'admin' && profile.school_id !== undefined && profile.school_id !== null) {
            return Number(profile.school_id) === Number(schoolId);
        }
        return false;
    } catch {
        return false;
    }
}

// Retry path: if the login already exists (a previous attempt created
// the auth account but stopped before finishing), reuse that account.
async function findAuthUserIdByEmail(supabaseAdmin: ServiceClient, email: string): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error || !data) return null;
        const found = data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        return found ? found.id : null;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const schoolId = Number(body.school_id);
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = String(body.role || '').trim();
        if (!Number.isFinite(schoolId)) {
            return NextResponse.json({ error: 'School is required.' }, { status: 400 });
        }
        if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }
        if (role !== 'teacher' && role !== 'admin') {
            return NextResponse.json({ error: 'Role must be teacher or admin.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        if (!(await callerCanStaff(request, supabaseAdmin, schoolId))) {
            return NextResponse.json({ error: 'School admin sign-in required.' }, { status: 403 });
        }

        const { data: school, error: schoolErr } = await supabaseAdmin
            .from('schools')
            .select('id, name')
            .eq('id', schoolId)
            .single();
        if (schoolErr || !school) {
            return NextResponse.json({ error: 'School not found.' }, { status: 404 });
        }

        let authUserId: string | null = null;
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, role },
        });
        if (createErr) {
            const msg = String(createErr.message || '');
            if (/already (exists|registered)/i.test(msg)) {
                authUserId = await findAuthUserIdByEmail(supabaseAdmin, email);
                if (!authUserId) {
                    return NextResponse.json(
                        { error: 'An account with this email already exists. Use a different email.' },
                        { status: 400 }
                    );
                }
            } else {
                console.error('Create-user: createUser failed:', createErr);
                return NextResponse.json({ error: `Could not create the login: ${msg}` }, { status: 400 });
            }
        } else {
            authUserId = created.user.id;
        }

        const username = email.split('@')[0];
        const { error: userErr } = await supabaseAdmin.from('users').upsert(
            {
                id: authUserId,
                name,
                email,
                username,
                role,
                school_id: school.id,
            },
            { onConflict: 'id' }
        );
        if (userErr) {
            console.error('Create-user: users upsert failed:', userErr);
            return NextResponse.json(
                { error: 'Login was created but its profile could not be saved. Try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, email, role, school_id: school.id });
    } catch (error: any) {
        console.error('Exception in create-user route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
