import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Public school signup (multi-school Phase 1, plan §1.1).
// No login needed: creates a schools row with status 'pending' for the
// vendor to review. Runs with the service key because the signup happens
// before any login, so it works whether RLS is on or off.

function slugify(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return base || 'school';
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || '').trim();
        const town = String(body.town || '').trim();
        const contactName = String(body.contact_name || '').trim();
        const contactEmail = String(body.contact_email || '').trim().toLowerCase();
        const contactPhone = String(body.contact_phone || '').trim();
        const studentsCount =
            body.students_count === '' || body.students_count == null
                ? null
                : parseInt(String(body.students_count), 10);
        const wants = String(body.wants || '').trim() || null;

        if (!name) return NextResponse.json({ error: 'School name is required.' }, { status: 400 });
        if (!town) return NextResponse.json({ error: 'Town / state is required.' }, { status: 400 });
        if (!contactName) return NextResponse.json({ error: 'Contact person name is required.' }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
            return NextResponse.json({ error: 'A valid contact email is required.' }, { status: 400 });
        if (!contactPhone) return NextResponse.json({ error: 'Phone / WhatsApp number is required.' }, { status: 400 });
        if (studentsCount !== null && (!Number.isFinite(studentsCount) || studentsCount < 0))
            return NextResponse.json({ error: 'Number of students must be a number.' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }
        const admin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // A school that already applied and is still waiting does not get a
        // second row: return the first application's address instead.
        const { data: existing } = await admin
            .from('schools')
            .select('slug')
            .eq('contact_email', contactEmail)
            .eq('status', 'pending')
            .limit(1);
        if (existing && existing.length > 0) {
            return NextResponse.json({ ok: true, slug: existing[0].slug, duplicate: true });
        }

        const base = slugify(name);
        let slug = base;
        for (let n = 2; n <= 20; n++) {
            const { data } = await admin.from('schools').select('id').eq('slug', slug).limit(1);
            if (!data || data.length === 0) break;
            slug = `${base}-${n}`;
            if (n === 20)
                return NextResponse.json(
                    { error: 'Could not find a free address for this school name. Try a shorter name.' },
                    { status: 400 }
                );
        }

        const { error } = await admin.from('schools').insert([
            {
                name,
                town,
                contact_name: contactName,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                students_count: studentsCount,
                wants,
                slug,
                status: 'pending',
                address: town,
            },
        ]);
        if (error) {
            console.error('School signup insert failed:', error);
            return NextResponse.json({ error: 'Could not save the application. Please try again.' }, { status: 500 });
        }
        return NextResponse.json({ ok: true, slug });
    } catch (error: any) {
        console.error('Exception in school-signup route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
