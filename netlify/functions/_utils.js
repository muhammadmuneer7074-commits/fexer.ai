'use strict';

// ══════════════════════════════════════════
//  FEXER AI — FRONTEND UTILITIES
//  utils.js
//  Ye file script.js se pehle load honi chahiye
//  index.html mein:
//  <script src="utils.js"></script>
//  <script src="script.js"></script>
// ══════════════════════════════════════════

// ── DOM HELPER ──
const $ = id => document.getElementById(id);

// ── ESCAPE HTML (XSS prevent karne ke liye) ──
function esc(str) {
    if (typeof str !== 'string') return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ── TIME AGO ──
function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString();
}

// ── FORMAT DATE ──
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ── TRUNCATE TEXT ──
function truncate(str, maxLen = 35) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
}

// ── RANDOM VOICE ──
const VOICE_OPTIONS = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
function randomVoice() {
    return VOICE_OPTIONS[Math.floor(Math.random() * VOICE_OPTIONS.length)];
}

// ── GENERATE UNIQUE ID ──
function genId(prefix = 'id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── DEBOUNCE ──
function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ── DEEP CLONE ──
function deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { return obj; }
}

// ── LOCAL STORAGE HELPERS ──
const Store = {
    get(key, fallback = null) {
        try {
            const val = localStorage.getItem(key);
            return val !== null ? JSON.parse(val) : fallback;
        } catch (e) { return fallback; }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Store.set error:', e);
            return false;
        }
    },

    remove(key) {
        try { localStorage.removeItem(key); return true; }
        catch (e) { return false; }
    },

    clear() {
        try { localStorage.clear(); return true; }
        catch (e) { return false; }
    }
};

// ── MARKDOWN TO PLAIN TEXT ──
function mdToPlain(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '')      // code blocks hata do
        .replace(/`[^`]*`/g, '')             // inline code hata do
        .replace(/^#{1,6}\s*/gm, '')         // headings hata do
        .replace(/\*\*(.*?)\*\*/g, '$1')     // bold hata do
        .replace(/\*(.*?)\*/g, '$1')         // italic hata do
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links hata do
        .replace(/^[-*]\s+/gm, '• ')        // bullets convert karo
        .replace(/^\d+\.\s+/gm, '')         // numbered list hata do
        .replace(/^>/gm, '')                 // blockquotes hata do
        .replace(/\n{3,}/g, '\n\n')         // extra newlines kam karo
        .trim();
}

// ── STRIP MARKDOWN (TTS ke liye) ──
function stripForTTS(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/[*_#>~\-]/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── PARSE MARKDOWN (marked.js use karta hai) ──
function parseMd(text) {
    if (!text) return '';
    if (typeof marked === 'undefined') return esc(text);
    try {
        marked.setOptions({ breaks: true, gfm: true });
        return marked.parse(text);
    } catch (e) { return esc(text); }
}

// ── BLOB TO BASE64 ──
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ── DATA URL TO BLOB ──
function dataURLtoBlob(dataURL) {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

// ── DOWNLOAD FILE ──
function downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── DOWNLOAD IMAGE ──
function downloadImage(b64, filename = 'Fexer-AI-Image.png') {
    const a = document.createElement('a');
    a.href = 'data:image/png;base64,' + b64;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ── SAVE AS PDF ──
function savePDF(text, filename = 'Fexer-AI.pdf') {
    if (typeof jspdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page.');
        return;
    }
    try {
        const doc = new jspdf.jsPDF();
        const plain = mdToPlain(text);
        const lines = doc.splitTextToSize(plain, 180);
        doc.setFontSize(11);
        let y = 20;
        lines.forEach(line => {
            if (y > doc.internal.pageSize.height - 15) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, 15, y);
            y += 7;
        });
        doc.save(filename);
    } catch (e) {
        console.error('PDF error:', e);
        alert('Could not generate PDF. Please try again.');
    }
}

// ── COPY TO CLIPBOARD ──
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // Fallback
        try {
            const el = document.createElement('textarea');
            el.value = text;
            el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            document.body.appendChild(el);
            el.focus(); el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            return true;
        } catch (e2) {
            console.error('Copy failed:', e2);
            return false;
        }
    }
}

// ── COMPRESS IMAGE ──
function compressImage(file, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ── EXTRACT VIDEO FRAME ──
function extractVideoFrame(file, quality = 0.8) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);

        video.addEventListener('loadeddata', () => {
            video.currentTime = Math.min(0.5, video.duration / 2);
        });

        video.addEventListener('seeked', () => {
            let w = video.videoWidth, h = video.videoHeight;
            if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(video, 0, 0, w, h);
            URL.revokeObjectURL(video.src);
            resolve(canvas.toDataURL('image/jpeg', quality));
        });

        video.addEventListener('error', () => resolve(null));
    });
}

// ── VALIDATE EMAIL ──
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── PASSWORD STRENGTH ──
function checkPasswordStrength(password) {
    if (!password) return { score: 0, label: 'Enter password', level: 'none' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Weak', level: 'weak' };
    if (score <= 3) return { score, label: 'Medium', level: 'medium' };
    return { score, label: 'Strong', level: 'strong' };
}

// ── SHOW TOAST (temporary notification) ──
function showToast(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.fexer-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'fexer-toast';

    const colors = {
        success: { bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.3)', color: '#4ade80' },
        error: { bg: 'rgba(239,68,68,.15)', border: 'rgba(239,68,68,.3)', color: '#f87171' },
        info: { bg: 'rgba(59,130,246,.15)', border: 'rgba(59,130,246,.3)', color: '#60a5fa' }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.color};
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
    animation: toastIn .2s ease;
    font-family: 'Segoe UI', system-ui, sans-serif;
  `;
    toast.textContent = message;

    // CSS animation inject karo (agar pehle nahi hai)
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(10px); } }
    `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut .2s ease forwards';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

// ── FORMAT FILE SIZE ──
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── IS MOBILE ──
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ── API FETCH WRAPPER ──
// Note: authHdr() function script.js mein define hai
// Utils mein sirf generic fetch wrapper hai
async function fetchJSON(url, opts = {}) {
    try {
        const res = await fetch(url, opts);
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: null, error: e.message };
    }
}

// ── PLAN INFO ──
const PLAN_INFO = {
    free: { name: 'Free Plan', credits: '5/day', color: '#777', price: '$0/mo' },
    pro: { name: 'Pro Plan', credits: '100/day', color: '#3b82f6', price: '$20/mo' },
    max: { name: 'Max Plan', credits: 'Unlimited', color: '#c084fc', price: '$75/mo' }
};

function getPlanInfo(plan) {
    return PLAN_INFO[plan] || PLAN_INFO.free;
}

// ── EXPORT (global scope mein available rahein) ──
// Ye sab functions globally accessible hain
// Script.js inhe seedha use kar sakta hai
window.FexerUtils = {
    $,
    esc,
    timeAgo,
    formatDate,
    truncate,
    randomVoice,
    genId,
    debounce,
    deepClone,
    Store,
    mdToPlain,
    stripForTTS,
    parseMd,
    blobToBase64,
    dataURLtoBlob,
    downloadFile,
    downloadImage,
    savePDF,
    copyToClipboard,
    compressImage,
    extractVideoFrame,
    isValidEmail,
    checkPasswordStrength,
    showToast,
    formatBytes,
    isMobile,
    fetchJSON,
    getPlanInfo,
    VOICE_OPTIONS,
    PLAN_INFO
};