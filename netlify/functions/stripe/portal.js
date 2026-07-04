// Creates a Stripe Billing Portal session so users can manage/cancel their subscription.
const Stripe = require("stripe");
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || "https://fexer.it.com";

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
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile?.stripe_customer_id) {
            return { statusCode: 400, body: JSON.stringify({ error: "No billing account found. Please subscribe to a plan first." }) };
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${SITE_URL}/index.html`,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url }),
        };
    } catch (err) {
        console.error("stripe-portal.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to create billing portal session" }) };
    }
};