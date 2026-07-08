const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUser(authHeader) {
    if (!authHeader) return null;
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;
    if (!token) return null;
    try {
        const { data: { user }, error } = await sb.auth.getUser(token);
        if (error || !user) return null;
        return user;
    } catch (e) { return null; }
}

async function checkAndUseCredit(userId, amount, action) {
    try {
        const { data: cred, error } = await sb
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !cred) return { ok: true };
        if (cred.plan === 'max') {
            await sb.from('activity_logs')
                .insert({ user_id: userId, action, credits_used: 0 })
                .catch(() => { });
            return { ok: true, unlimited: true };
        }

        const now = new Date();
        const hoursSince = (now - new Date(cred.last_reset)) / 3600000;
        let current = cred.credits_remaining;

        if (hoursSince >= 24) {
            current = cred.plan === 'pro' ? 100 : 5;
            await sb.from('user_credits')
                .update({ credits_remaining: current, last_reset: now.toISOString() })
                .eq('user_id', userId);
        }

        if (current < amount) return { ok: false, remaining: current };

        const newC = current - amount;
        await sb.from('user_credits')
            .update({ credits_remaining: newC })
            .eq('user_id', userId);
        await sb.from('activity_logs')
            .insert({ user_id: userId, action, credits_used: amount })
            .catch(() => { });
        return { ok: true, remaining: newC };
    } catch (e) {
        return { ok: true };
    }
}

function resp(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

module.exports = { sb, verifyUser, checkAndUseCredit, resp };