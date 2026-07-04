// Creates a Stripe Checkout session for upgrading to Pro or Max plan.
const Stripe = require("stripe");
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || "https://fexer.it.com";

const PRICE_MAP = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    max: process.env.STRIPE_MAX_PRICE_ID,
};

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
        const { plan } = JSON.parse(event.body);

        if (!plan || !PRICE_MAP[plan]) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid plan. Must be 'pro' or 'max'." }) };
        }

        // Fetch or create Stripe customer
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("stripe_customer_id, email")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: profile.email || user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;

            await supabase
                .from("profiles")
                .update({ stripe_customer_id: customerId })
                .eq("id", user.id);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
            success_url: `${SITE_URL}/index.html?checkout=success`,
            cancel_url: `${SITE_URL}/index.html?checkout=cancelled`,
            metadata: { supabase_user_id: user.id, plan },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url }),
        };
    } catch (err) {
        console.error("stripe-checkout.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to create checkout session" }) };
    }
};