// GET remaining credits for the logged-in user for today.
const { getSupabaseAdmin, getUserFromRequest, PLAN_LIMITS } = require("./_supabaseAdmin");

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
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
        const { data: creditRow, error: creditError } = await supabase
            .from("credits")
            .select("used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle();

        if (creditError) throw creditError;

        const used = creditRow?.used || 0;
        const remaining = limit === Infinity ? "unlimited" : Math.max(limit - used, 0);

        return {
            statusCode: 200,
            body: JSON.stringify({ plan, limit: limit === Infinity ? "unlimited" : limit, used, remaining }),
        };
    } catch (err) {
        console.error("credits-get error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch credits" }) };
    }
};