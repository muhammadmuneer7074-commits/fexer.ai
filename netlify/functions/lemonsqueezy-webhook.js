const { resp, sb } = require('./_supabaseAdmin');
const crypto = require('crypto');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = event.headers['x-signature'];

    if (secret && signature) {
        const digest = crypto.createHmac('sha256', secret).update(event.body).digest('hex');
        if (digest !== signature) return resp(401, { error: 'Invalid signature' });
    }

    try {
        const payload = JSON.parse(event.body);
        const eventName = payload.meta?.event_name;
        const data = payload.data;
        const attrs = data?.attributes;
        const userId = payload.meta?.custom_data?.user_id;

        if (!userId) return resp(200, { received: true });

        const planFromVariant = (vid) => {
            const v = String(vid);
            if (v === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) return 'pro';
            if (v === process.env.LEMONSQUEEZY_MAX_VARIANT_ID) return 'max';
            return 'free';
        };
        const dailyFor = (plan) => plan === 'max' ? 999999 : plan === 'pro' ? 100 : 5;

        const updateUser = async (plan, status, extras = {}) => {
            const profileUpdate = {
                plan,
                lemonsqueezy_subscription_status: status,
                updated_at: new Date().toISOString(),
                ...extras
            };
            await sb.from('profiles').update(profileUpdate).eq('id', userId);
            const daily = dailyFor(plan);
            await sb.from('user_credits').update({
                plan,
                credits_remaining: daily,
                credits_daily: daily,
                last_reset: new Date().toISOString()
            }).eq('user_id', userId);
        };

        switch (eventName) {
            case 'order_created': {
                const variantId = attrs?.first_order_item?.variant_id;
                await updateUser(planFromVariant(variantId), 'active', {
                    lemonsqueezy_customer_id: String(attrs?.customer_id || '')
                });
                break;
            }
            case 'subscription_created':
            case 'subscription_updated': {
                const plan = planFromVariant(attrs?.variant_id);
                const active = ['active', 'trialing'].includes(attrs?.status);
                await updateUser(active ? plan : 'free', attrs?.status, {
                    lemonsqueezy_customer_id: String(attrs?.customer_id || ''),
                    lemonsqueezy_subscription_id: String(data?.id || ''),
                    lemonsqueezy_customer_portal_url: attrs?.urls?.customer_portal || null
                });
                break;
            }
            case 'subscription_cancelled':
            case 'subscription_expired': {
                await updateUser('free', eventName === 'subscription_cancelled' ? 'cancelled' : 'expired');
                break;
            }
        }

        return resp(200, { received: true });
    } catch (e) {
        console.error('Webhook error:', e);
        return resp(500, { error: e.message });
    }
};