// ============================================================
// FEXER AI - AUTH LOGIC
// ============================================================

const SUPABASE_URL = "https://fiwukodsrhibrbhmoqgp.supabase.co/rest/v1/"; // placeholder
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI"; // placeholder

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Form switching ----------
const forms = {
    login: document.getElementById("login-form"),
    signup: document.getElementById("signup-form"),
    forgot: document.getElementById("forgot-form"),
};

function showForm(name) {
    Object.values(forms).forEach(f => f.classList.remove("active"));
    forms[name].classList.add("active");
}

document.getElementById("show-signup").onclick = (e) => { e.preventDefault(); showForm("signup"); };
document.getElementById("show-forgot").onclick = (e) => { e.preventDefault(); showForm("forgot"); };
document.getElementById("show-login-from-signup").onclick = (e) => { e.preventDefault(); showForm("login"); };
document.getElementById("show-login-from-forgot").onclick = (e) => { e.preventDefault(); showForm("login"); };

function showError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.classList.add("show");
}

function clearError(id) {
    const el = document.getElementById(id);
    el.classList.remove("show");
    el.textContent = "";
}

// ---------- Check if already logged in ----------
(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        window.location.href = "/index.html";
    }
})();

// ---------- LOGIN ----------
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("login-error");

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-btn");

    btn.disabled = true;
    btn.textContent = "Signing in...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = "Sign In";

    if (error) {
        showError("login-error", error.message);
        return;
    }

    window.location.href = "/index.html";
});

// ---------- SIGNUP ----------
document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("signup-error");

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const btn = document.getElementById("signup-btn");

    btn.disabled = true;
    btn.textContent = "Creating account...";

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: name }
        }
    });

    btn.disabled = false;
    btn.textContent = "Create Account";

    if (error) {
        showError("signup-error", error.message);
        return;
    }

    if (data.session) {
        window.location.href = "/index.html";
    } else {
        showError("signup-error", "Account created! Please check your email to confirm, then sign in.");
        showForm("login");
    }
});

// ---------- FORGOT PASSWORD ----------
document.getElementById("forgot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("forgot-error");
    document.getElementById("forgot-success").classList.remove("show");

    const email = document.getElementById("forgot-email").value.trim();
    const btn = document.getElementById("forgot-btn");

    btn.disabled = true;
    btn.textContent = "Sending...";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth.html",
    });

    btn.disabled = false;
    btn.textContent = "Send Reset Link";

    if (error) {
        showError("forgot-error", error.message);
        return;
    }

    const successEl = document.getElementById("forgot-success");
    successEl.textContent = "Reset link sent! Check your email.";
    successEl.classList.add("show");
});