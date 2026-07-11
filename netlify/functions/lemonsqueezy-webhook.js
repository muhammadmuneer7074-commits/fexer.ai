const { resp, sb } = require('./_supabaseAdmin');
const crypto = require('crypto');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const sig = event.headers['x-signature'];
    if (secret && sig) {
        const digest = crypto.createHmac('sha256', secret).update(event.body).digest('hex');
        if (digest !== sig) return resp(401, { error: 'Invalid signature' });
    }
    try {
        const payload = JSON.parse(event.body);
        const ev = payload.meta?.event_name;
        const attrs = payload.data?.attributes;
        const userId = payload.meta?.custom_data?.user_id;
        if (!userId) return resp(200, { received: true });
        const planFrom = (vid) => { const v = String(vid); if (v === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) return 'pro'; if (v === process.env.LEMONSQUEEZY_MAX_VARIANT_ID) return 'max'; return 'free'; };
        const daily = (p) => p === 'max' ? 999999 : p === 'pro' ? 100 : 5;
        const update = async (plan, status, extras = {}) => {
            await sb.from('profiles').update({ plan, lemonsqueezy_subscription_status: status, updated_at: new Date().toISOString(), ...extras }).eq('id', userId);
            await sb.from('user_credits').update({ plan, credits_remaining: daily(plan), credits_daily: daily(plan), last_reset: new Date().toISOString() }).eq('user_id', userId);
        };
        if (ev === 'order_created') await update(planFrom(attrs?.first_order_item?.variant_id), 'active', { lemonsqueezy_customer_id: String(attrs?.customer_id || '') });
        else if (ev === 'subscription_created' || ev === 'subscription_updated') { const plan = planFrom(attrs?.variant_id); const active = ['active', 'trialing'].includes(attrs?.status); await update(active ? plan : 'free', attrs?.status, { lemonsqueezy_customer_id: String(attrs?.customer_id || ''), lemonsqueezy_subscription_id: String(payload.data?.id || ''), lemonsqueezy_customer_portal_url: attrs?.urls?.customer_portal || null }); }
        else if (ev === 'subscription_cancelled' || ev === 'subscription_expired') await update('free', ev === 'subscription_cancelled' ? 'cancelled' : 'expired');
        return resp(200, { received: true });
    } catch (e) { return resp(500, { error: e.message }); }
};