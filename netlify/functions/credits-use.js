const { verifyUser, checkAndUseCredit, cors } = require('./_supabaseAdmin');

const { resp } = require('./_utils');
exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return cors(200, {});
    if (event.httpMethod !== 'POST') return cors(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers.authorization);
        if (!user) return cors(401, { error: 'Unauthorized' });

        const { amount = 1, action = 'chat' } = JSON.parse(event.body || '{}');
        const result = await checkAndUseCredit(user.id, amount, action);

        if (!result.ok) return cors(402, { error: 'Insufficient credits', remaining: result.remaining || 0 });
        return cors(200, { ok: true, remaining: result.remaining, unlimited: result.unlimited || false });
    } catch (e) {
        return cors(500, { error: e.message });
    }
};