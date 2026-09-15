import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({ error: 'Missing userId or newPassword' });
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

        // Update the user's password
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            console.error("Failed to update password:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error("Exception in update-password route:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
