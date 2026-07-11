'use strict';

// ══════════════════════════════════
//  CONFIG — replace karo
// ══════════════════════════════════
const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ══════════════════════════════════
//  HELPERS
// ══════════════════════════════════
const $ = id => document.getElementById(id);

function showMsg(text, type = 'error') {
    const el = $('authMsg');
    el.textContent = text;
    el.className = 'auth-msg ' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(() => el.style.display = 'none', 5000);
}

function hideMsg() { $('authMsg').style.display = 'none'; }

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.textContent = loading ? (text || 'Please wait...') : btn.dataset.orig;
}

// ══════════════════════════════════
//  FORM SWITCHING
// ══════════════════════════════════
function showForm(name) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const form = $('form' + name.charAt(0).toUpperCase() + name.slice(1));
    if (form) form.classList.add('active');
    hideMsg();
}

$('toSignup').addEventListener('click', () => showForm('signup'));
$('toLogin').addEventListener('click', () => showForm('login'));
$('toForgot').addEventListener('click', () => showForm('forgot'));
$('backToLogin').addEventListener('click', () => showForm('login'));
$('backFromVerify').addEventListener('click', () => showForm('login'));

// ══════════════════════════════════
//  CHECK EXISTING SESSION
// ══════════════════════════════════
(async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (session) window.location.href = '/';
})();

// ══════════════════════════════════
//  PASSWORD TOGGLE (eye icon)
// ══════════════════════════════════
document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const inp = $(btn.dataset.target);
        if (!inp) return;
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.innerHTML = show
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
});

// ══════════════════════════════════
//  PASSWORD STRENGTH
// ══════════════════════════════════
$('signupPassword').addEventListener('input', function () {
    const val = this.value;
    const fill = $('pwFill'), lbl = $('pwLabel');
    if (!val) { fill.className = 'pw-fill'; fill.style.width = '0'; lbl.textContent = 'Enter password'; return; }

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 1) { fill.className = 'pw-fill weak'; lbl.textContent = 'Weak'; }
    else if (score <= 2) { fill.className = 'pw-fill medium'; lbl.textContent = 'Medium'; }
    else { fill.className = 'pw-fill strong'; lbl.textContent = 'Strong'; }
});

// ══════════════════════════════════
//  SIGN IN
// ══════════════════════════════════
const loginBtn = $('loginBtn');
loginBtn.dataset.orig = 'Sign In';

loginBtn.addEventListener('click', async () => {
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;

    if (!email || !password) { showMsg('Please enter your email and password.'); return; }

    setLoading(loginBtn, true, 'Signing in...');
    hideMsg();

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.includes('Invalid login')) {
                showMsg('Incorrect email or password. Please try again.');
            } else if (error.message.includes('Email not confirmed')) {
                showMsg('Please verify your email first. Check your inbox.', 'info');
            } else {
                showMsg(error.message);
            }
            setLoading(loginBtn, false);
            return;
        }

        if (data.session) {
            showMsg('Signing you in...', 'success');
            setTimeout(() => window.location.href = '/', 500);
        }
    } catch (e) {
        showMsg('Something went wrong. Please try again.');
        setLoading(loginBtn, false);
    }
});

// Enter key on login form
[$('loginEmail'), $('loginPassword')].forEach(el => {
    el.addEventListener('keypress', e => { if (e.key === 'Enter') loginBtn.click(); });
});

// ══════════════════════════════════
//  SIGN UP
// ══════════════════════════════════
const signupBtn = $('signupBtn');
signupBtn.dataset.orig = 'Create Account';

signupBtn.addEventListener('click', async () => {
    const name = $('signupName').value.trim();
    const email = $('signupEmail').value.trim();
    const password = $('signupPassword').value;
    const confirm = $('signupConfirm').value;
    const terms = $('termsCheck').checked;

    if (!name) { showMsg('Please enter your full name.'); return; }
    if (!email) { showMsg('Please enter your email address.'); return; }
    if (!email.includes('@')) { showMsg('Please enter a valid email address.'); return; }
    if (password.length < 8) { showMsg('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { showMsg('Passwords do not match.'); return; }
    if (!terms) { showMsg('Please accept the Terms of Service.'); return; }

    setLoading(signupBtn, true, 'Creating account...');
    hideMsg();

    try {
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) { showMsg(error.message); setLoading(signupBtn, false); return; }

        // Show verify email screen
        $('verifyEmail').textContent = email;
        showForm('verify');

    } catch (e) {
        showMsg('Something went wrong. Please try again.');
        setLoading(signupBtn, false);
    }
});

// ══════════════════════════════════
//  FORGOT PASSWORD
// ══════════════════════════════════
const forgotBtn = $('forgotBtn');
forgotBtn.dataset.orig = 'Send Reset Link';

forgotBtn.addEventListener('click', async () => {
    const email = $('forgotEmail').value.trim();
    if (!email) { showMsg('Please enter your email address.'); return; }

    setLoading(forgotBtn, true, 'Sending...');
    hideMsg();

    try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth.html'
        });

        if (error) { showMsg(error.message); setLoading(forgotBtn, false); return; }

        showMsg('Password reset link sent! Check your email inbox.', 'success');
        setLoading(forgotBtn, false);
    } catch (e) {
        showMsg('Something went wrong. Please try again.');
        setLoading(forgotBtn, false);
    }
});

$('forgotEmail').addEventListener('keypress', e => { if (e.key === 'Enter') forgotBtn.click(); });

// ══════════════════════════════════
//  GOOGLE OAUTH
// ══════════════════════════════════
async function signInWithGoogle() {
    try {
        const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/' }
        });
        if (error) showMsg(error.message);
    } catch (e) {
        showMsg('Google sign in failed. Please try again.');
    }
}

$('googleBtn').addEventListener('click', signInWithGoogle);
$('googleBtnSignup').addEventListener('click', signInWithGoogle);

// ══════════════════════════════════
//  AUTH STATE CHANGE
// ══════════════════════════════════
sb.auth.onAuthStateChange((_event, session) => {
    if (session && window.location.pathname !== '/') {
        window.location.href = '/';
    }
});