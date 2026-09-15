import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

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

        // Generate a magic link for the user
        // This allows the admin to impersonate them without knowing the password
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://springdrill-portal.vercel.app'}/teacher_dashboard.html` // Where to go after login
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
