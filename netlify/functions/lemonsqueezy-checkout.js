const { verifyUser, resp, sb } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers.authorization || event.headers.Authorization);
        if (!user) return resp(401, { error: 'Unauthorized' });

        const { plan } = JSON.parse(event.body);
        const variantId = plan === 'pro' ? process.env.LEMONSQUEEZY_PRO_VARIANT_ID : process.env.LEMONSQUEEZY_MAX_VARIANT_ID;
        if (!variantId) return resp(400, { error: 'Plan variant not configured: ' + plan });

        const { data: profile } = await sb.from('profiles').select('email, full_name').eq('id', user.id).single();

        const checkoutData = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_options: { embed: false },
                    checkout_data: {
                        email: profile?.email || user.email,
                        name: profile?.full_name || '',
                        custom: { user_id: user.id }
                    }
                },
                relationships: {
                    store: { data: { type: 'stores', id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
                    variant: { data: { type: 'variants', id: String(variantId) } }
                }
            }
        };

        const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
                'Authorization': 'Bearer ' + process.env.LEMONSQUEEZY_API_KEY
            },
            body: JSON.stringify(checkoutData)
        });

        const data = await res.json();
        if (!res.ok) return resp(500, { error: data.errors?.[0]?.detail || 'Checkout failed' });

        return resp(200, { url: data.data?.attributes?.url });
    } catch (e) { return resp(500, { error: e.message }); }
};