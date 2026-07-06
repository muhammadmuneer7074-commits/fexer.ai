// POST: check if user has credits remaining, and if so, deduct one and return success.
// Call this BEFORE every AI action (chat, voice, image gen).
const { getSupabaseAdmin, getUserFromRequest, PLAN_LIMITS } = require("./_supabaseAdmin");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const supabase = getSupabaseAdmin();

    try {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("plan")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        const plan = profile?.plan || "free";
        const limit = PLAN_LIMITS[plan];
        const today = new Date().toISOString().split("T")[0];

        if (limit === Infinity) {
            return { statusCode: 200, body: JSON.stringify({ allowed: true, remaining: "unlimited" }) };
        }

        const { data: creditRow } = await supabase
            .from("credits")
            .select("id, used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle();

        const used = creditRow?.used || 0;

        if (used >= limit) {
            return {
                statusCode: 403,
                body: JSON.stringify({ allowed: false, error: "Daily credit limit reached. Upgrade your plan for more credits.", remaining: 0 }),
            };
        }

        if (creditRow) {
            await supabase
                .from("credits")
                .update({ used: used + 1 })
                .eq("id", creditRow.id);
        } else {
            await supabase
                .from("credits")
                .insert({ user_id: user.id, date: today, used: 1 });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ allowed: true, remaining: limit - (used + 1) }),
        };
    } catch (err) {
        console.error("credits-use error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to process credits" }) };
    }
};