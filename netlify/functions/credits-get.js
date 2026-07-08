const { verifyUser, resp, sb } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'GET') return resp(405, { error: 'Method not allowed' });
    try {
        const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
        const user = await verifyUser(authHeader);
        if (!user) return resp(401, { error: 'Unauthorized' });

        const { data: cred, error } = await sb
            .from('user_credits')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error || !cred) {
            // Return default if no record yet
            return resp(200, { credits: { plan: 'free', credits_remaining: 5, credits_daily: 5 } });
        }

        const now = new Date();
        const hoursSince = (now - new Date(cred.last_reset)) / 3600000;

        if (hoursSince >= 24 && cred.plan !== 'max') {
            const daily = cred.plan === 'pro' ? 100 : 5;
            const { data: updated } = await sb
                .from('user_credits')
                .update({ credits_remaining: daily, credits_daily: daily, last_reset: now.toISOString() })
                .eq('user_id', user.id)
                .select()
                .single();
            return resp(200, { credits: updated || cred });
        }

        return resp(200, { credits: cred });
    } catch (e) {
        console.error('credits-get.js error:', e);
        return resp(500, { error: e.message });
    }
};