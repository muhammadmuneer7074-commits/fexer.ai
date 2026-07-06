// Returns the Lemon Squeezy customer portal URL so users can manage/cancel their subscription.
// Lemon Squeezy stores this URL directly on the subscription object (no separate session needed).
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

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
            .select("lemonsqueezy_customer_portal_url")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile?.lemonsqueezy_customer_portal_url) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "No billing account found. Please subscribe to a plan first." }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ url: profile.lemonsqueezy_customer_portal_url }),
        };
    } catch (err) {
        console.error("lemonsqueezy-portal.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch billing portal" }) };
    }
};