import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
            return res.status(500).json({ error: 'Server configuration error. Missing service role key.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const redirectToUrl = req.body.redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://springdrill-portal.vercel.app'}/teacher_dashboard.html`;

        // Generate a magic link for the user
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: redirectToUrl
            }
        });

        if (error) {
            console.error("Failed to generate impersonation link:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ success: true, action_link: data.properties.action_link });

    } catch (error) {
        console.error("Exception in impersonate route:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
