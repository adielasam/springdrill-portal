import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
            return NextResponse.json({ error: 'Server configuration error. Missing service role key.' }, { status: 500 });
        }

        // Initialize Supabase client with the Service Role Key to bypass RLS and allow admin actions
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Update the user's password
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            console.error("Failed to update password:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error: any) {
        console.error("Exception in update-password route:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
