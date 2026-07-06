// Creates a Lemon Squeezy checkout URL for upgrading to Pro or Max plan.
// Lemon Squeezy acts as Merchant of Record — no LLC/business entity required on our side.
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const SITE_URL = process.env.SITE_URL || "https://fexer.it.com";

const VARIANT_MAP = {
    pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
    max: process.env.LEMONSQUEEZY_MAX_VARIANT_ID,
};

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    try {
        const { plan } = JSON.parse(event.body);

        if (!plan || !VARIANT_MAP[plan]) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid plan. Must be 'pro' or 'max'." }) };
        }

        const supabase = getSupabaseAdmin();
        const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", user.id)
            .single();

        const checkoutPayload = {
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data: {
                        email: profile?.email || user.email,
                        custom: {
                            supabase_user_id: user.id,
                            plan,
                        },
                    },
                    product_options: {
                        redirect_url: `${SITE_URL}/index.html?checkout=success`,
                    },
                },
                relationships: {
                    store: {
                        data: { type: "stores", id: String(LEMONSQUEEZY_STORE_ID) },
                    },
                    variant: {
                        data: { type: "variants", id: String(VARIANT_MAP[plan]) },
                    },
                },
            },
        };

        const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
            },
            body: JSON.stringify(checkoutPayload),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Lemon Squeezy checkout error:", errText);
            return { statusCode: 502, body: JSON.stringify({ error: "Failed to create checkout session" }) };
        }

        const data = await res.json();
        const checkoutUrl = data.data.attributes.url;

        return {
            statusCode: 200,
            body: JSON.stringify({ url: checkoutUrl }),
        };
    } catch (err) {
        console.error("lemonsqueezy-checkout.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to create checkout session" }) };
    }
};