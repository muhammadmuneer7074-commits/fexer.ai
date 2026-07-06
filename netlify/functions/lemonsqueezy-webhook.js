// Handles Lemon Squeezy webhook events to keep subscription status in sync with Supabase.
// IMPORTANT: Configure this endpoint URL in Lemon Squeezy Dashboard -> Settings -> Webhooks:
// https://fexer.it.com/.netlify/functions/lemonsqueezy-webhook
// Select events: order_created, subscription_created, subscription_updated, subscription_cancelled, subscription_expired
const crypto = require("crypto");
const { getSupabaseAdmin } = require("./_supabaseAdmin");

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

const VARIANT_TO_PLAN = {
    [process.env.LEMONSQUEEZY_PRO_VARIANT_ID]: "pro",
    [process.env.LEMONSQUEEZY_MAX_VARIANT_ID]: "max",
};

function verifySignature(rawBody, signature) {
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const sig = Buffer.from(signature || "", "utf8");
    return digest.length === sig.length && crypto.timingSafeEqual(digest, sig);
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method not allowed" };
    }

    const signature = event.headers["x-signature"] || event.headers["X-Signature"];
    const rawBody = event.body;

    if (!signature || !verifySignature(rawBody, signature)) {
        console.error("Invalid Lemon Squeezy webhook signature");
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid signature" }) };
    }

    const supabase = getSupabaseAdmin();

    try {
        const payload = JSON.parse(rawBody);
        const eventName = payload.meta?.event_name;
        const customData = payload.meta?.custom_data || {};
        const attributes = payload.data?.attributes || {};

        switch (eventName) {
            case "order_created": {
                const userId = customData.supabase_user_id;
                const plan = customData.plan;

                if (userId && plan) {
                    await supabase
                        .from("profiles")
                        .update({
                            plan,
                            lemonsqueezy_customer_id: String(attributes.customer_id),
                            subscription_status: "active",
                        })
                        .eq("id", userId);
                }
                break;
            }

            case "subscription_created":
            case "subscription_updated": {
                const variantId = String(attributes.variant_id);
                const plan = VARIANT_TO_PLAN[variantId] || "free";
                const status = attributes.status;
                const isActive = ["active", "on_trial"].includes(status);
                const portalUrl = attributes.urls?.customer_portal || null;

                await supabase
                    .from("profiles")
                    .update({
                        plan: isActive ? plan : "free",
                        subscription_status: status,
                        lemonsqueezy_subscription_id: String(payload.data.id),
                        lemonsqueezy_customer_portal_url: portalUrl,
                    })
                    .eq("lemonsqueezy_customer_id", String(attributes.customer_id));
                break;
            }

            case "subscription_cancelled":
            case "subscription_expired": {
                await supabase
                    .from("profiles")
                    .update({
                        plan: "free",
                        subscription_status: eventName === "subscription_expired" ? "expired" : "cancelled",
                    })
                    .eq("lemonsqueezy_customer_id", String(attributes.customer_id));
                break;
            }

            default:
                break;
        }

        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    } catch (err) {
        console.error("lemonsqueezy-webhook.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Webhook handler failed" }) };
    }
};