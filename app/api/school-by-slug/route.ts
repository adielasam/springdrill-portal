import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Public lookup for a school's front-door page (/<slug>).
// Runs with the service key and returns PUBLIC fields only — never the
// setup code or contact details — so it works whether RLS is on or off.
export async function GET(request: Request) {
    try {
        const slug = new URL(request.url).searchParams.get('slug') || '';
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            return NextResponse.json({ error: 'Invalid school address.' }, { status: 400 });
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }
        const admin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await admin
            .from('schools')
            .select('id, name, slug, status, motto, address, logo_url, plan, expires_at, setup_completed')
            .eq('slug', slug)
            .single();
        if (error || !data) return NextResponse.json({ error: 'School not found.' }, { status: 404 });
        return NextResponse.json({ ok: true, school: data });
    } catch (error: any) {
        console.error('Exception in school-by-slug route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
