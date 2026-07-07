const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUser(authHeader) {
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

async function getUserPlan(userId) {
    const { data } = await sb.from('user_credits').select('plan, credits_remaining, credits_daily, last_reset').eq('user_id', userId).single();
    return data || { plan: 'free', credits_remaining: 0 };
}

async function checkAndUseCredit(userId, amount, action) {
    try {
        const { data: cred } = await sb.from('user_credits').select('*').eq('user_id', userId).single();
        if (!cred) return { ok: true };
        if (cred.plan === 'max') {
            await sb.from('activity_logs').insert({ user_id: userId, action, credits_used: 0 });
            return { ok: true, unlimited: true };
        }

        const now = new Date();
        const hoursSince = (now - new Date(cred.last_reset)) / (1000 * 60 * 60);
        let current = cred.credits_remaining;

        if (hoursSince >= 24) {
            current = cred.plan === 'pro' ? 100 : 5;
            await sb.from('user_credits').update({ credits_remaining: current, last_reset: now.toISOString() }).eq('user_id', userId);
        }

        if (current < amount) return { ok: false, remaining: current };

        const newCredits = current - amount;
        await sb.from('user_credits').update({ credits_remaining: newCredits }).eq('user_id', userId);
        await sb.from('activity_logs').insert({ user_id: userId, action, credits_used: amount });
        return { ok: true, remaining: newCredits };
    } catch (e) {
        return { ok: true };
    }
}

function cors(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

module.exports = { sb, verifyUser, getUserPlan, checkAndUseCredit, cors };