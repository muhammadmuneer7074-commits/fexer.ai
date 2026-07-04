// Handles Stripe webhook events to keep subscription status in sync with Supabase.
// IMPORTANT: Configure this endpoint URL in your Stripe Dashboard webhook settings:
// https://fexer.it.com/.netlify/functions/stripe-webhook
const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabaseAdmin");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const PRICE_TO_PLAN = {
    [process.env.STRIPE_PRO_PRICE_ID]: "pro",
    [process.env.STRIPE_MAX_PRICE_ID]: "max",
};

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method not allowed" };
    }

    const sig = event.headers["stripe-signature"];
    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    const supabase = getSupabaseAdmin();

    try {
        switch (stripeEvent.type) {
            case "checkout.session.completed": {
                const session = stripeEvent.data.object;
                const userId = session.metadata?.supabase_user_id;
                const plan = session.metadata?.plan;

                if (userId && plan) {
                    await supabase
                        .from("profiles")
                        .update({
                            plan,
                            stripe_subscription_id: session.subscription,
                            subscription_status: "active",
                        })
                        .eq("id", userId);
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = stripeEvent.data.object;
                const priceId = subscription.items.data[0]?.price?.id;
                const plan = PRICE_TO_PLAN[priceId] || "free";
                const status = subscription.status;

                await supabase
                    .from("profiles")
                    .update({
                        plan: status === "active" ? plan : "free",
                        subscription_status: status,
                    })
                    .eq("stripe_customer_id", subscription.customer);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = stripeEvent.data.object;

                await supabase
                    .from("profiles")
                    .update({
                        plan: "free",
                        subscription_status: "cancelled",
                    })
                    .eq("stripe_customer_id", subscription.customer);
                break;
            }

            default:
                // Unhandled event type — safe to ignore
                break;
        }

        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    } catch (err) {
        console.error("stripe-webhook.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Webhook handler failed" }) };
    }
};