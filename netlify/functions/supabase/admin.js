// Shared helper: Supabase admin client (service role) for use inside Netlify Functions.
// Import this in other functions with: const { getSupabaseAdmin } = require("./_supabaseAdmin");

const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// Extracts and verifies the logged-in user from the Authorization header.
async function getUserFromRequest(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { user: null, error: "Missing Authorization header" };

    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) return { user: null, error: "Invalid or expired token" };
    return { user: data.user, error: null };
}

const PLAN_LIMITS = {
    free: 5,
    pro: 100,
    max: Infinity,
};

module.exports = { getSupabaseAdmin, getUserFromRequest, PLAN_LIMITS };