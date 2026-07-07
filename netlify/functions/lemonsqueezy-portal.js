const { verifyUser, resp, sb } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers.authorization || event.headers.Authorization);
        if (!user) return resp(401, { error: 'Unauthorized' });

        const { data: profile } = await sb.from('profiles')
            .select('lemonsqueezy_customer_id, lemonsqueezy_customer_portal_url, plan')
            .eq('id', user.id).single();

        if (!profile?.lemonsqueezy_customer_id) return resp(400, { error: 'No subscription found. Please upgrade first.' });
        if (profile.lemonsqueezy_customer_portal_url) return resp(200, { url: profile.lemonsqueezy_customer_portal_url });

        const res = await fetch(`https://api.lemonsqueezy.com/v1/customers/${profile.lemonsqueezy_customer_id}`, {
            headers: { 'Accept': 'application/vnd.api+json', 'Authorization': 'Bearer ' + process.env.LEMONSQUEEZY_API_KEY }
        });
        if (!res.ok) return resp(500, { error: 'Could not fetch portal URL' });

        const data = await res.json();
        const url = data.data?.attributes?.urls?.customer_portal;
        if (url) await sb.from('profiles').update({ lemonsqueezy_customer_portal_url: url }).eq('id', user.id);

        return resp(200, { url: url || null });
    } catch (e) { return resp(500, { error: e.message }); }
};