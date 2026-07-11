const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUser(headers) {
    const auth = headers['authorization'] || headers['Authorization'] || '';
    if (!auth) return null;
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    try {
        const { data: { user }, error } = await sb.auth.getUser(token);
        if (error || !user) return null;
        return user;
    } catch (e) { return null; }
}

async function checkAndUseCredit(userId, amount, action) {
    try {
        const { data: cred } = await sb.from('user_credits').select('*').eq('user_id', userId).single();
        if (!cred) return { ok: true };
        if (cred.plan === 'max') {
            sb.from('activity_logs').insert({ user_id: userId, action, credits_used: 0 }).catch(() => { });
            return { ok: true, unlimited: true };
        }
        const hoursSince = (Date.now() - new Date(cred.last_reset)) / 3600000;
        let current = cred.credits_remaining;
        if (hoursSince >= 24) {
            current = cred.plan === 'pro' ? 100 : 5;
            await sb.from('user_credits').update({ credits_remaining: current, last_reset: new Date().toISOString() }).eq('user_id', userId);
        }
        if (current < amount) return { ok: false, remaining: current };
        await sb.from('user_credits').update({ credits_remaining: current - amount }).eq('user_id', userId);
        sb.from('activity_logs').insert({ user_id: userId, action, credits_used: amount }).catch(() => { });
        return { ok: true, remaining: current - amount };
    } catch (e) { return { ok: true }; }
}

function resp(code, body) {
    return {
        statusCode: code,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

module.exports = { sb, verifyUser, checkAndUseCredit, resp };