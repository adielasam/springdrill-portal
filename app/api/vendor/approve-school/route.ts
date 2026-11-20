import { randomInt } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Vendor approves a pending school (multi-school Phase 1, plan §1.2).
// One call does the three approval jobs: (a) activates the school's
// workspace, (b) generates its one-time setup code, (c) creates the
// school's first admin login (email + temporary password).
// Runs with the service key. The caller must be the vendor: role
// 'vendor', or role 'admin' with no school (the owner before the Phase 1
// migration renames his role). Same Bearer-token lock as the admin
// impersonation route.

type ServiceClient = SupabaseClient<any, 'public', any>;

const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function tempPassword(length = 12): string {
    let out = '';
    for (let i = 0; i < length; i++) {
        out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
    }
    return out;
}

async function callerIsVendor(request: Request, supabaseAdmin: ServiceClient): Promise<boolean> {
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
        // Pre-migration owner: admin with no school yet.
        if (profile.role === 'admin' && (profile.school_id === null || profile.school_id === undefined)) return true;
        return false;
    } catch {
        return false;
    }
}

// The school address must return to the deployment that served this
// request. Same safe-host rule as the impersonation route: the host is
// taken from the request only when it is the configured site host or a
// *.vercel.app host; anything else falls back to the configured site URL.
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

// Retry path: if the login already exists (a previous approval created
// the auth account but stopped before finishing), reuse that account
// instead of failing. Only used on the already-registered error.
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

async function generateSetupCode(supabaseAdmin: ServiceClient, slug: string): Promise<string | null> {
    const letters = (slug || '').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'SCH';
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = `${letters}-${1000 + randomInt(9000)}`;
        const { data } = await supabaseAdmin.from('schools').select('id').eq('setup_code', code).limit(1);
        if (!data || data.length === 0) return code;
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const { school_id } = await request.json().catch(() => ({}));
        if (school_id === undefined || school_id === null) {
            return NextResponse.json({ error: 'School is required.' }, { status: 400 });
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

        if (!(await callerIsVendor(request, supabaseAdmin))) {
            return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 403 });
        }

        const { data: school, error: schoolErr } = await supabaseAdmin
            .from('schools')
            .select('*')
            .eq('id', school_id)
            .single();
        if (schoolErr || !school) {
            return NextResponse.json({ error: 'School not found.' }, { status: 404 });
        }
        if (school.status !== 'pending') {
            return NextResponse.json({ error: 'Only a pending school can be approved.' }, { status: 400 });
        }
        if (!school.contact_email) {
            return NextResponse.json(
                { error: 'This signup has no contact email. Ask the school for one first.' },
                { status: 400 }
            );
        }
        if (!school.slug) {
            return NextResponse.json(
                { error: 'This school has no address yet. Set its slug first.' },
                { status: 400 }
            );
        }

        const setupCode = await generateSetupCode(supabaseAdmin, school.slug);
        if (!setupCode) {
            return NextResponse.json({ error: 'Could not generate a setup code. Try again.' }, { status: 500 });
        }
        const password = tempPassword();

        // (c) First admin login for the school (contact person).
        let authUserId: string | null = null;
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: school.contact_email,
            password,
            email_confirm: true,
            user_metadata: { name: school.contact_name || school.name, role: 'admin' },
        });
        if (createErr) {
            const msg = String(createErr.message || '');
            if (/already (exists|registered)/i.test(msg)) {
                authUserId = await findAuthUserIdByEmail(supabaseAdmin, school.contact_email);
                if (!authUserId) {
                    return NextResponse.json(
                        { error: 'An account with this email already exists. Use a different contact email for the school admin.' },
                        { status: 400 }
                    );
                }
            } else {
                console.error('Approve: createUser failed:', createErr);
                return NextResponse.json({ error: `Could not create the admin login: ${msg}` }, { status: 400 });
            }
        } else {
            authUserId = created.user.id;
        }

        const username = String(school.contact_email).split('@')[0];
        const { error: userErr } = await supabaseAdmin.from('users').upsert(
            {
                id: authUserId,
                name: school.contact_name || school.name,
                email: school.contact_email,
                username,
                role: 'admin',
                school_id: school.id,
            },
            { onConflict: 'id' }
        );
        if (userErr) {
            console.error('Approve: users upsert failed:', userErr);
            return NextResponse.json(
                { error: 'Admin login was created but its profile could not be saved. Try approving again.' },
                { status: 500 }
            );
        }

        // (a) + (b) Activate the workspace and store the setup code.
        // expires_at stays empty until pricing is decided (plan §5.2):
        // the vendor sets it from the dashboard.
        const { error: schoolUpdateErr } = await supabaseAdmin
            .from('schools')
            .update({
                status: 'active',
                setup_code: setupCode,
                approved_at: new Date().toISOString(),
                expires_at: null,
                setup_completed: false,
            })
            .eq('id', school.id);
        if (schoolUpdateErr) {
            console.error('Approve: school update failed:', schoolUpdateErr);
            return NextResponse.json(
                { error: 'Admin login was created but the school could not be activated. Try approving again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            setup_code: setupCode,
            temp_password: password,
            admin_email: school.contact_email,
            slug: school.slug,
            url: `${siteBase(request)}/${school.slug}`,
        });
    } catch (error: any) {
        console.error('Exception in approve-school route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
