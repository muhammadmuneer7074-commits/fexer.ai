'use strict';

// ══════════════════════════════════════
//  CONFIG — replace karo
// ══════════════════════════════════════
const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';

// ══════════════════════════════════════
//  UTILS SE FUNCTIONS
// ══════════════════════════════════════
const $ = FexerUtils.$;
const esc = FexerUtils.esc;
const timeAgo = FexerUtils.timeAgo;
const truncate = FexerUtils.truncate;
const rndVoice = FexerUtils.randomVoice;
const genId = FexerUtils.genId;
const Store = FexerUtils.Store;
const parseMd = FexerUtils.parseMd;
const stripForTTS = FexerUtils.stripForTTS;
const blobToBase64 = FexerUtils.blobToBase64;
const downloadImage = FexerUtils.downloadImage;
const savePDF = FexerUtils.savePDF;
const copyText = FexerUtils.copyToClipboard;
const showToast = FexerUtils.showToast;
const compressImg = FexerUtils.compressImage;
const extractFrame = FexerUtils.extractVideoFrame;

// ══════════════════════════════════════
//  SUPABASE
// ══════════════════════════════════════
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
let SB_USER = null;
let SB_SESSION = null;
let USER_PLAN = 'free';
let USER_CREDITS = 5;

// ══════════════════════════════════════
//  SVG ICONS
// ══════════════════════════════════════
const IC = {
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="11" y1="3" x2="11" y2="21"/><line x1="15" y1="6" x2="15" y2="18"/><line x1="19" y1="10" x2="19" y2="14"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  dl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

// ══════════════════════════════════════
//  AUTH HELPERS
// ══════════════════════════════════════
function authHdr() {
  return SB_SESSION
    ? { 'Authorization': 'Bearer ' + SB_SESSION.access_token }
    : {};
}

async function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHdr(),
      ...(opts.headers || {})
    }
  });
}

// ══════════════════════════════════════
//  AUTH
// ══════════════════════════════════════
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/auth.html'; return; }
  SB_SESSION = session;
  SB_USER = session.user;

  sb.auth.onAuthStateChange((_e, sess) => {
    if (!sess) { window.location.href = '/auth.html'; return; }
    SB_SESSION = sess;
    SB_USER = sess.user;
  });

  await loadUserData();
}

async function loadUserData() {
  if (!SB_USER) return;

  // Credits load
  try {
    const r = await apiFetch('/.netlify/functions/credits-get');
    if (r.ok) {
      const { credits } = await r.json();
      USER_PLAN = credits.plan || 'free';
      USER_CREDITS = credits.plan === 'max' ? Infinity : (credits.credits_remaining ?? 0);
      updateCreditsUI();
    }
  } catch (e) { console.error('Credits load failed:', e); }

  // Profile UI
  const email = SB_USER.email || '';
  const init = email.charAt(0).toUpperCase();

  const sbAv = $('sbAvatar'), sbNm = $('sbName'), pEm = $('profileEmail');
  if (sbAv) sbAv.textContent = init;
  if (sbNm) sbNm.textContent = email.split('@')[0];
  if (pEm) pEm.value = email;

  updateCurrentPlanCard();

  // Saved profile
  const saved = Store.get('fexerProfile', {});
  if (saved.name) {
    const n = $('profileName');
    if (n) n.value = saved.name;
    if (sbNm) sbNm.textContent = saved.name;
  }
  if (saved.instructions) {
    const i = $('profileInstructions');
    if (i) i.value = saved.instructions;
    SETTINGS.customInstructions = saved.instructions;
  }
  if (saved.photo) {
    const ph = $('profilePhoto'), av = $('sbAvatar');
    if (ph) ph.innerHTML = `<img src="${saved.photo}" alt="">`;
    if (av) av.innerHTML = `<img src="${saved.photo}" alt="">`;
  }

  if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
    window.history.replaceState({}, '', '/');
    showToast('🎉 Plan upgraded! Your new credits are now active.', 'success', 5000);
  }
}

function updateCreditsUI() {
  const display = USER_PLAN === 'max' ? '∞' : String(USER_CREDITS);
  const cn = $('creditsNum'), pb = $('planBadge');
  if (cn) cn.textContent = display;
  if (pb) pb.textContent = USER_PLAN.charAt(0).toUpperCase() + USER_PLAN.slice(1);

  const bar = $('noCreditsBar');
  if (bar) bar.style.display = (USER_CREDITS <= 0 && USER_PLAN !== 'max') ? 'flex' : 'none';
}

function updateCurrentPlanCard() {
  const info = FexerUtils.getPlanInfo(USER_PLAN);
  const n = $('currentPlanName'), c = $('currentPlanCreds'), b = $('currentPlanBadge');
  if (n) n.textContent = info.name;
  if (c) c.textContent = info.credits + '/day';
  if (b) b.textContent = USER_PLAN.charAt(0).toUpperCase() + USER_PLAN.slice(1);
}

async function useCredit() {
  if (USER_PLAN === 'max') return true;
  if (USER_CREDITS <= 0) {
    const bar = $('noCreditsBar');
    if (bar) bar.style.display = 'flex';
    return false;
  }
  USER_CREDITS = Math.max(0, USER_CREDITS - 1);
  updateCreditsUI();
  return true;
}

// No credits bar
$('noCreditsUpgrade').addEventListener('click', () => {
  $('noCreditsBar').style.display = 'none';
  openProfile('plans');
});
$('noCreditsClose').addEventListener('click', () => {
  $('noCreditsBar').style.display = 'none';
});

// ══════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════
let SETTINGS = Store.get('fexerSettings', {
  toolsEnabled: true,
  deepSearch: false,
  deepThinking: false,
  voice: 'auto',
  style: 'normal',
  customInstructions: ''
});

function saveSettings() { Store.set('fexerSettings', SETTINGS); }

function loadSettings() {
  const s = Store.get('fexerSettings', {});
  Object.assign(SETTINGS, s);

  const tg = $('toolsToggle'), sg = $('searchToggle');
  if (tg) tg.classList.toggle('on', SETTINGS.toolsEnabled);
  if (sg) sg.classList.toggle('on', SETTINGS.deepSearch);

  document.querySelectorAll('#styleChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.style === (SETTINGS.style || 'normal'))
  );
  document.querySelectorAll('#voiceChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.voice === (SETTINGS.voice || 'auto'))
  );
  if (SETTINGS.customInstructions) {
    const i = $('profileInstructions');
    if (i) i.value = SETTINGS.customInstructions;
  }
}

$('toolsToggle').addEventListener('click', () => {
  SETTINGS.toolsEnabled = !SETTINGS.toolsEnabled;
  $('toolsToggle').classList.toggle('on', SETTINGS.toolsEnabled);
  saveSettings();
});
$('searchToggle').addEventListener('click', () => {
  SETTINGS.deepSearch = !SETTINGS.deepSearch;
  $('searchToggle').classList.toggle('on', SETTINGS.deepSearch);
  saveSettings();
});

// ══════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════
$('menuBtn').addEventListener('click', () => {
  $('sidebar').classList.toggle('open');
  $('sidebarOverlay').classList.toggle('active');
});
$('sidebarOverlay').addEventListener('click', closeSidebar);
$('sidebarClose').addEventListener('click', closeSidebar);

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('active');
}

$('upgradeBtn').addEventListener('click', () => { closeSidebar(); openProfile('plans'); });

// ══════════════════════════════════════
//  PROFILE MODAL
// ══════════════════════════════════════
function openProfile(tab = 'profile') {
  $('profileModal').classList.add('open');
  switchProfileTab(tab);
  updateCreditsUI();
}

$('profileBtn').addEventListener('click', () => openProfile('profile'));
$('closeProfileBtn').addEventListener('click', () => $('profileModal').classList.remove('open'));
$('profileModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('open');
});

function switchProfileTab(name) {
  document.querySelectorAll('.profile-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.profile-tab-content').forEach(p =>
    p.classList.toggle('active', p.id === 'ptab-' + name)
  );
}
document.querySelectorAll('.profile-tab').forEach(t =>
  t.addEventListener('click', () => switchProfileTab(t.dataset.tab))
);

// Profile photo
$('changePhotoBtn').addEventListener('click', () => $('photoInputProfile').click());
$('photoInputProfile').addEventListener('change', function (e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const b64 = ev.target.result;
    const ph = $('profilePhoto'), av = $('sbAvatar');
    if (ph) ph.innerHTML = `<img src="${b64}" alt="">`;
    if (av) av.innerHTML = `<img src="${b64}" alt="">`;
    const saved = Store.get('fexerProfile', {});
    saved.photo = b64;
    Store.set('fexerProfile', saved);
  };
  reader.readAsDataURL(f);
  e.target.value = '';
});

// Style chips
document.querySelectorAll('#styleChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#styleChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    SETTINGS.style = chip.dataset.style;
    saveSettings();
  });
});

// Voice chips
document.querySelectorAll('#voiceChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#voiceChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    SETTINGS.voice = chip.dataset.voice;
    saveSettings();
  });
});

// Save profile
$('saveProfileBtn').addEventListener('click', () => {
  const name = ($('profileName')?.value || '').trim();
  const inst = ($('profileInstructions')?.value || '').trim();
  const saved = Store.get('fexerProfile', {});
  saved.name = name; saved.instructions = inst;
  Store.set('fexerProfile', saved);
  SETTINGS.customInstructions = inst;
  saveSettings();
  if (name && $('sbName')) $('sbName').textContent = name;
  showToast('✓ Profile saved!', 'success');
});

// Sign out
$('signOutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  await sb.auth.signOut();
  window.location.href = '/auth.html';
});

// ── Subscription ──
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const plan = btn.dataset.plan; if (!plan) return;
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Loading...';
    try {
      const r = await apiFetch('/.netlify/functions/lemonsqueezy-checkout', {
        method: 'POST', body: JSON.stringify({ plan })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
      btn.disabled = false; btn.textContent = orig;
    }
  });
});

$('billingPortalBtn').addEventListener('click', async () => {
  const btn = $('billingPortalBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Loading...';
  try {
    const r = await apiFetch('/.netlify/functions/lemonsqueezy-portal', {
      method: 'POST', body: '{}'
    });
    const data = await r.json();
    if (data.url) window.open(data.url, '_blank');
    else showToast(data.error || 'No portal found. Subscribe first.', 'error');
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
  btn.disabled = false; btn.innerHTML = orig;
});

// ══════════════════════════════════════
//  IMAGE GENERATION MODAL
// ══════════════════════════════════════
function openImageGen() {
  $('imageGenModal').classList.add('open');
  const p = $('imagePrompt'); if (p) p.value = '';
  const r = $('imageResult'); if (r) r.innerHTML = '';
  document.querySelectorAll('.size-chip').forEach((c, i) =>
    c.classList.toggle('active', i === 0)
  );
}

$('imageGenMenuBtn').addEventListener('click', () => {
  $('attachMenu').classList.remove('open');
  openImageGen();
});
$('closeImageGenBtn').addEventListener('click', () => $('imageGenModal').classList.remove('open'));
$('imageGenModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('open');
});

document.querySelectorAll('.size-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

$('generateImageBtn').addEventListener('click', async () => {
  const prompt = ($('imagePrompt')?.value || '').trim();
  if (!prompt) { showToast('Please describe the image.', 'error'); return; }

  const ok = await useCredit();
  if (!ok) { $('imageGenModal').classList.remove('open'); openProfile('plans'); return; }

  const sizeEl = document.querySelector('.size-chip.active');
  const size = sizeEl ? sizeEl.dataset.size : '1024x1024';
  const btn = $('generateImageBtn'), resEl = $('imageResult');

  btn.disabled = true; btn.textContent = 'Generating...';
  resEl.innerHTML = '<p style="color:var(--txd);text-align:center;padding:20px;font-size:13px;">🎨 Creating your image...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/generate-image', {
      method: 'POST', body: JSON.stringify({ prompt, size })
    });
    const data = await r.json();

    if (r.status === 402) {
      resEl.innerHTML = '';
      $('imageGenModal').classList.remove('open');
      openProfile('plans');
      return;
    }
    if (!r.ok) throw new Error(data.error || 'Generation failed');

    resEl.innerHTML = `
      <img src="data:image/png;base64,${data.b64}" alt="Generated" style="width:100%;border-radius:12px;display:block;margin-bottom:10px;">
      <button id="dlImgBtn" class="sec-btn" style="width:100%;justify-content:center;">${IC.dl} Download Image</button>
    `;
    $('dlImgBtn').addEventListener('click', () => downloadImage(data.b64));

  } catch (e) {
    resEl.innerHTML = `<p style="color:var(--red);text-align:center;font-size:13px;">❌ ${e.message}</p>`;
  }

  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Generate`;
});

// ══════════════════════════════════════
//  CHAT STATE
// ══════════════════════════════════════
let CHATS = {};
let CHAT_ORDER = [];
let CURRENT_CHAT = null;
let IS_DRAFT = false, DRAFT_CHAT = null;
let IS_TEMP = false, TEMP_CHAT = null;

let SEL_IMAGE = null, SEL_FILE = null, SEL_FILE_NAME = null;
let IS_WAITING = false, ABORT = null, CUR_PLAYER = null;
let VOICE_ON = false, IS_LISTENING = false;

function activeChat() {
  if (IS_DRAFT) return DRAFT_CHAT;
  if (IS_TEMP) return TEMP_CHAT;
  return CHATS[CURRENT_CHAT];
}

function chatVoice() {
  if (SETTINGS.voice !== 'auto') return SETTINGS.voice;
  const c = activeChat(); if (!c) return rndVoice();
  if (!c.voice) {
    c.voice = rndVoice();
    if (!IS_DRAFT && !IS_TEMP) saveChats();
  }
  return c.voice;
}

function saveChats() {
  Store.set('fexerChats', { chats: CHATS, order: CHAT_ORDER });
}

function loadChats() {
  const data = Store.get('fexerChats', { chats: {}, order: [] });
  CHATS = data.chats || {};
  CHAT_ORDER = data.order || [];

  if (CHAT_ORDER.length) {
    CURRENT_CHAT = CHAT_ORDER[0];
    renderChatList();
    renderMessages();
  } else {
    startDraft();
  }
}

// ── Draft / Temp ──
function startDraft() {
  IS_TEMP = false; TEMP_CHAT = null;
  IS_DRAFT = true;
  DRAFT_CHAT = { title: 'New Chat', messages: [], voice: rndVoice() };
  CURRENT_CHAT = null;
  renderChatList(); renderMessages(); setHeader(); closeSidebar();
}

function startTemp() {
  IS_DRAFT = false; DRAFT_CHAT = null;
  IS_TEMP = true;
  TEMP_CHAT = { title: 'Temporary Chat', messages: [], voice: rndVoice() };
  renderChatList(); renderMessages(); setHeader(); closeSidebar();
}

function exitTemp() { IS_TEMP = false; TEMP_CHAT = null; }

function promoteDraft() {
  if (!IS_DRAFT) return;
  const id = genId('chat');
  CHATS[id] = DRAFT_CHAT;
  CHAT_ORDER.unshift(id);
  CURRENT_CHAT = id;
  IS_DRAFT = false;
  DRAFT_CHAT = null;
}

// ── Header ──
function setHeader() {
  const t = $('chatTitle'); if (!t) return;
  if (IS_TEMP) t.textContent = '🕶️ Temporary Chat';
  else if (IS_DRAFT) t.textContent = 'Fexer AI';
  else t.textContent = CHATS[CURRENT_CHAT]?.title || 'Fexer AI';

  const gb = $('ghostBtn');
  if (gb) gb.classList.toggle('ghost-active', IS_TEMP);
}

$('ghostBtn').addEventListener('click', () => {
  IS_TEMP ? (exitTemp(), startDraft()) : startTemp();
});
$('hdrNewChatBtn').addEventListener('click', startDraft);
$('newChatBtn').addEventListener('click', startDraft);

// ── 3-dot menu ──
$('chatMenuBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  const dd = $('chatDropdown'); dd.classList.toggle('open');
  const c = CHATS[CURRENT_CHAT];
  const sl = $('starLabel'); if (sl) sl.textContent = c?.starred ? 'Unstar' : 'Star';
});

$('starBtn').addEventListener('click', () => {
  $('chatDropdown').classList.remove('open');
  if (!IS_DRAFT && !IS_TEMP && CHATS[CURRENT_CHAT]) {
    CHATS[CURRENT_CHAT].starred = !CHATS[CURRENT_CHAT].starred;
    saveChats(); renderChatList();
  }
});

$('renameBtn').addEventListener('click', () => {
  $('chatDropdown').classList.remove('open');
  if (!IS_DRAFT && !IS_TEMP && CHATS[CURRENT_CHAT]) {
    const n = prompt('Rename:', CHATS[CURRENT_CHAT].title);
    if (n?.trim()) {
      CHATS[CURRENT_CHAT].title = n.trim();
      saveChats(); renderChatList(); setHeader();
    }
  }
});

$('deleteChatBtn').addEventListener('click', () => {
  $('chatDropdown').classList.remove('open');
  if (confirm('Delete this chat?')) deleteChat(CURRENT_CHAT);
});

// Close dropdowns on outside click
document.addEventListener('click', e => {
  const am = $('attachMenu'), ab = $('attachBtn');
  const dd = $('chatDropdown'), mb = $('chatMenuBtn');
  if (am && !am.contains(e.target) && e.target !== ab) am.classList.remove('open');
  if (dd && !dd.contains(e.target) && e.target !== mb) dd.classList.remove('open');
});

// ── Chat List ──
function switchChat(id) {
  IS_DRAFT = false; DRAFT_CHAT = null; exitTemp();
  CURRENT_CHAT = id;
  renderChatList(); renderMessages(); setHeader(); closeSidebar();
}

function deleteChat(id) {
  delete CHATS[id];
  CHAT_ORDER = CHAT_ORDER.filter(x => x !== id);
  if (CURRENT_CHAT === id) {
    CHAT_ORDER.length
      ? (CURRENT_CHAT = CHAT_ORDER[0], IS_DRAFT = false, DRAFT_CHAT = null)
      : startDraft();
  }
  saveChats(); renderChatList(); renderMessages(); setHeader();
}

function renderChatList(q) {
  const list = $('chatList'); if (!list) return;
  list.innerHTML = '';
  const query = (q || '').toLowerCase();
  let ids = CHAT_ORDER.filter(id =>
    CHATS[id] && (!query || CHATS[id].title.toLowerCase().includes(query))
  );
  ids.sort((a, b) => (CHATS[b].starred ? 1 : 0) - (CHATS[a].starred ? 1 : 0));

  if (!ids.length) {
    list.innerHTML = '<div class="sb-empty">No chats yet</div>';
    return;
  }

  ids.forEach(id => {
    const chat = CHATS[id];
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === CURRENT_CHAT && !IS_TEMP && !IS_DRAFT ? ' active' : '');

    const tw = document.createElement('span'); tw.className = 'chat-item-title';
    if (chat.starred) {
      const si = document.createElement('span'); si.className = 'chat-star-icon'; si.innerHTML = IC.star; tw.appendChild(si);
    }
    const tt = document.createElement('span'); tt.className = 'chat-item-text'; tt.textContent = chat.title; tw.appendChild(tt);
    item.appendChild(tw);

    const db = document.createElement('button'); db.className = 'chat-del-btn'; db.innerHTML = IC.trash;
    db.addEventListener('click', e => { e.stopPropagation(); if (confirm('Delete?')) deleteChat(id); });
    item.appendChild(db);

    let pressTimer = null, didLong = false;
    const onDown = () => { didLong = false; pressTimer = setTimeout(() => { didLong = true; item.classList.add('show-delete'); }, 500); };
    const onUp = () => clearTimeout(pressTimer);
    item.addEventListener('mousedown', onDown);
    item.addEventListener('touchstart', onDown, { passive: true });
    ['mouseup', 'mouseleave', 'touchend'].forEach(ev => item.addEventListener(ev, onUp));
    item.addEventListener('click', () => {
      if (didLong) return;
      if (item.classList.contains('show-delete')) { item.classList.remove('show-delete'); return; }
      switchChat(id);
    });

    list.appendChild(item);
  });
}

$('chatSearch').addEventListener('input', FexerUtils.debounce(function () {
  renderChatList(this.value);
}, 200));

// ══════════════════════════════════════
//  ATTACH MENU
// ══════════════════════════════════════
$('attachBtn').addEventListener('click', e => {
  e.stopPropagation();
  $('attachMenu').classList.toggle('open');
});

$('photoBtn').addEventListener('click', () => { $('photoInput').click(); $('attachMenu').classList.remove('open'); });
$('cameraBtn').addEventListener('click', () => { $('attachMenu').classList.remove('open'); openCamera(); });
$('fileBtn').addEventListener('click', () => { $('fileInput').click(); $('attachMenu').classList.remove('open'); });

$('photoInput').addEventListener('change', async function (e) {
  const f = e.target.files[0]; if (!f) return;
  SEL_FILE = null; SEL_FILE_NAME = null;
  if (f.type.startsWith('video/')) {
    const b64 = await extractFrame(f);
    if (b64) { SEL_IMAGE = b64; showImgPreview(b64, true); updateBtn(); }
  } else {
    const b64 = await compressImg(f);
    SEL_IMAGE = b64; showImgPreview(b64, false); updateBtn();
  }
  e.target.value = '';
});

$('fileInput').addEventListener('change', function (e) {
  const f = e.target.files[0]; if (!f) return;
  SEL_IMAGE = null;
  const reader = new FileReader();
  reader.onload = ev => {
    SEL_FILE = ev.target.result;
    SEL_FILE_NAME = f.name;
    showFilePreview(f.name);
    updateBtn();
  };
  reader.readAsText(f);
  e.target.value = '';
});

function showImgPreview(b64, isVid) {
  const a = $('previewArea'); if (!a) return;
  a.innerHTML = `
    <div class="prev-img">
      <img src="${b64}" alt="preview">
      ${isVid ? '<span class="vid-badge">Video frame</span>' : ''}
      <button class="rm-btn" id="rmPreview">×</button>
    </div>`;
  a.classList.add('has-preview');
  $('rmPreview')?.addEventListener('click', clearPreview);
}

function showFilePreview(name) {
  const a = $('previewArea'); if (!a) return;
  a.innerHTML = `
    <div class="prev-file">
      ${IC.pdf}
      <span class="prev-file-name">${esc(name)}</span>
      <button class="rm-btn" id="rmPreview" style="position:static;margin-left:auto;">×</button>
    </div>`;
  a.classList.add('has-preview');
  $('rmPreview')?.addEventListener('click', clearPreview);
}

function clearPreview() {
  SEL_IMAGE = null; SEL_FILE = null; SEL_FILE_NAME = null;
  const a = $('previewArea');
  if (a) { a.innerHTML = ''; a.classList.remove('has-preview'); }
  updateBtn();
}

// ══════════════════════════════════════
//  CAMERA
// ══════════════════════════════════════
let CAM_STREAM = null, CAM_FACING = 'user';

async function openCamera() {
  $('cameraOverlay').classList.add('active');
  CAM_FACING = 'user';
  await startCam();
}

async function startCam() {
  if (CAM_STREAM) CAM_STREAM.getTracks().forEach(t => t.stop());
  try {
    CAM_STREAM = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CAM_FACING } });
    $('camVideo').srcObject = CAM_STREAM;
  } catch (e) {
    addBubble('⚠️ Camera access denied.', 'bot');
    closeCamera();
  }
}

$('camSwitch').addEventListener('click', () => {
  CAM_FACING = CAM_FACING === 'user' ? 'environment' : 'user';
  startCam();
});

$('camCapture').addEventListener('click', () => {
  const v = $('camVideo'), c = $('camCanvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const b64 = c.toDataURL('image/jpeg', 0.9);
  SEL_IMAGE = b64; SEL_FILE = null; SEL_FILE_NAME = null;
  showImgPreview(b64, false); updateBtn(); closeCamera();
});

$('camCancel').addEventListener('click', closeCamera);

function closeCamera() {
  $('cameraOverlay').classList.remove('active');
  if (CAM_STREAM) { CAM_STREAM.getTracks().forEach(t => t.stop()); CAM_STREAM = null; }
}

// ══════════════════════════════════════
//  MIC (DICTATION)
// ══════════════════════════════════════
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let RECOG = null;

if (SR) {
  RECOG = new SR();
  RECOG.lang = 'en-US'; RECOG.continuous = false; RECOG.interimResults = false;
  RECOG.onresult = e => { $('msgInput').value = e.results[0][0].transcript; updateBtn(); };
  RECOG.onend = () => { IS_LISTENING = false; $('micBtn').classList.remove('listening'); };
  RECOG.onerror = () => { IS_LISTENING = false; $('micBtn').classList.remove('listening'); };
  $('micBtn').addEventListener('click', () => {
    if (IS_LISTENING) { RECOG.stop(); }
    else {
      try { IS_LISTENING = true; $('micBtn').classList.add('listening'); RECOG.start(); }
      catch (e) { IS_LISTENING = false; }
    }
  });
} else {
  $('micBtn').style.display = 'none';
}

// ══════════════════════════════════════
//  ACTION BUTTON
// ══════════════════════════════════════
function updateBtn() {
  const btn = $('actionBtn'); if (!btn) return;
  btn.className = 'action-btn';

  if (IS_WAITING) {
    btn.innerHTML = IC.stop; btn.classList.add('stop-mode');
    btn.onclick = () => { if (ABORT) ABORT.abort(); };
    return;
  }
  if (VOICE_ON) {
    btn.innerHTML = IC.voice; btn.classList.add('voice-mode');
    btn.onclick = stopVoice;
    return;
  }
  const hasInput = ($('msgInput')?.value.trim()) || SEL_IMAGE || SEL_FILE;
  if (hasInput) {
    btn.innerHTML = IC.send; btn.classList.add('send-mode');
    btn.onclick = sendMsg;
  } else {
    btn.innerHTML = IC.voice;
    btn.onclick = startVoice;
  }
}

$('msgInput').addEventListener('input', updateBtn);
$('msgInput').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});

// ══════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════
async function sendMsg() {
  const inp = $('msgInput'); if (!inp) return;
  let txt = inp.value.trim();
  if (!txt && !SEL_IMAGE && !SEL_FILE) return;

  const ok = await useCredit();
  if (!ok) { openProfile('plans'); return; }

  promoteDraft();
  const chat = activeChat(); if (!chat) return;

  // File content append
  if (SEL_FILE) {
    const block = `Attached file: ${SEL_FILE_NAME}\n\`\`\`\n${SEL_FILE.slice(0, 20000)}\n\`\`\``;
    txt = txt ? txt + '\n\n' + block : block;
  }

  // Content build
  let content;
  if (SEL_IMAGE) {
    content = [];
    if (txt) content.push({ type: 'text', text: txt });
    content.push({ type: 'image_url', image_url: { url: SEL_IMAGE } });
  } else {
    content = txt;
  }

  // First message — set title
  if (!chat.messages.length) {
    const src = inp.value.trim() || SEL_FILE_NAME || 'Image';
    chat.title = truncate(src, 35);
    if (!IS_TEMP) renderChatList();
  }

  addBubble(content, 'user');
  chat.messages.push({ role: 'user', content });
  if (!IS_TEMP) saveChats();
  setHeader();
  inp.value = ''; clearPreview();

  IS_WAITING = true; disableInput(true); updateBtn(); showTyping();
  if (VOICE_ON) setOrb('thinking');
  ABORT = new AbortController();

  try {
    const r = await apiFetch('/.netlify/functions/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: chat.messages,
        voiceMode: VOICE_ON,
        deepThinking: SETTINGS.deepThinking,
        deepSearch: SETTINGS.deepSearch,
        customInstructions: SETTINGS.customInstructions || '',
        toolsEnabled: SETTINGS.toolsEnabled
      }),
      signal: ABORT.signal
    });

    if (r.status === 402) {
      removeTyping(); doneSend();
      addBubble("⚠️ You've run out of credits for today. Upgrade to continue.", 'bot');
      openProfile('plans');
      return;
    }

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      removeTyping();
      addBubble('⚠️ ' + (d.error || 'Server error. Please try again.'), 'bot');
      doneSend(); return;
    }

    const data = await r.json();
    const reply = data.choices[0].message.content;

    removeTyping(); addBubble(reply, 'bot');
    chat.messages.push({ role: 'assistant', content: reply });
    if (!IS_TEMP) saveChats();
    doneSend();

    if (VOICE_ON) {
      setOrb('speaking');
      await tts(speakable(reply));
      if (VOICE_ON) { setOrb('listening'); startRecording(); }
    }

  } catch (e) {
    removeTyping();
    addBubble(
      e.name === 'AbortError'
        ? '⏹️ Stopped.'
        : '⚠️ Connection error. Please check your internet.',
      'bot'
    );
    doneSend();
  }
}

function doneSend() { IS_WAITING = false; ABORT = null; disableInput(false); updateBtn(); }
function disableInput(v) {
  ['msgInput', 'attachBtn', 'micBtn'].forEach(id => {
    const el = $(id); if (el) el.disabled = v;
  });
}

// ══════════════════════════════════════
//  RENDER MESSAGES
// ══════════════════════════════════════
function renderMessages() {
  const el = $('chatMessages'); if (!el) return;
  el.innerHTML = '';
  const chat = activeChat(); if (!chat) return;
  if (IS_TEMP) addBubble("🕶️ Temporary Chat — this conversation won't be saved.", 'bot');
  if (!chat.messages.length) {
    if (!IS_TEMP) addBubble('Hi! I\'m Fexer AI. How can I help you today?', 'bot');
    return;
  }
  chat.messages.forEach(m => addBubble(m.content, m.role === 'user' ? 'user' : 'bot'));
}

function addBubble(content, type) {
  const el = $('chatMessages'); if (!el) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (type === 'user' ? 'user-msg' : 'bot-msg');

  if (Array.isArray(content)) {
    content.forEach(p => {
      if (p.type === 'text') {
        const t = document.createElement('div');
        t.innerHTML = type === 'bot' ? parseMd(p.text) : esc(p.text);
        div.appendChild(t);
      } else if (p.type === 'image_url') {
        const img = document.createElement('img');
        img.src = p.image_url.url; img.className = 'msg-image';
        div.appendChild(img);
      }
    });

  } else if (type === 'bot') {
    // Check for generated image
    const imgM = typeof content === 'string'
      ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/)
      : null;

    if (imgM) {
      const b64 = imgM[1], cap = imgM[2];
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + b64; img.className = 'msg-image';
      div.appendChild(img);
      if (cap.trim()) { const c = document.createElement('div'); c.textContent = cap.trim(); div.appendChild(c); }
      const acts = document.createElement('div'); acts.className = 'msg-actions';
      const db = document.createElement('button'); db.className = 'msg-btn'; db.innerHTML = IC.dl; db.title = 'Download';
      db.addEventListener('click', () => downloadImage(b64));
      acts.appendChild(db); div.appendChild(acts);

    } else {
      // Regular markdown message
      div.innerHTML = parseMd(content);

      // Code block copy buttons
      div.querySelectorAll('pre').forEach(pre => {
        pre.style.position = 'relative';
        const cp = document.createElement('button');
        cp.className = 'msg-btn'; cp.innerHTML = IC.copy; cp.title = 'Copy code';
        cp.style.cssText = 'position:absolute;top:6px;right:6px;';
        cp.addEventListener('click', async () => {
          const success = await copyText(pre.textContent.trim());
          if (success) { cp.style.color = '#22c55e'; setTimeout(() => cp.style.color = '', 1500); }
        });
        pre.appendChild(cp);
      });

      // Message action buttons
      const acts = document.createElement('div'); acts.className = 'msg-actions';

      const pdfBtn = document.createElement('button'); pdfBtn.className = 'msg-btn'; pdfBtn.innerHTML = IC.pdf; pdfBtn.title = 'Save PDF';
      pdfBtn.addEventListener('click', () => savePDF(content));

      const cpBtn = document.createElement('button'); cpBtn.className = 'msg-btn'; cpBtn.innerHTML = IC.copy; cpBtn.title = 'Copy';
      cpBtn.addEventListener('click', async () => {
        const plain = content.replace(/\{\{FEXER_IMAGE:[\s\S]+?\}\}/g, '[image]');
        const success = await copyText(plain);
        if (success) { cpBtn.classList.add('copy-ok'); setTimeout(() => cpBtn.classList.remove('copy-ok'), 1500); }
      });

      acts.appendChild(pdfBtn); acts.appendChild(cpBtn); div.appendChild(acts);
    }

  } else {
    div.textContent = content;
  }

  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function showTyping() {
  const el = $('chatMessages'); if (!el) return;
  const d = document.createElement('div');
  d.className = 'msg bot-msg typing'; d.id = 'typingIndicator';
  d.innerHTML = '<span></span><span></span><span></span>';
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}
function removeTyping() { $('typingIndicator')?.remove(); }

function speakable(t) {
  const m = t.match(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?([\s\S]*)$/);
  return m ? (m[1] || "Here's your image!") : t;
}

// ══════════════════════════════════════
//  LIVE VOICE
// ══════════════════════════════════════
let V_STREAM = null, V_RECORDER = null, V_CHUNKS = [];
let V_CTX = null, V_ANALYSER = null, V_TIMER = null, V_SPOKEN = false;

$('closeVoiceBtn').addEventListener('click', stopVoice);

async function startVoice() {
  if (!navigator.mediaDevices?.getUserMedia) {
    addBubble('⚠️ Microphone not available in this browser.', 'bot');
    return;
  }
  VOICE_ON = true;
  $('voiceOverlay').classList.add('active');
  setOrb('listening');
  updateBtn();
  await startRecording();
}

function stopVoice() {
  VOICE_ON = false;
  $('voiceOverlay').classList.remove('active');
  if (V_RECORDER?.state === 'recording') V_RECORDER.stop();
  cleanupVoice();
  if (CUR_PLAYER) { CUR_PLAYER.pause(); CUR_PLAYER = null; }
  if (ABORT) ABORT.abort();
  updateBtn();
}

function setOrb(state) {
  const orb = $('voiceOrb'), txt = $('voiceStatus'); if (!orb || !txt) return;
  orb.classList.remove('thinking', 'speaking');
  if (state === 'thinking') { orb.classList.add('thinking'); txt.textContent = 'Thinking...'; }
  else if (state === 'speaking') { orb.classList.add('speaking'); txt.textContent = 'Speaking...'; }
  else { txt.textContent = 'Listening...'; }
}

async function startRecording() {
  try { V_STREAM = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addBubble('⚠️ Microphone access denied.', 'bot'); stopVoice(); return; }

  V_CHUNKS = []; V_SPOKEN = false;
  V_RECORDER = new MediaRecorder(V_STREAM);
  V_RECORDER.ondataavailable = e => { if (e.data.size > 0) V_CHUNKS.push(e.data); };
  V_RECORDER.onstop = () => {
    cleanupVoice(); if (!VOICE_ON) return;
    const blob = new Blob(V_CHUNKS, { type: V_RECORDER.mimeType });
    blob.size > 1000 ? processVoice(blob) : startRecording();
  };
  V_RECORDER.start(); setOrb('listening'); watchSilence();
  V_TIMER = setTimeout(() => { if (V_RECORDER?.state === 'recording') V_RECORDER.stop(); }, 15000);
}

function watchSilence() {
  V_CTX = new (window.AudioContext || window.webkitAudioContext)();
  const src = V_CTX.createMediaStreamSource(V_STREAM);
  V_ANALYSER = V_CTX.createAnalyser(); V_ANALYSER.fftSize = 512; src.connect(V_ANALYSER);
  const buf = new Uint8Array(V_ANALYSER.frequencyBinCount); let silStart = null;
  function chk() {
    if (!V_RECORDER || V_RECORDER.state !== 'recording') return;
    V_ANALYSER.getByteFrequencyData(buf);
    const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
    if (avg > 12) { V_SPOKEN = true; silStart = null; }
    else if (V_SPOKEN) {
      if (!silStart) silStart = Date.now();
      if (Date.now() - silStart > 1200) { V_RECORDER.stop(); return; }
    }
    requestAnimationFrame(chk);
  }
  requestAnimationFrame(chk);
}

function cleanupVoice() {
  if (V_TIMER) { clearTimeout(V_TIMER); V_TIMER = null; }
  if (V_CTX) { V_CTX.close(); V_CTX = null; }
  if (V_STREAM) { V_STREAM.getTracks().forEach(t => t.stop()); V_STREAM = null; }
}

async function processVoice(blob) {
  setOrb('thinking');
  const b64 = await blobToBase64(blob);
  try {
    const resp = await apiFetch('/.netlify/functions/transcribe', {
      method: 'POST', body: JSON.stringify({ audioBase64: b64, mimeType: blob.type })
    });
    if (!resp.ok) throw new Error('Transcription failed');
    const d = await resp.json();
    const txt = (d.text || '').trim();
    if (!txt) { if (VOICE_ON) startRecording(); return; }
    $('msgInput').value = txt;
    sendMsg();
  } catch (e) {
    console.error('Transcribe error:', e);
    if (VOICE_ON) {
      addBubble("⚠️ Couldn't understand. Please try again.", 'bot');
      startRecording();
    }
  }
}

async function tts(text) {
  return new Promise(async resolve => {
    try {
      const r = await apiFetch('/.netlify/functions/speak', {
        method: 'POST', body: JSON.stringify({ text: stripForTTS(text), voice: chatVoice() })
      });
      if (!r.ok) { resolve(); return; }
      const d = await r.json();
      const a = new Audio('data:audio/mp3;base64,' + d.audioBase64);
      CUR_PLAYER = a;
      a.onended = () => { CUR_PLAYER = null; resolve(); };
      a.onerror = () => { CUR_PLAYER = null; resolve(); };
      a.play().catch(() => { CUR_PLAYER = null; resolve(); });
    } catch (e) { resolve(); }
  });
}

// ══════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════
let PROJECTS = [];
let CUR_PROJECT_ID = null;
let CUR_PLAN = null;

function saveProjects() { Store.set('fexerProjects', PROJECTS); }
function loadProjects() {
  PROJECTS = Store.get('fexerProjects', []);
  renderProjectsSidebar();
}

function openProjectsPanel() {
  $('projectsPanel').classList.add('open');
  renderPanelProjectList();
}
function closeProjectsPanel() { $('projectsPanel').classList.remove('open'); }

$('closePanelBtn').addEventListener('click', closeProjectsPanel);

$('newProjectBtn').addEventListener('click', () => {
  openProjectsPanel();
  CUR_PROJECT_ID = null;
  setProjectState('welcome');
  renderPanelProjectList();
  closeSidebar();
});

function renderProjectsSidebar() {
  const list = $('projectsList'); if (!list) return;
  if (!PROJECTS.length) { list.innerHTML = '<div class="sb-empty">No projects yet</div>'; return; }
  list.innerHTML = '';
  PROJECTS.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-sb-item' + (p.id === CUR_PROJECT_ID ? ' active' : '');
    item.innerHTML = `<div class="project-sb-icon">${IC.bolt}</div><span class="project-sb-name">${esc(p.name)}</span>`;
    item.addEventListener('click', () => {
      openProjectsPanel(); CUR_PROJECT_ID = p.id;
      renderPanelProjectList(); showProjectDash(p); closeSidebar();
    });
    list.appendChild(item);
  });
}

function renderPanelProjectList() {
  const list = $('panelProjectsList'); if (!list) return;
  if (!PROJECTS.length) {
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p>No projects yet</p></div>`;
    return;
  }
  list.innerHTML = '';
  PROJECTS.forEach(p => {
    const item = document.createElement('div');
    item.className = 'panel-project-item' + (p.id === CUR_PROJECT_ID ? ' active' : '');
    item.innerHTML = `
      <div class="pp-icon">${IC.bolt}</div>
      <div class="pp-info">
        <div class="pp-name">${esc(p.name)}</div>
        <div class="pp-status ${p.active ? 'active' : ''}">${p.active ? '🟢 Active' : '⚪ Inactive'}</div>
      </div>
      <button class="pp-del">${IC.trash}</button>`;

    item.querySelector('.pp-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete "' + p.name + '"?')) return;
      PROJECTS = PROJECTS.filter(x => x.id !== p.id); saveProjects();
      if (CUR_PROJECT_ID === p.id) { CUR_PROJECT_ID = null; setProjectState('welcome'); }
      renderPanelProjectList(); renderProjectsSidebar();
    });

    item.addEventListener('click', e => {
      if (e.target.closest('.pp-del')) return;
      CUR_PROJECT_ID = p.id; renderPanelProjectList(); showProjectDash(p);
    });

    list.appendChild(item);
  });
}

function setProjectState(name) {
  document.querySelectorAll('.panel-state').forEach(s => s.classList.remove('active'));
  const el = $('state-' + name); if (el) el.classList.add('active');
}

// ── Build Project ──
$('startProjectBtn').addEventListener('click', buildProject);
$('projectPrompt').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buildProject(); }
});

async function buildProject() {
  const inp = $('projectPrompt'); if (!inp) return;
  const prompt = inp.value.trim();
  if (!prompt) { showToast('Please describe your automation.', 'error'); return; }

  const ok = await useCredit();
  if (!ok) { closeProjectsPanel(); openProfile('plans'); return; }

  const btn = $('startProjectBtn'); if (btn) btn.disabled = true;
  setProjectState('planning');

  const stepEls = document.querySelectorAll('#planSteps .plan-step');
  let si = 0;
  const timer = setInterval(() => {
    if (si > 0 && stepEls[si - 1]) { stepEls[si - 1].classList.remove('active'); stepEls[si - 1].classList.add('done'); }
    if (si < stepEls.length && stepEls[si]) { stepEls[si].classList.add('active'); si++; }
    else clearInterval(timer);
  }, 700);

  try {
    const r = await apiFetch('/.netlify/functions/agent-plan', {
      method: 'POST', body: JSON.stringify({ prompt })
    });
    const data = await r.json();
    clearInterval(timer);
    stepEls.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

    if (r.status === 402) {
      if (btn) btn.disabled = false;
      setProjectState('welcome'); closeProjectsPanel(); openProfile('plans'); return;
    }
    if (!r.ok || !data.plan) throw new Error(data.error || 'Planning failed');

    CUR_PLAN = { prompt, ...data.plan };
    if (btn) btn.disabled = false;
    renderPlanUI(data.plan);

  } catch (e) {
    clearInterval(timer); if (btn) btn.disabled = false;
    setProjectState('welcome');
    showToast('❌ Planning failed: ' + e.message, 'error');
  }
}

function renderPlanUI(plan) {
  const ne = $('planName'), de = $('planDesc'), se = $('planStepsList'), no = $('planNodeTags');
  if (ne) ne.textContent = plan.agentName || 'Your Project';
  if (de) de.textContent = plan.description || '';
  if (se) se.innerHTML = (plan.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  if (no) no.innerHTML = (plan.n8nNodes || []).map(n => `<span class="plan-tag">${esc(n)}</span>`).join('');

  const cs = $('credSection'), cl = $('credList');
  const needs = (plan.services || []).filter(s => s.credentialType !== 'none');
  if (cs) cs.style.display = needs.length ? '' : 'none';

  if (cl && needs.length) {
    cl.innerHTML = '';
    needs.forEach(svc => {
      const item = document.createElement('div'); item.className = 'cred-item';
      item.innerHTML = `
        <div class="cred-item-head">
          <div class="cred-icon">🔌</div>
          <div>
            <div class="cred-name">${esc(svc.name)}</div>
            <div class="cred-reason">${esc(svc.reason || '')}</div>
          </div>
        </div>
        <div class="cred-row">
          <input type="password" class="cred-input"
            placeholder="${esc(svc.credentialLabel || svc.name + ' Key')}"
            data-key="${esc(svc.credentialKey)}">
          ${svc.getUrl ? `<a href="${esc(svc.getUrl)}" target="_blank" class="cred-get-link">Get Key →</a>` : ''}
        </div>`;
      cl.appendChild(item);
    });
  }
  setProjectState('credentials');
}

$('backToWelcomeBtn').addEventListener('click', () => setProjectState('welcome'));

// ── Deploy ──
$('deployBtn').addEventListener('click', async () => {
  if (!CUR_PLAN) return;

  const credentials = {};
  document.querySelectorAll('#credList .cred-input').forEach(inp => {
    if (inp.value.trim()) credentials[inp.dataset.key] = inp.value.trim();
  });

  const ok = await useCredit();
  if (!ok) { closeProjectsPanel(); openProfile('plans'); return; }

  const btn = $('deployBtn'); if (btn) btn.disabled = true;
  setProjectState('deploying');

  const dsIds = ['ds1', 'ds2', 'ds3', 'ds4']; let di = 0;
  const dt = setInterval(() => {
    if (di > 0) { const p = $(dsIds[di - 1]); if (p) p.querySelector('.ds-icon').textContent = '✅'; }
    if (di < dsIds.length) { const c = $(dsIds[di]); if (c) c.querySelector('.ds-icon').textContent = '⏳'; di++; }
    else clearInterval(dt);
  }, 1200);

  try {
    const r = await apiFetch('/.netlify/functions/agent-deploy', {
      method: 'POST',
      body: JSON.stringify({ prompt: CUR_PLAN.prompt, plan: CUR_PLAN, credentials })
    });
    const data = await r.json();
    clearInterval(dt); if (btn) btn.disabled = false;

    if (r.status === 402) { setProjectState('credentials'); closeProjectsPanel(); openProfile('plans'); return; }
    if (!r.ok || !data.success) throw new Error(data.error || 'Deployment failed');

    const project = {
      id: genId('proj'),
      name: CUR_PLAN.agentName,
      description: CUR_PLAN.description,
      workflowId: data.workflowId,
      workflowUrl: data.workflowUrl,
      active: true,
      createdAt: new Date().toISOString(),
      prompt: CUR_PLAN.prompt
    };

    PROJECTS.unshift(project); saveProjects();
    CUR_PROJECT_ID = project.id;
    renderPanelProjectList(); renderProjectsSidebar(); showProjectDash(project);
    showToast('🎉 Project deployed successfully!', 'success');

  } catch (e) {
    clearInterval(dt); if (btn) btn.disabled = false;
    setProjectState('credentials');
    showToast('❌ ' + e.message, 'error');
  }
});

// ── Dashboard ──
function showProjectDash(project) {
  const n = $('dashName'), d = $('dashDesc'), s = $('dashStatus'), lnk = $('n8nLink');
  if (n) n.textContent = project.name;
  if (d) d.textContent = project.description || project.prompt || '';
  if (s) { s.textContent = project.active ? '🟢 Active' : '⚪ Inactive'; s.className = 'status-badge ' + (project.active ? 'active-badge' : 'inactive-badge'); }
  if (lnk) lnk.href = project.workflowUrl || '#';
  setProjectState('running');
  loadExecutions(project);
}

$('refreshExecBtn').addEventListener('click', () => {
  const p = PROJECTS.find(x => x.id === CUR_PROJECT_ID);
  if (p) loadExecutions(p);
});

$('deleteProjectBtn').addEventListener('click', () => {
  const p = PROJECTS.find(x => x.id === CUR_PROJECT_ID);
  if (!p || !confirm(`Delete project "${p.name}"?`)) return;
  PROJECTS = PROJECTS.filter(x => x.id !== CUR_PROJECT_ID);
  saveProjects(); CUR_PROJECT_ID = null;
  renderPanelProjectList(); renderProjectsSidebar(); setProjectState('welcome');
});

async function loadExecutions(project) {
  if (!project.workflowId) return;
  const el = $('execList'); if (el) el.innerHTML = '<p class="hint-text">Loading...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/agent-status', {
      method: 'POST', body: JSON.stringify({ workflowId: project.workflowId })
    });
    if (!r.ok) { if (el) el.innerHTML = '<p class="hint-text">Could not load executions.</p>'; return; }

    const data = await r.json();
    const execs = data.executions || [];

    const t = $('stTotal'), ok = $('stOk'), fl = $('stFail'), ls = $('stLast');
    if (t) t.textContent = execs.length;
    if (ok) ok.textContent = execs.filter(e => e.status === 'success').length;
    if (fl) fl.textContent = execs.filter(e => e.status === 'error').length;
    if (ls) ls.textContent = execs.length ? timeAgo(execs[0].startedAt) : '—';

    if (!el) return;
    if (!execs.length) { el.innerHTML = '<p class="hint-text">No executions yet.</p>'; return; }

    el.innerHTML = execs.map(e => {
      const st = e.status === 'success' ? 'success' : e.status === 'running' ? 'running' : 'error';
      const lbl = e.status === 'success' ? '✓ Success' : e.status === 'running' ? '↻ Running' : '✗ Failed';
      return `<div class="exec-row"><div class="exec-st"><div class="exec-dot ${st}"></div><span class="exec-label">${lbl}</span></div><span class="exec-time">${timeAgo(e.startedAt)}</span></div>`;
    }).join('');

  } catch (e) {
    console.error('Executions error:', e);
    if (el) el.innerHTML = '<p class="hint-text">Error loading executions.</p>';
  }
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
(async function init() {
  try {
    await initAuth();
    loadSettings();
    loadChats();
    loadProjects();
    updateBtn();
    setHeader();
    console.log('✅ Fexer AI ready');
  } catch (e) {
    console.error('Init error:', e);
  }
})();