const { verifyUser, checkAndUseCredit, resp, sb } = require('./_supabaseAdmin');

// ══════════════════════════════════════════
//  credits-use.js
//  Frontend se directly credit deduct karne
//  ke liye — jab koi specific action ho
// ══════════════════════════════════════════

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

    try {
        // 1. User verify karo
        const user = await verifyUser(event.headers);
        if (!user) return resp(401, { error: 'Unauthorized — please sign in again.' });

        // 2. Request body parse karo
        const { amount = 1, action = 'manual' } = JSON.parse(event.body || '{}');

        // Amount validate karo
        if (typeof amount !== 'number' || amount < 1 || amount > 10) {
            return resp(400, { error: 'Invalid credit amount. Must be between 1 and 10.' });
        }

        // 3. Credit check aur deduct
        const result = await checkAndUseCredit(user.id, amount, action);

        if (!result.ok) {
            return resp(402, {
                error: 'NO_CREDITS',
                message: 'No credits remaining for today. Upgrade your plan to continue.',
                remaining: result.remaining || 0
            });
        }

        // 4. Updated credits fetch karo
        const { data: credits } = await sb
            .from('user_credits')
            .select('plan, credits_remaining, credits_daily, last_reset')
            .eq('user_id', user.id)
            .single();

        return resp(200, {
            success: true,
            unlimited: result.unlimited || false,
            credits: credits || null,
            deducted: amount,
            action: action
        });

    } catch (e) {
        console.error('credits-use.js error:', e);
        return resp(500, { error: e.message });
    }
};