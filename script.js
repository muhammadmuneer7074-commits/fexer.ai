'use strict';

// ════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════
const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';

// ════════════════════════════════════════════
//  SUPABASE
// ════════════════════════════════════════════
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentSession = null;
let userPlan = 'free';
let userCredits = 5;

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
const esc = s => {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

const randVoice = () => {
  const v = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  return v[Math.floor(Math.random() * v.length)];
};

function getAuthHeader() {
  return currentSession
    ? { 'Authorization': 'Bearer ' + currentSession.access_token }
    : {};
}

function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(opts.headers || {})
    }
  });
}

function timeAgo(ds) {
  if (!ds) return '—';
  const m = Math.floor((Date.now() - new Date(ds)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

const I = {
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="11" y1="3" x2="11" y2="21"/><line x1="15" y1="6" x2="15" y2="18"/><line x1="19" y1="10" x2="19" y2="14"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  dl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

// ════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/auth.html'; return; }
  currentSession = session;
  currentUser = session.user;

  sb.auth.onAuthStateChange((_e, sess) => {
    if (!sess) { window.location.href = '/auth.html'; return; }
    currentSession = sess;
    currentUser = sess.user;
  });

  await loadUserData();
}

async function loadUserData() {
  if (!currentUser) return;

  // Load credits
  try {
    const r = await apiFetch('/.netlify/functions/credits-get');
    if (r.ok) {
      const { credits } = await r.json();
      userPlan = credits.plan || 'free';
      userCredits = credits.plan === 'max' ? Infinity : (credits.credits_remaining || 0);
      updateCreditsUI();
    }
  } catch (e) { console.error('Credits load failed:', e); }

  // Update sidebar avatar
  const email = currentUser.email || '';
  el('sbAvatar').textContent = email.charAt(0).toUpperCase();
  el('sbUserName').textContent = email.split('@')[0];
  el('profileEmail').value = email;

  updateCurrentPlanCard();

  // Load saved profile
  try {
    const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
    if (saved.name) {
      el('profileName').value = saved.name;
      el('sbUserName').textContent = saved.name;
    }
    if (saved.instructions) el('profileInstructions').value = saved.instructions;
    if (saved.photo) {
      el('profilePhoto').innerHTML = `<img src="${saved.photo}" alt="">`;
      el('sbAvatar').innerHTML = `<img src="${saved.photo}" alt="">`;
    }
  } catch (e) { }

  // Check upgrade redirect
  if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
    window.history.replaceState({}, '', '/');
    setTimeout(() => alert('🎉 Plan upgraded! Your new credits are now active.'), 600);
  }
}

function el(id) { return document.getElementById(id); }

function updateCreditsUI() {
  const count = el('creditsCount');
  const wrap = el('navCredits');
  const sub = el('subCreditsCount');
  const sbadge = el('subPlanBadge');

  const display = userPlan === 'max' ? '∞' : String(userCredits);
  if (count) count.textContent = display;
  if (sub) sub.textContent = display;
  if (sbadge) sbadge.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);

  if (wrap) wrap.classList.toggle('low', userPlan !== 'max' && userCredits <= 1);

  const bar = el('noCreditsBar');
  if (bar) bar.style.display = (userCredits <= 0 && userPlan !== 'max') ? 'flex' : 'none';
}

function updateCurrentPlanCard() {
  const map = {
    free: { name: 'Free Plan', creds: '5 credits/day', badge: 'Free' },
    pro: { name: 'Pro Plan', creds: '100 credits/day', badge: 'Pro' },
    max: { name: 'Max Plan', creds: 'Unlimited credits', badge: 'Max' }
  };
  const p = map[userPlan] || map.free;
  const n = el('cplanName'), c = el('cplanCredits'), b = el('cplanBadge');
  if (n) n.textContent = p.name;
  if (c) c.textContent = p.creds;
  if (b) { b.textContent = p.badge; b.className = 'cplan-badge ' + userPlan; }
}

async function useCredit() {
  if (userPlan === 'max') return true;
  if (userCredits <= 0) {
    el('noCreditsBar').style.display = 'flex';
    return false;
  }
  userCredits = Math.max(0, userCredits - 1);
  updateCreditsUI();
  return true;
}

// ── Sign Out ──
el('signoutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  await sb.auth.signOut();
  window.location.href = '/auth.html';
});

// ── No Credits Bar ──
el('noCreditsUpgradeBtn').addEventListener('click', () => {
  el('noCreditsBar').style.display = 'none';
  openProfileModal('subscription');
});
el('dismissCreditsBar').addEventListener('click', () => {
  el('noCreditsBar').style.display = 'none';
});

// ════════════════════════════════════════════
//  PROFILE MODAL
// ════════════════════════════════════════════
function openProfileModal(tab) {
  el('profileModal').classList.add('show');
  switchProfileTab(tab || 'profile');
  // Update credits in subscription tab every time
  updateCreditsUI();
}

el('sidebarProfileBtn').addEventListener('click', () => openProfileModal('profile'));
el('closeProfileModal').addEventListener('click', () => el('profileModal').classList.remove('show'));
el('profileModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('show');
});

// Upgrade quick button in sidebar header
el('upgradeQuickBtn').addEventListener('click', () => {
  closeSidebar();
  openProfileModal('subscription');
});

function switchProfileTab(name) {
  document.querySelectorAll('.profile-nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.ptab === name);
  });
  document.querySelectorAll('.profile-tab').forEach(p => {
    p.classList.toggle('active', p.id === 'ptab-' + name);
  });
}

document.querySelectorAll('.profile-nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchProfileTab(tab.dataset.ptab));
});

// Profile photo
el('changePhotoBtn').addEventListener('click', () => el('profilePhotoInput').click());
el('profilePhotoInput').addEventListener('change', function (e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const b64 = ev.target.result;
    el('profilePhoto').innerHTML = `<img src="${b64}" alt="">`;
    el('sbAvatar').innerHTML = `<img src="${b64}" alt="">`;
    const s = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
    s.photo = b64;
    localStorage.setItem('fexerProfile', JSON.stringify(s));
  };
  r.readAsDataURL(f);
  e.target.value = '';
});

// Style chips
document.querySelectorAll('#styleChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#styleChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appSettings.style = chip.dataset.style;
    saveSettings();
  });
});

// Voice chips
document.querySelectorAll('#voiceChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#voiceChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appSettings.voice = chip.dataset.voice;
    saveSettings();
  });
});

// Save profile
el('saveProfileBtn').addEventListener('click', () => {
  const name = (el('profileName').value || '').trim();
  const inst = (el('profileInstructions').value || '').trim();
  const s = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
  s.name = name; s.instructions = inst;
  localStorage.setItem('fexerProfile', JSON.stringify(s));
  appSettings.customInstructions = inst;
  saveSettings();
  if (name) el('sbUserName').textContent = name;
  const btn = el('saveProfileBtn');
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!';
  setTimeout(() => btn.textContent = orig, 1500);
});

// ════════════════════════════════════════════
//  SUBSCRIPTION
// ════════════════════════════════════════════
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
      else throw new Error('No checkout URL');
    } catch (e) {
      alert('❌ ' + e.message);
      btn.disabled = false; btn.textContent = orig;
    }
  });
});

el('billingPortalBtn').addEventListener('click', async () => {
  const btn = el('billingPortalBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Loading...';
  try {
    const r = await apiFetch('/.netlify/functions/lemonsqueezy-portal', { method: 'POST', body: JSON.stringify({}) });
    const data = await r.json();
    if (data.url) window.open(data.url, '_blank');
    else alert(data.error || 'No billing portal. Subscribe first.');
  } catch (e) { alert('❌ ' + e.message); }
  btn.disabled = false; btn.innerHTML = orig;
});

// ════════════════════════════════════════════
//  IMAGE GENERATION MODAL
// ════════════════════════════════════════════
function openImageGenModal() {
  el('imageGenModal').classList.add('show');
  el('imgGenPrompt').value = '';
  el('imgGenResult').innerHTML = '';
  document.querySelector('.size-chip.selected')?.classList.remove('selected');
  document.querySelector('.size-chip')?.classList.add('selected');
}

// Open from attach menu
el('attachImageGenBtn').addEventListener('click', () => {
  el('attachMenu').classList.remove('show');
  openImageGenModal();
});

el('closeImageGenModal').addEventListener('click', () => el('imageGenModal').classList.remove('show'));
el('imageGenModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('show');
});

// Size chips
document.querySelectorAll('.size-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

el('imgGenSubmit').addEventListener('click', async () => {
  const prompt = (el('imgGenPrompt').value || '').trim();
  if (!prompt) { alert('Please describe the image.'); return; }

  const ok = await useCredit();
  if (!ok) { el('imageGenModal').classList.remove('show'); openProfileModal('subscription'); return; }

  const sizeEl = document.querySelector('.size-chip.selected');
  const size = sizeEl ? sizeEl.dataset.size : '1024x1024';
  const btn = el('imgGenSubmit');
  const res = el('imgGenResult');

  btn.disabled = true; btn.textContent = 'Generating...';
  res.innerHTML = '<p style="color:var(--dim);text-align:center;padding:20px;font-size:13px;">🎨 Creating your image...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/generate-image', {
      method: 'POST', body: JSON.stringify({ prompt, size })
    });
    const data = await r.json();

    if (r.status === 402) {
      res.innerHTML = '';
      el('imageGenModal').classList.remove('show');
      openProfileModal('subscription');
      return;
    }
    if (!r.ok) throw new Error(data.error || 'Generation failed');

    res.innerHTML = `<img src="data:image/png;base64,${data.b64}" alt="Generated" style="width:100%;border-radius:12px;display:block;margin-bottom:10px;"><button id="dlGenImg" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:10px;background:var(--bg-b);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;cursor:pointer;">${I.dl} Download Image</button>`;
    el('dlGenImg').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'data:image/png;base64,' + data.b64;
      a.download = 'Fexer-AI-Image.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  } catch (e) {
    res.innerHTML = `<p style="color:var(--red);text-align:center;font-size:13px;">❌ ${e.message}</p>`;
  }

  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Generate`;
});

// ════════════════════════════════════════════
//  SETTINGS & STORAGE
// ════════════════════════════════════════════
let appSettings = {
  toolsEnabled: true,
  deepSearch: false,
  deepThinking: false,
  voice: 'auto',
  style: 'normal',
  customInstructions: ''
};

function saveSettings() {
  try { localStorage.setItem('fexerSettings', JSON.stringify(appSettings)); } catch (e) { }
}

function loadSettings() {
  try {
    const s = localStorage.getItem('fexerSettings');
    if (s) Object.assign(appSettings, JSON.parse(s));
  } catch (e) { }
  el('toolsToggle')?.classList.toggle('on', appSettings.toolsEnabled);
  el('searchToggle')?.classList.toggle('on', appSettings.deepSearch);
  document.querySelectorAll('#styleChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.style === (appSettings.style || 'normal'))
  );
  document.querySelectorAll('#voiceChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.voice === (appSettings.voice || 'auto'))
  );
  if (appSettings.customInstructions) {
    const pi = el('profileInstructions');
    if (pi) pi.value = appSettings.customInstructions;
  }
}

el('toolsToggle').addEventListener('click', () => {
  appSettings.toolsEnabled = !appSettings.toolsEnabled;
  el('toolsToggle').classList.toggle('on', appSettings.toolsEnabled);
  saveSettings();
});
el('searchToggle').addEventListener('click', () => {
  appSettings.deepSearch = !appSettings.deepSearch;
  el('searchToggle').classList.toggle('on', appSettings.deepSearch);
  saveSettings();
});

// ════════════════════════════════════════════
//  CHAT STATE
// ════════════════════════════════════════════
let chats = {}, chatOrder = [], currentChatId = null;
let isDraft = false, draftChat = null;
let isTemp = false, tempChat = null;
let selImage = null, selFileContent = null, selFileName = null;
let isWaiting = false, voiceOn = false, isListening = false;
let abortCtrl = null, curPlayer = null;

function activeChat() {
  if (isDraft) return draftChat;
  if (isTemp) return tempChat;
  return chats[currentChatId];
}

function chatVoice() {
  if (appSettings.voice !== 'auto') return appSettings.voice;
  const c = activeChat();
  if (!c.voice) { c.voice = randVoice(); if (!isDraft && !isTemp) saveChats(); }
  return c.voice;
}

function saveChats() {
  try { localStorage.setItem('fexerChats', JSON.stringify({ chats, chatOrder })); } catch (e) { }
}

function loadChats() {
  try {
    const s = localStorage.getItem('fexerChats');
    if (s) { const p = JSON.parse(s); chats = p.chats || {}; chatOrder = p.chatOrder || []; }
  } catch (e) { }
  chatOrder.length
    ? (currentChatId = chatOrder[0], renderChatList(), renderChat())
    : startDraft();
}

// ── Draft / Temp ──
function startDraft() {
  isTemp = false; tempChat = null;
  isDraft = true; draftChat = { title: 'New Chat', messages: [], voice: randVoice() };
  currentChatId = null;
  renderChatList(); renderChat(); updateHeader(); closeSidebar();
}

function startTemp() {
  isDraft = false; draftChat = null;
  isTemp = true; tempChat = { title: 'Temporary Chat', messages: [], voice: randVoice() };
  renderChatList(); renderChat(); updateHeader(); closeSidebar();
}

function exitTemp() { isTemp = false; tempChat = null; }

function promoteDraft() {
  if (!isDraft) return;
  const id = 'chat_' + Date.now();
  chats[id] = draftChat; chatOrder.unshift(id); currentChatId = id;
  isDraft = false; draftChat = null;
}

el('ghostChatBtn').addEventListener('click', startTemp);

function updateHeader() {
  const c = activeChat();
  const has = c && c.messages.length > 0;
  el('ghostChatBtn').hidden = has;
  el('chatBubbleWrap').hidden = !has;
  const t = el('chatTitle');
  if (t) {
    if (isTemp) t.textContent = '🕶️ Temporary Chat';
    else if (isDraft) t.textContent = 'Fexer AI';
    else t.textContent = (chats[currentChatId]?.title) || 'Fexer AI';
  }
}

// ── Chat List ──
function switchChat(id) {
  isDraft = false; draftChat = null; exitTemp(); currentChatId = id;
  renderChatList(); renderChat(); updateHeader(); closeSidebar();
}

function delChat(id) {
  delete chats[id]; chatOrder = chatOrder.filter(x => x !== id);
  if (currentChatId === id) {
    chatOrder.length
      ? (currentChatId = chatOrder[0], isDraft = false, draftChat = null)
      : startDraft();
  }
  saveChats(); renderChatList(); renderChat(); updateHeader();
}

function renderChatList(q) {
  const list = el('chatList'); if (!list) return;
  list.innerHTML = '';
  const query = (q || '').toLowerCase();
  let ids = chatOrder.filter(id => chats[id] && (!query || chats[id].title.toLowerCase().includes(query)));
  ids.sort((a, b) => (chats[b].starred ? 1 : 0) - (chats[a].starred ? 1 : 0));

  ids.forEach(id => {
    const chat = chats[id];
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === currentChatId && !isTemp && !isDraft ? ' active' : '');

    const tw = document.createElement('span'); tw.className = 'chat-item-title';
    if (chat.starred) {
      const si = document.createElement('span'); si.className = 'chat-star'; si.innerHTML = I.star; tw.appendChild(si);
    }
    const tt = document.createElement('span'); tt.className = 'chat-item-title-text'; tt.textContent = chat.title; tw.appendChild(tt);
    item.appendChild(tw);

    const db = document.createElement('button'); db.className = 'chat-del-btn'; db.innerHTML = I.trash;
    db.addEventListener('click', e => { e.stopPropagation(); if (confirm('Delete?')) delChat(id); });
    item.appendChild(db);

    let pt = null, lp = false;
    const sl = () => { lp = false; pt = setTimeout(() => { lp = true; item.classList.add('show-delete'); }, 500); };
    const cl = () => clearTimeout(pt);
    item.addEventListener('mousedown', sl); item.addEventListener('touchstart', sl, { passive: true });
    ['mouseup', 'mouseleave', 'touchend'].forEach(ev => item.addEventListener(ev, cl));
    item.addEventListener('click', () => {
      if (lp) return;
      if (item.classList.contains('show-delete')) { item.classList.remove('show-delete'); return; }
      switchChat(id);
    });
    list.appendChild(item);
  });
}

el('chatSearchInput').addEventListener('input', function () { renderChatList(this.value); });
el('sidebarNewChatBtn').addEventListener('click', startDraft);
el('bubbleNewChatBtn').addEventListener('click', startDraft);

// ── 3-dot Menu ──
el('chatMenuBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  if (isTemp) { if (confirm('End temporary chat?')) { exitTemp(); startDraft(); } return; }
  const c = chats[currentChatId];
  const lbl = el('starLabel'); if (c && lbl) lbl.textContent = c.starred ? 'Unstar' : 'Star';
  el('chatDropdown').classList.toggle('show');
});

el('optStarBtn').addEventListener('click', () => {
  el('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) {
    chats[currentChatId].starred = !chats[currentChatId].starred;
    saveChats(); renderChatList();
  }
});

el('optRenameBtn').addEventListener('click', () => {
  el('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) {
    const n = prompt('Rename:', chats[currentChatId].title);
    if (n?.trim()) { chats[currentChatId].title = n.trim(); saveChats(); renderChatList(); updateHeader(); }
  }
});

el('optDeleteBtn').addEventListener('click', () => {
  el('chatDropdown').classList.remove('show');
  if (confirm('Delete this chat?')) delChat(currentChatId);
});

document.addEventListener('click', e => {
  const am = el('attachMenu'), ab = el('attachBtn');
  const dd = el('chatDropdown'), mb = el('chatMenuBtn');
  if (am && ab && !am.contains(e.target) && e.target !== ab) am.classList.remove('show');
  if (dd && mb && !dd.contains(e.target) && !mb.contains(e.target)) dd.classList.remove('show');
});

// ════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════
el('menuToggle').addEventListener('click', () => {
  el('sidebar').classList.toggle('open');
  el('sidebarOverlay').classList.toggle('active');
});
el('sidebarOverlay').addEventListener('click', closeSidebar);
el('sidebarCloseBtn').addEventListener('click', closeSidebar);
function closeSidebar() {
  el('sidebar').classList.remove('open');
  el('sidebarOverlay').classList.remove('active');
}

// ════════════════════════════════════════════
//  ATTACH MENU
// ════════════════════════════════════════════
el('attachBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  el('attachMenu').classList.toggle('show');
});
el('choosePhotoBtn').addEventListener('click', () => { el('imageInput').click(); el('attachMenu').classList.remove('show'); });
el('takePhotoBtn').addEventListener('click', () => { el('attachMenu').classList.remove('show'); openCamera(); });
el('chooseFileBtn').addEventListener('click', () => { el('fileInput').click(); el('attachMenu').classList.remove('show'); });

// File inputs
el('imageInput').addEventListener('change', function (e) {
  const f = e.target.files[0]; if (!f) return;
  selFileContent = null; selFileName = null;
  if (f.type.startsWith('video/')) extractFrame(f, b => { selImage = b; showImgPrev(b, true); updateBtn(); });
  else compressImg(f, b => { selImage = b; showImgPrev(b, false); updateBtn(); });
  e.target.value = '';
});

el('fileInput').addEventListener('change', function (e) {
  const f = e.target.files[0]; if (!f) return; selImage = null;
  const r = new FileReader();
  r.onload = ev => { selFileContent = ev.target.result; selFileName = f.name; showFilePrev(f.name); updateBtn(); };
  r.readAsText(f); e.target.value = '';
});

function compressImg(file, cb) {
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', 0.8));
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(file);
}

function extractFrame(file, cb) {
  const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
  v.src = URL.createObjectURL(file);
  v.addEventListener('loadeddata', () => { v.currentTime = Math.min(0.3, v.duration / 2); });
  v.addEventListener('seeked', () => {
    let w = v.videoWidth, h = v.videoHeight;
    if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(v, 0, 0, w, h);
    URL.revokeObjectURL(v.src); cb(c.toDataURL('image/jpeg', 0.8));
  });
}

function showImgPrev(b, isVid) {
  const a = el('previewArea');
  a.innerHTML = `<div class="prev-img-chip"><img src="${b}" alt="preview">${isVid ? '<span class="video-badge">Video frame</span>' : ''}<button class="rm-prev-btn" id="rmPrev">×</button></div>`;
  a.classList.add('show');
  el('rmPrev').addEventListener('click', clearPreview);
}

function showFilePrev(name) {
  const a = el('previewArea');
  a.innerHTML = `<div class="prev-file-chip">${I.pdf}<span class="prev-file-name">${esc(name)}</span><button class="rm-prev-btn" id="rmPrev" style="position:static;margin-left:auto;">×</button></div>`;
  a.classList.add('show');
  el('rmPrev').addEventListener('click', clearPreview);
}

function clearPreview() {
  selImage = null; selFileContent = null; selFileName = null;
  const a = el('previewArea'); a.innerHTML = ''; a.classList.remove('show'); updateBtn();
}

// ════════════════════════════════════════════
//  CAMERA
// ════════════════════════════════════════════
let camStream = null, camFacing = 'user';

async function openCamera() {
  el('cameraOverlay').classList.add('show');
  camFacing = 'user'; await startCam();
}

async function startCam() {
  if (camStream) camStream.getTracks().forEach(t => t.stop());
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing } });
    el('camVideo').srcObject = camStream;
  } catch (e) { addBubble('⚠️ Camera access denied.', 'bot-message'); closeCamera(); }
}

el('camSwitchBtn').addEventListener('click', () => { camFacing = camFacing === 'user' ? 'environment' : 'user'; startCam(); });
el('camCaptureBtn').addEventListener('click', () => {
  const v = el('camVideo'), c = el('camCanvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const b = c.toDataURL('image/jpeg', 0.9);
  selImage = b; selFileContent = null; selFileName = null;
  showImgPrev(b, false); updateBtn(); closeCamera();
});
el('camCancelBtn').addEventListener('click', closeCamera);

function closeCamera() {
  el('cameraOverlay').classList.remove('show');
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
}

// ════════════════════════════════════════════
//  MIC (DICTATION)
// ════════════════════════════════════════════
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;

if (SR) {
  recog = new SR(); recog.lang = 'en-US'; recog.continuous = false; recog.interimResults = false;
  recog.onresult = e => { el('userInput').value = e.results[0][0].transcript; updateBtn(); };
  recog.onend = () => { isListening = false; el('micBtn').classList.remove('listening'); };
  recog.onerror = () => { isListening = false; el('micBtn').classList.remove('listening'); };
  el('micBtn').addEventListener('click', () => {
    if (isListening) { recog.stop(); }
    else { try { isListening = true; el('micBtn').classList.add('listening'); recog.start(); } catch (e) { isListening = false; } }
  });
} else { el('micBtn').style.display = 'none'; }

// ════════════════════════════════════════════
//  ACTION BUTTON
// ════════════════════════════════════════════
function updateBtn() {
  const btn = el('actionBtn');
  btn.classList.remove('is-send', 'is-stop', 'is-voice');

  if (isWaiting) {
    btn.innerHTML = I.stop; btn.classList.add('is-stop');
    btn.onclick = () => { if (abortCtrl) abortCtrl.abort(); };
    return;
  }
  if (voiceOn) {
    btn.innerHTML = I.voice; btn.classList.add('is-voice');
    btn.onclick = stopVoice; return;
  }
  const has = el('userInput').value.trim() || selImage || selFileContent;
  if (has) { btn.innerHTML = I.send; btn.classList.add('is-send'); btn.onclick = sendMsg; }
  else { btn.innerHTML = I.voice; btn.onclick = startVoice; }
}

el('userInput').addEventListener('input', updateBtn);
el('userInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

// ════════════════════════════════════════════
//  SEND MESSAGE
// ════════════════════════════════════════════
async function sendMsg() {
  const inp = el('userInput');
  let txt = inp.value.trim();
  if (!txt && !selImage && !selFileContent) return;

  const ok = await useCredit();
  if (!ok) { openProfileModal('subscription'); return; }

  promoteDraft();
  const chat = activeChat();

  if (selFileContent) {
    const block = `Attached file: ${selFileName}\n\`\`\`\n${selFileContent.slice(0, 20000)}\n\`\`\``;
    txt = txt ? txt + '\n\n' + block : block;
  }

  let content;
  if (selImage) {
    content = []; if (txt) content.push({ type: 'text', text: txt });
    content.push({ type: 'image_url', image_url: { url: selImage } });
  } else { content = txt; }

  if (!chat.messages.length) {
    const src = inp.value.trim() || selFileName || 'Image';
    chat.title = src.length > 35 ? src.slice(0, 35) + '...' : src;
    if (!isTemp) renderChatList();
  }

  addBubble(content, 'user-message');
  chat.messages.push({ role: 'user', content });
  if (!isTemp) saveChats();
  updateHeader(); inp.value = ''; clearPreview();

  isWaiting = true; setDis(true); updateBtn(); showTyping();
  if (voiceOn) setOrbState('thinking');
  abortCtrl = new AbortController();

  try {
    const r = await apiFetch('/.netlify/functions/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: chat.messages,
        voiceMode: voiceOn,
        deepThinking: appSettings.deepThinking,
        deepSearch: appSettings.deepSearch,
        customInstructions: appSettings.customInstructions || '',
        toolsEnabled: appSettings.toolsEnabled
      }),
      signal: abortCtrl.signal
    });

    if (r.status === 402) {
      removeTyping(); chatDone();
      addBubble("⚠️ You've run out of credits for today. Upgrade to continue.", 'bot-message');
      openProfileModal('subscription'); return;
    }

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      removeTyping(); addBubble('⚠️ ' + (d.error || 'Server error. Please try again.'), 'bot-message');
      chatDone(); return;
    }

    const data = await r.json();
    const reply = data.choices[0].message.content;

    removeTyping(); addBubble(reply, 'bot-message');
    chat.messages.push({ role: 'assistant', content: reply });
    if (!isTemp) saveChats();
    chatDone();

    if (voiceOn) {
      setOrbState('speaking');
      await playTTS(speakableText(reply));
      if (voiceOn) { setOrbState('listening'); startRecording(); }
    }

  } catch (e) {
    removeTyping();
    addBubble(e.name === 'AbortError' ? '⏹️ Stopped.' : '⚠️ Connection error. Please check your internet.', 'bot-message');
    chatDone();
  }
}

function chatDone() {
  isWaiting = false; abortCtrl = null; setDis(false); updateBtn();
}

function setDis(v) {
  ['userInput', 'attachBtn', 'micBtn'].forEach(id => {
    const e = el(id); if (e) e.disabled = v;
  });
}

// ════════════════════════════════════════════
//  RENDER MESSAGES
// ════════════════════════════════════════════
function renderChat() {
  const msgs = el('chatMessages'); if (!msgs) return;
  msgs.innerHTML = '';
  const chat = activeChat();
  if (isTemp) addBubble("🕶️ Temporary Chat — this won't be saved.", 'bot-message');
  if (!chat?.messages?.length) { if (!isTemp) addBubble('Hi! I\'m Fexer AI. How can I help you today?', 'bot-message'); return; }
  chat.messages.forEach(m => addBubble(m.content, m.role === 'user' ? 'user-message' : 'bot-message'));
}

function addBubble(content, cls) {
  const msgs = el('chatMessages'); if (!msgs) return;
  const div = document.createElement('div'); div.className = 'message ' + cls;

  if (Array.isArray(content)) {
    content.forEach(p => {
      if (p.type === 'text') {
        const t = document.createElement('div');
        t.innerHTML = cls === 'bot-message' ? parseMd(p.text) : esc(p.text);
        div.appendChild(t);
      } else if (p.type === 'image_url') {
        const img = document.createElement('img'); img.src = p.image_url.url; img.className = 'message-image'; div.appendChild(img);
      }
    });
  } else if (cls === 'bot-message') {
    const imgM = typeof content === 'string'
      ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/)
      : null;

    if (imgM) {
      const b64 = imgM[1], cap = imgM[2];
      const img = document.createElement('img'); img.src = 'data:image/png;base64,' + b64; img.className = 'message-image'; div.appendChild(img);
      if (cap.trim()) { const c = document.createElement('div'); c.textContent = cap.trim(); div.appendChild(c); }
      const acts = document.createElement('div'); acts.className = 'msg-actions';
      const db = document.createElement('button'); db.className = 'msg-btn'; db.innerHTML = I.dl; db.title = 'Download';
      db.addEventListener('click', () => downloadImg(b64));
      acts.appendChild(db); div.appendChild(acts);
    } else {
      div.innerHTML = parseMd(content);
      // Code block copy buttons
      div.querySelectorAll('pre').forEach(pre => {
        pre.style.position = 'relative';
        const cp = document.createElement('button');
        cp.className = 'msg-btn'; cp.innerHTML = I.copy; cp.title = 'Copy code';
        cp.style.cssText = 'position:absolute;top:6px;right:6px;';
        cp.addEventListener('click', () => {
          navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
            cp.style.color = '#22c55e';
            setTimeout(() => cp.style.color = '', 1500);
          }).catch(() => { });
        });
        pre.appendChild(cp);
      });
      // Message actions
      const acts = document.createElement('div'); acts.className = 'msg-actions';
      const pdfB = document.createElement('button'); pdfB.className = 'msg-btn'; pdfB.innerHTML = I.pdf; pdfB.title = 'Save PDF';
      pdfB.addEventListener('click', () => savePDF(content));
      const cpB = document.createElement('button'); cpB.className = 'msg-btn copy-btn'; cpB.innerHTML = I.copy; cpB.title = 'Copy';
      cpB.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(content.replace(/\{\{FEXER_IMAGE:[\s\S]+?\}\}/g, '[image]')); cpB.classList.add('copied'); setTimeout(() => cpB.classList.remove('copied'), 1500); } catch (e) { }
      });
      acts.appendChild(pdfB); acts.appendChild(cpB); div.appendChild(acts);
    }
  } else {
    div.textContent = content;
  }

  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
}

function parseMd(text) {
  if (typeof marked === 'undefined') return esc(text);
  marked.setOptions({ breaks: true, gfm: true });
  return marked.parse(text);
}

function showTyping() {
  const msgs = el('chatMessages'); if (!msgs) return;
  const d = document.createElement('div'); d.className = 'message bot-message typing-indicator'; d.id = 'typingDot';
  d.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}
function removeTyping() { el('typingDot')?.remove(); }

function savePDF(text) {
  if (typeof jspdf === 'undefined') return;
  const doc = new jspdf.jsPDF();
  const p = text.replace(/```([\s\S]*?)```/g, (_, c) => c.trim()).replace(/^#{1,6}\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/^[-*]\s+/gm, '• ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const lines = doc.splitTextToSize(p, 180); doc.setFontSize(11); let y = 20;
  lines.forEach(l => { if (y > doc.internal.pageSize.height - 15) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += 7; });
  doc.save('Fexer-AI.pdf');
}

function downloadImg(b64) {
  const a = document.createElement('a'); a.href = 'data:image/png;base64,' + b64; a.download = 'Fexer-AI-Image.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ════════════════════════════════════════════
//  LIVE VOICE
// ════════════════════════════════════════════
let mStream = null, mRecorder = null, mChunks = [];
let mCtx = null, mAnalyser = null, mTimer = null, spokenAbove = false;

el('closeVoiceBtn').addEventListener('click', stopVoice);

async function startVoice() {
  if (!navigator.mediaDevices) { addBubble('⚠️ Microphone not available in this browser.', 'bot-message'); return; }
  voiceOn = true; el('voiceOverlay').classList.add('show'); setOrbState('listening'); updateBtn();
  await startRecording();
}

function stopVoice() {
  voiceOn = false; el('voiceOverlay').classList.remove('show');
  if (mRecorder && mRecorder.state === 'recording') mRecorder.stop();
  cleanAudio();
  if (curPlayer) { curPlayer.pause(); curPlayer = null; }
  if (abortCtrl) abortCtrl.abort();
  updateBtn();
}

function setOrbState(s) {
  const orb = el('voiceOrb'), txt = el('voiceTxt'); if (!orb || !txt) return;
  orb.classList.remove('thinking', 'speaking');
  if (s === 'thinking') { orb.classList.add('thinking'); txt.textContent = 'Thinking...'; }
  else if (s === 'speaking') { orb.classList.add('speaking'); txt.textContent = 'Speaking...'; }
  else { txt.textContent = 'Listening...'; }
}

async function startRecording() {
  try { mStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addBubble('⚠️ Microphone access denied.', 'bot-message'); stopVoice(); return; }

  mChunks = []; spokenAbove = false;
  mRecorder = new MediaRecorder(mStream);
  mRecorder.ondataavailable = e => { if (e.data.size > 0) mChunks.push(e.data); };
  mRecorder.onstop = () => {
    cleanAudio(); if (!voiceOn) return;
    const blob = new Blob(mChunks, { type: mRecorder.mimeType });
    if (blob.size > 1000) processAudio(blob); else startRecording();
  };
  mRecorder.start(); setOrbState('listening'); watchSilence();
  mTimer = setTimeout(() => { if (mRecorder?.state === 'recording') mRecorder.stop(); }, 15000);
}

function watchSilence() {
  mCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = mCtx.createMediaStreamSource(mStream);
  mAnalyser = mCtx.createAnalyser(); mAnalyser.fftSize = 512; src.connect(mAnalyser);
  const buf = new Uint8Array(mAnalyser.frequencyBinCount); let silStart = null;

  function chk() {
    if (!mRecorder || mRecorder.state !== 'recording') return;
    mAnalyser.getByteFrequencyData(buf);
    const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
    if (avg > 12) { spokenAbove = true; silStart = null; }
    else if (spokenAbove) {
      if (!silStart) silStart = Date.now();
      if (Date.now() - silStart > 1200) { mRecorder.stop(); return; }
    }
    requestAnimationFrame(chk);
  }
  requestAnimationFrame(chk);
}

function cleanAudio() {
  if (mTimer) { clearTimeout(mTimer); mTimer = null; }
  if (mCtx) { mCtx.close(); mCtx = null; }
  if (mStream) { mStream.getTracks().forEach(t => t.stop()); mStream = null; }
}

async function processAudio(blob) {
  setOrbState('thinking');
  const b64 = await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); });

  try {
    const res = await apiFetch('/.netlify/functions/transcribe', {
      method: 'POST', body: JSON.stringify({ audioBase64: b64, mimeType: blob.type })
    });
    if (!res.ok) throw new Error('Transcription failed');
    const data = await res.json();
    const txt = (data.text || '').trim();
    if (!txt) { if (voiceOn) startRecording(); return; }
    el('userInput').value = txt;
    sendMsg();
  } catch (e) {
    console.error('Transcribe error:', e);
    if (voiceOn) { addBubble("⚠️ Couldn't understand. Please try again.", 'bot-message'); startRecording(); }
  }
}

async function playTTS(text) {
  return new Promise(async resolve => {
    try {
      const r = await apiFetch('/.netlify/functions/speak', {
        method: 'POST', body: JSON.stringify({ text: stripMd(text), voice: chatVoice() })
      });
      if (!r.ok) { resolve(); return; }
      const d = await r.json();
      const a = new Audio('data:audio/mp3;base64,' + d.audioBase64); curPlayer = a;
      a.onended = () => { curPlayer = null; resolve(); };
      a.onerror = () => { curPlayer = null; resolve(); };
      a.play().catch(() => { curPlayer = null; resolve(); });
    } catch (e) { resolve(); }
  });
}

function speakableText(t) {
  const m = t.match(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?([\s\S]*)$/);
  return m ? (m[1] || "Here's your image!") : t;
}

function stripMd(t) {
  return t.replace(/```[\s\S]*?```/g, '').replace(/[*_`#>~-]/g, '').replace(/\n+/g, '. ').trim();
}

// ════════════════════════════════════════════
//  PROJECTS (AGENTS)
// ════════════════════════════════════════════
let agents = [], currentAgentId = null, agentPlan = null;

function saveAgents() { try { localStorage.setItem('fexerAgents', JSON.stringify(agents)); } catch (e) { } }
function loadAgents() {
  try { const s = localStorage.getItem('fexerAgents'); if (s) agents = JSON.parse(s); } catch (e) { }
  renderProjectsSidebar();
}

// Open/close panel
function openProjectPanel() {
  el('agentPanel').classList.add('show');
  renderProjectsPanelList();
}
function closeProjectPanel() { el('agentPanel').classList.remove('show'); }

el('closeAgentPanel').addEventListener('click', closeProjectPanel);

// Sidebar Projects section — click to open panel
el('sidebarProjectsList').addEventListener('click', (e) => {
  const item = e.target.closest('.sb-agent-item');
  if (!item) return;
  const id = item.dataset.id;
  const agent = agents.find(a => a.id === id);
  if (agent) { currentAgentId = id; openProjectPanel(); renderProjectsPanelList(); renderAgentDashboard(agent); }
});

// New project buttons
el('newAgentBtn').addEventListener('click', () => {
  openProjectPanel(); currentAgentId = null; showAgentState('welcome'); renderProjectsPanelList();
});

el('newAgentBtnPanel')?.addEventListener('click', () => {
  currentAgentId = null; showAgentState('welcome'); renderProjectsPanelList();
});

function renderProjectsSidebar() {
  const list = el('sidebarProjectsList'); if (!list) return;
  if (!agents.length) { list.innerHTML = '<div class="sb-agents-empty">No projects yet</div>'; return; }
  list.innerHTML = '';
  agents.forEach(a => {
    const item = document.createElement('div');
    item.className = 'sb-agent-item' + (a.id === currentAgentId ? ' active' : '');
    item.dataset.id = a.id;
    item.innerHTML = `<div class="sb-agent-icon">${I.bolt}</div><span class="sb-agent-name">${esc(a.name)}</span>`;
    list.appendChild(item);
  });
}

function renderProjectsPanelList() {
  const list = el('agentsListPanel'); if (!list) return;
  if (!agents.length) {
    list.innerHTML = `<div class="agents-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p>No projects yet</p></div>`;
    return;
  }
  list.innerHTML = '';
  agents.forEach(a => {
    const item = document.createElement('div');
    item.className = 'agent-panel-item' + (a.id === currentAgentId ? ' active' : '');
    item.innerHTML = `<div class="ap-icon">${I.bolt}</div><div class="ap-info"><div class="ap-name">${esc(a.name)}</div><div class="ap-status ${a.active ? 'active' : ''}">${a.active ? '🟢 Active' : '⚪ Inactive'}</div></div><button class="ap-del">${I.trash}</button>`;

    item.querySelector('.ap-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete project "' + a.name + '"?')) return;
      agents = agents.filter(x => x.id !== a.id); saveAgents();
      if (currentAgentId === a.id) { currentAgentId = null; showAgentState('welcome'); }
      renderProjectsPanelList(); renderProjectsSidebar();
    });

    item.addEventListener('click', e => {
      if (e.target.closest('.ap-del')) return;
      currentAgentId = a.id; renderProjectsPanelList(); renderAgentDashboard(a);
    });

    list.appendChild(item);
  });
}

function showAgentState(name) {
  document.querySelectorAll('.agent-state').forEach(s => s.classList.remove('active'));
  const t = el('state-' + name); if (t) t.classList.add('active');
}

// ── Build Project (Agent Plan) ──
el('agentSubmitBtn').addEventListener('click', buildProject);
el('agentPromptInput').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buildProject(); }
});

async function buildProject() {
  const inp = el('agentPromptInput');
  const prompt = (inp?.value || '').trim();
  if (!prompt) { alert('Please describe your automation.'); return; }

  const ok = await useCredit();
  if (!ok) { closeProjectPanel(); openProfileModal('subscription'); return; }

  const btn = el('agentSubmitBtn'); if (btn) btn.disabled = true;
  showAgentState('planning');

  const stepEls = document.querySelectorAll('#planningSteps .plan-step');
  let si = 0;
  const timer = setInterval(() => {
    if (si > 0 && stepEls[si - 1]) { stepEls[si - 1].classList.remove('active'); stepEls[si - 1].classList.add('done'); }
    if (si < stepEls.length && stepEls[si]) { stepEls[si].classList.add('active'); si++; }
    else clearInterval(timer);
  }, 700);

  try {
    const r = await apiFetch('/.netlify/functions/agent-plan', { method: 'POST', body: JSON.stringify({ prompt }) });
    const data = await r.json();
    clearInterval(timer); stepEls.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

    if (r.status === 402) {
      if (btn) btn.disabled = false; showAgentState('welcome'); closeProjectPanel(); openProfileModal('subscription'); return;
    }
    if (!r.ok || !data.plan) throw new Error(data.error || 'Planning failed');

    agentPlan = { prompt, ...data.plan };
    if (btn) btn.disabled = false;
    renderPlanAndCreds(data.plan);

  } catch (e) {
    clearInterval(timer); if (btn) btn.disabled = false;
    showAgentState('welcome'); alert('❌ Planning failed: ' + e.message);
  }
}

function renderPlanAndCreds(plan) {
  const nameEl = el('planName'), descEl = el('planDesc');
  const stepsEl = el('planStepsList'), nodesEl = el('planNodeTags');
  if (nameEl) nameEl.textContent = plan.agentName || 'Your Project';
  if (descEl) descEl.textContent = plan.description || '';
  if (stepsEl) stepsEl.innerHTML = (plan.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  if (nodesEl) nodesEl.innerHTML = (plan.n8nNodes || []).map(n => `<span class="plan-tag">${esc(n)}</span>`).join('');

  const credSection = el('credSection'), credList = el('credList');
  const needs = (plan.services || []).filter(s => s.credentialType !== 'none');

  if (credSection && credList) {
    credSection.style.display = needs.length ? '' : 'none';
    if (needs.length) {
      credList.innerHTML = '';
      needs.forEach(svc => {
        const item = document.createElement('div'); item.className = 'cred-item';
        item.innerHTML = `
          <div class="cred-item-head">
            <div class="cred-icon">🔌</div>
            <div><div class="cred-name">${esc(svc.name)}</div><div class="cred-reason">${esc(svc.reason || '')}</div></div>
          </div>
          <div class="cred-row">
            <input type="password" class="cred-input" placeholder="${esc(svc.credentialLabel || svc.name + ' Key')}" data-key="${esc(svc.credentialKey)}">
            ${svc.getUrl ? `<a href="${esc(svc.getUrl)}" target="_blank" class="cred-get-a">Get Key →</a>` : ''}
          </div>`;
        credList.appendChild(item);
      });
    }
  }
  showAgentState('credentials');
}

el('backBtn').addEventListener('click', () => showAgentState('welcome'));

// ── Deploy ──
el('deployBtn').addEventListener('click', async () => {
  if (!agentPlan) return;

  const credentials = {};
  document.querySelectorAll('#credList .cred-input').forEach(inp => {
    if (inp.value.trim()) credentials[inp.dataset.key] = inp.value.trim();
  });

  const ok = await useCredit();
  if (!ok) { closeProjectPanel(); openProfileModal('subscription'); return; }

  const btn = el('deployBtn'); if (btn) btn.disabled = true;
  showAgentState('deploying');

  const dsIds = ['ds1', 'ds2', 'ds3', 'ds4']; let di = 0;
  const dt = setInterval(() => {
    if (di > 0) { const p = el(dsIds[di - 1]); if (p) p.querySelector('.ds-icon').textContent = '✅'; }
    if (di < dsIds.length) { const c = el(dsIds[di]); if (c) { c.querySelector('.ds-icon').textContent = '⏳'; c.querySelector('.ds-icon').classList.remove('pending'); } di++; }
    else clearInterval(dt);
  }, 1200);

  try {
    const r = await apiFetch('/.netlify/functions/agent-deploy', {
      method: 'POST', body: JSON.stringify({ prompt: agentPlan.prompt, plan: agentPlan, credentials })
    });
    const data = await r.json();
    clearInterval(dt); if (btn) btn.disabled = false;

    if (r.status === 402) { showAgentState('credentials'); closeProjectPanel(); openProfileModal('subscription'); return; }
    if (!r.ok || !data.success) throw new Error(data.error || 'Deployment failed');

    const agent = {
      id: 'agent_' + Date.now(),
      name: agentPlan.agentName,
      description: agentPlan.description,
      workflowId: data.workflowId,
      workflowUrl: data.workflowUrl,
      active: true,
      createdAt: new Date().toISOString(),
      prompt: agentPlan.prompt
    };
    agents.unshift(agent); saveAgents(); currentAgentId = agent.id;
    renderProjectsPanelList(); renderProjectsSidebar(); renderAgentDashboard(agent);

  } catch (e) {
    clearInterval(dt); if (btn) btn.disabled = false;
    showAgentState('credentials');
    alert('❌ Deployment failed: ' + e.message + '\n\nMake sure N8N_URL and N8N_API_KEY are set in Netlify environment variables.');
  }
});

// ── Dashboard ──
function renderAgentDashboard(agent) {
  const n = el('dashName'), d = el('dashDesc'), s = el('dashStatus'), lnk = el('dashN8nLink');
  if (n) n.textContent = agent.name;
  if (d) d.textContent = agent.description || agent.prompt || '';
  if (s) { s.textContent = agent.active ? '🟢 Active' : '⚪ Inactive'; s.className = 'status-badge ' + (agent.active ? 'active-badge' : 'inactive-badge'); }
  if (lnk) lnk.href = agent.workflowUrl || '#';
  showAgentState('running');
  loadExecutions(agent);
}

el('dashRefresh').addEventListener('click', () => {
  const a = agents.find(x => x.id === currentAgentId); if (a) loadExecutions(a);
});

el('dashDelete').addEventListener('click', () => {
  const a = agents.find(x => x.id === currentAgentId);
  if (!a || !confirm(`Delete project "${a.name}"?`)) return;
  agents = agents.filter(x => x.id !== currentAgentId); saveAgents();
  currentAgentId = null; renderProjectsPanelList(); renderProjectsSidebar(); showAgentState('welcome');
});

async function loadExecutions(agent) {
  if (!agent.workflowId) return;
  const execList = el('execList'); if (execList) execList.innerHTML = '<p class="hint">Loading...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/agent-status', {
      method: 'POST', body: JSON.stringify({ workflowId: agent.workflowId })
    });
    if (!r.ok) { if (execList) execList.innerHTML = '<p class="hint">Could not load executions.</p>'; return; }
    const data = await r.json();
    const execs = data.executions || [];

    const t = el('stTotal'), ok = el('stOk'), fl = el('stFail'), ls = el('stLast');
    if (t) t.textContent = execs.length;
    if (ok) ok.textContent = execs.filter(e => e.status === 'success').length;
    if (fl) fl.textContent = execs.filter(e => e.status === 'error').length;
    if (ls) ls.textContent = execs.length ? timeAgo(execs[0].startedAt) : '—';

    if (!execList) return;
    if (!execs.length) { execList.innerHTML = '<p class="hint">No executions yet.</p>'; return; }

    execList.innerHTML = execs.map(e => {
      const st = e.status === 'success' ? 'success' : e.status === 'running' ? 'running' : 'error';
      const lbl = e.status === 'success' ? '✓ Success' : e.status === 'running' ? '↻ Running' : '✗ Failed';
      return `<div class="exec-row"><div class="exec-st"><div class="exec-dot ${st}"></div><span class="exec-label">${lbl}</span></div><span class="exec-time">${timeAgo(e.startedAt)}</span></div>`;
    }).join('');
  } catch (e) {
    console.error('Executions error:', e);
    if (execList) execList.innerHTML = '<p class="hint">Error loading executions.</p>';
  }
}

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
(async function init() {
  await initAuth();
  loadSettings();
  loadChats();
  loadAgents();
  updateBtn();
  updateHeader();
  console.log('✅ Fexer AI ready');
})();