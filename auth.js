const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showPanel(name) {
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
}

function showErr(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.classList.add('show'); }
function hideErr(id) { const el = document.getElementById(id); el.textContent = ''; el.classList.remove('show'); }

function setLoading(btnId, spinnerId, textId, loading, text) {
    document.getElementById(btnId).disabled = loading;
    document.getElementById(spinnerId).classList.toggle('show', loading);
    if (text) document.getElementById(textId).textContent = text;
}

// Already logged in? Redirect
(async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (session) window.location.href = '/';
})();

// Navigation
document.getElementById('toSignup').addEventListener('click', () => showPanel('signup'));
document.getElementById('toLogin').addEventListener('click', () => showPanel('login'));
document.getElementById('toForgot').addEventListener('click', () => showPanel('forgot'));
document.getElementById('toLoginFromForgot').addEventListener('click', () => showPanel('login'));
document.getElementById('toLoginFromVerify').addEventListener('click', () => showPanel('login'));

// LOGIN
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    hideErr('loginError');
    if (!email || !password) return showErr('loginError', 'Please enter email and password.');
    setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true, 'Signing in...');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false, 'Sign In');
    if (error) return showErr('loginError', error.message);
    window.location.href = '/';
});

document.getElementById('loginPassword').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// SIGNUP
document.getElementById('signupBtn').addEventListener('click', async () => {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    hideErr('signupError');
    if (!name) return showErr('signupError', 'Please enter your name.');
    if (!email) return showErr('signupError', 'Please enter your email.');
    if (password.length < 8) return showErr('signupError', 'Password must be at least 8 characters.');
    setLoading('signupBtn', 'signupSpinner', 'signupBtnText', true, 'Creating account...');
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin + '/' }
    });
    setLoading('signupBtn', 'signupSpinner', 'signupBtnText', false, 'Create Account');
    if (error) return showErr('signupError', error.message);
    document.getElementById('verifyEmail').textContent = email;
    showPanel('verify');
});

// FORGOT PASSWORD
document.getElementById('forgotBtn').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    hideErr('forgotError');
    document.getElementById('forgotSuccess').classList.remove('show');
    if (!email) return showErr('forgotError', 'Please enter your email.');
    setLoading('forgotBtn', 'forgotSpinner', 'forgotBtnText', true, 'Sending...');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth.html' });
    setLoading('forgotBtn', 'forgotSpinner', 'forgotBtnText', false, 'Send Reset Link');
    if (error) return showErr('forgotError', error.message);
    const s = document.getElementById('forgotSuccess'); s.textContent = 'Reset link sent! Check your email.'; s.classList.add('show');
});