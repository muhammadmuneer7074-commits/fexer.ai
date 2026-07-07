// ═══════════════════════════════════════════
//  CONFIG — Replace these
// ═══════════════════════════════════════════
const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';

// ═══════════════════════════════════════════
//  SUPABASE INIT
// ═══════════════════════════════════════════
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null, currentSession = null, userPlan = 'free', userCredits = 5;

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/auth.html'; return; }
  currentSession = session;
  currentUser = session.user;
  sb.auth.onAuthStateChange((_e, sess) => {
    if (!sess) { window.location.href = '/auth.html'; return; }
    currentSession = sess; currentUser = sess.user;
  });
  await loadUserData();
}

async function loadUserData() {
  if (!currentUser) return;
  try {
    const r = await apiFetch('/.netlify/functions/credits-get', { method: 'GET' });
    if (r.ok) {
      const { credits: c } = await r.json();
      userPlan = c.plan;
      userCredits = c.plan === 'max' ? Infinity : c.credits_remaining;
      updateCreditsUI();
    }
  } catch (e) { }

  const email = currentUser.email || '';
  const init = email.charAt(0).toUpperCase();
  document.getElementById('sbAvatar').textContent = init;
  document.getElementById('sbUserName').textContent = email.split('@')[0];
  document.getElementById('profileEmail').value = email;

  const badge = document.getElementById('navPlanBadge');
  badge.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
  badge.className = 'nav-plan-badge ' + userPlan;

  updateCurrentPlanCard();

  if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
    window.history.replaceState({}, '', '/');
    setTimeout(() => alert('🎉 Plan upgraded! Your new credits are now active.'), 600);
  }

  // Load saved profile
  const saved = localStorage.getItem('fexerProfile');
  if (saved) {
    const p = JSON.parse(saved);
    if (p.name) document.getElementById('profileName').value = p.name;
    if (p.instructions) document.getElementById('profileInstructions').value = p.instructions;
    if (p.photo) {
      document.getElementById('profilePhoto').innerHTML = `<img src="${p.photo}" alt="profile">`;
      document.getElementById('sbAvatar').innerHTML = `<img src="${p.photo}" alt="profile">`;
    }
  }
}

function updateCreditsUI() {
  const el = document.getElementById('creditsCount');
  const wrap = document.getElementById('navCredits');
  el.textContent = userPlan === 'max' ? '∞' : userCredits;
  wrap.classList.toggle('low', userPlan !== 'max' && userCredits <= 1);
  document.getElementById('noCreditsBar').style.display =
    (userCredits <= 0 && userPlan !== 'max') ? 'flex' : 'none';
}

function updateCurrentPlanCard() {
  const nameEl = document.getElementById('cplanName');
  const credEl = document.getElementById('cplanCredits');
  const badgeEl = document.getElementById('cplanBadge');
  const planNames = { free: 'Free Plan', pro: 'Pro Plan', max: 'Max Plan' };
  const planCreds = { free: '5 credits/day', pro: '100 credits/day', max: 'Unlimited credits' };
  nameEl.textContent = planNames[userPlan] || 'Free Plan';
  credEl.textContent = planCreds[userPlan] || '5 credits/day';
  badgeEl.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
  badgeEl.className = 'cplan-badge ' + userPlan;
}

function getAuthHeader() {
  return currentSession ? { 'Authorization': 'Bearer ' + currentSession.access_token } : {};
}

function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...(opts.headers || {}) }
  });
}

async function useCredit() {
  if (userPlan === 'max') return true;
  if (userCredits <= 0) { document.getElementById('noCreditsBar').style.display = 'flex'; return false; }
  userCredits = Math.max(0, userCredits - 1);
  updateCreditsUI();
  return true;
}

// ── Dismiss credits bar ──
document.getElementById('noCreditsUpgradeBtn').addEventListener('click', () => openProfileModal('subscription'));
document.getElementById('dismissCreditsBar').addEventListener('click', () => {
  document.getElementById('noCreditsBar').style.display = 'none';
});

// ═══════════════════════════════════════════
//  PROFILE MODAL
// ═══════════════════════════════════════════

function openProfileModal(tab = 'profile') {
  document.getElementById('profileModal').classList.add('show');
  switchProfileTab(tab);
}

document.getElementById('closeProfileModal').addEventListener('click', () => {
  document.getElementById('profileModal').classList.remove('show');
});
document.getElementById('profileModal').addEventListener('click', e => {
  if (e.target === document.getElementById('profileModal'))
    document.getElementById('profileModal').classList.remove('show');
});

document.querySelectorAll('.profile-nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchProfileTab(tab.dataset.ptab));
});

function switchProfileTab(name) {
  document.querySelectorAll('.profile-nav-tab').forEach(t => t.classList.toggle('active', t.dataset.ptab === name));
  document.querySelectorAll('.profile-tab').forEach(p => p.classList.toggle('active', p.id === 'ptab-' + name));
}

document.getElementById('sidebarProfileBtn').addEventListener('click', () => openProfileModal('profile'));

// Profile photo change
document.getElementById('changePhotoBtn').addEventListener('click', () => document.getElementById('profilePhotoInput').click());
document.getElementById('profilePhotoInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const b64 = ev.target.result;
    document.getElementById('profilePhoto').innerHTML = `<img src="${b64}" alt="profile">`;
    document.getElementById('sbAvatar').innerHTML = `<img src="${b64}" alt="profile">`;
    const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
    saved.photo = b64;
    localStorage.setItem('fexerProfile', JSON.stringify(saved));
  };
  reader.readAsDataURL(f);
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
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  const name = document.getElementById('profileName').value.trim();
  const instructions = document.getElementById('profileInstructions').value.trim();
  const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
  saved.name = name;
  saved.instructions = instructions;
  localStorage.setItem('fexerProfile', JSON.stringify(saved));
  if (name) document.getElementById('sbUserName').textContent = name;
  appSettings.customInstructions = instructions;
  saveSettings();
  alert('Profile saved!');
});

// Sign out
document.getElementById('signoutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  await sb.auth.signOut();
  window.location.href = '/auth.html';
});

// Subscription upgrade buttons
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const plan = btn.dataset.plan;
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Loading...';
    try {
      const r = await apiFetch('/.netlify/functions/lemonsqueezy-checkout', { method: 'POST', body: JSON.stringify({ plan }) });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Checkout failed');
    } catch (e) {
      btn.disabled = false; btn.textContent = orig;
      alert('Error: ' + e.message);
    }
  });
});

// Billing portal
document.getElementById('billingPortalBtn').addEventListener('click', async () => {
  const btn = document.getElementById('billingPortalBtn');
  btn.disabled = true;
  try {
    const r = await apiFetch('/.netlify/functions/lemonsqueezy-portal', { method: 'POST', body: JSON.stringify({}) });
    const data = await r.json();
    if (data.url) window.open(data.url, '_blank');
    else alert(data.error || 'No billing portal found. Subscribe first.');
  } catch (e) { alert('Error: ' + e.message); }
  btn.disabled = false;
});

// ═══════════════════════════════════════════
//  IMAGE GENERATION MODAL
// ═══════════════════════════════════════════

document.getElementById('imageGenBtn').addEventListener('click', () => {
  document.getElementById('imageGenModal').classList.add('show');
  document.getElementById('imgGenResult').innerHTML = '';
  document.getElementById('imgGenPrompt').value = '';
});

document.getElementById('closeImageGenModal').addEventListener('click', () => {
  document.getElementById('imageGenModal').classList.remove('show');
});
document.getElementById('imageGenModal').addEventListener('click', e => {
  if (e.target === document.getElementById('imageGenModal'))
    document.getElementById('imageGenModal').classList.remove('show');
});

// Size chips
document.querySelectorAll('.size-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

document.getElementById('imgGenSubmit').addEventListener('click', async () => {
  const prompt = document.getElementById('imgGenPrompt').value.trim();
  if (!prompt) return;

  const ok = await useCredit();
  if (!ok) { openProfileModal('subscription'); return; }

  const sizeChip = document.querySelector('.size-chip.selected');
  const size = sizeChip ? sizeChip.dataset.size : '1024x1024';
  const btn = document.getElementById('imgGenSubmit');
  const result = document.getElementById('imgGenResult');

  btn.disabled = true; btn.textContent = 'Generating...';
  result.innerHTML = '<p style="color:var(--dim);font-size:13px;text-align:center;padding:20px;">Creating your image...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/generate-image', { method: 'POST', body: JSON.stringify({ prompt, size }) });
    const data = await r.json();

    if (r.status === 402) { result.innerHTML = ''; openProfileModal('subscription'); return; }
    if (!r.ok) throw new Error(data.error || 'Generation failed');

    result.innerHTML = `
      <img src="data:image/png;base64,${data.b64}" alt="Generated image">
      <button class="dl-btn" id="dlGenImg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Image
      </button>
    `;
    document.getElementById('dlGenImg').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = 'data:image/png;base64,' + data.b64; a.download = 'Fexer-AI-Image.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  } catch (e) {
    result.innerHTML = `<p style="color:var(--red);font-size:13px;">❌ ${e.message}</p>`;
  }

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Generate';
});

// ═══════════════════════════════════════════
//  CHAT STATE
// ═══════════════════════════════════════════

let chats = {}, chatOrder = [], currentChatId = null;
let isDraft = false, draftChat = null;
let isTemp = false, tempChat = null;
let selImage = null, selFileContent = null, selFileName = null;
let isWaiting = false, voiceOn = false, isListening = false;
let abortCtrl = null, curPlayer = null;
let appSettings = { deepThinking: false, deepSearch: false, toolsEnabled: true, voice: 'auto', style: 'normal', customInstructions: '' };

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const randVoice = () => VOICES[Math.floor(Math.random() * VOICES.length)];

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

let camStream = null, camFacing = 'user';
let mStream = null, mRecorder = null, mChunks = [];
let mCtx = null, mAnalyser = null, mTimer = null, spokenAbove = false;

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

const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

function saveChats() { try { localStorage.setItem('fexerChats', JSON.stringify({ chats, chatOrder })); } catch (e) { } }
function saveSettings() { localStorage.setItem('fexerSettings', JSON.stringify(appSettings)); }

function loadChats() {
  const s = localStorage.getItem('fexerChats');
  if (s) { const p = JSON.parse(s); chats = p.chats || {}; chatOrder = p.chatOrder || []; }
  chatOrder.length ? (currentChatId = chatOrder[0], renderChatList(), renderChat()) : startDraft();
}

function loadSettings() {
  const s = localStorage.getItem('fexerSettings');
  if (s) appSettings = Object.assign(appSettings, JSON.parse(s));
  document.getElementById('toolsToggle').classList.toggle('on', appSettings.toolsEnabled);
  document.getElementById('searchToggle').classList.toggle('on', appSettings.deepSearch);
  // Apply style chip
  document.querySelectorAll('#styleChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.style === appSettings.style);
  });
  // Apply voice chip
  document.querySelectorAll('#voiceChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.voice === (appSettings.voice || 'auto'));
  });
  // Apply instructions
  if (appSettings.customInstructions)
    document.getElementById('profileInstructions').value = appSettings.customInstructions;
}

// Draft / Temp
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

document.getElementById('ghostChatBtn').addEventListener('click', startTemp);

function updateHeader() {
  const c = activeChat();
  const has = c && c.messages.length > 0;
  document.getElementById('ghostChatBtn').hidden = has;
  document.getElementById('chatBubbleWrap').hidden = !has;
  // Update chat title
  if (isTemp) { document.getElementById('chatTitle').textContent = '🕶️ Temporary Chat'; return; }
  if (isDraft) { document.getElementById('chatTitle').textContent = 'Fexer AI'; return; }
  const chat = chats[currentChatId];
  document.getElementById('chatTitle').textContent = chat ? chat.title : 'Fexer AI';
}

// Chat list
function switchChat(id) {
  isDraft = false; draftChat = null; exitTemp(); currentChatId = id;
  renderChatList(); renderChat(); updateHeader(); closeSidebar();
}

function delChat(id) {
  delete chats[id]; chatOrder = chatOrder.filter(x => x !== id);
  if (currentChatId === id)
    chatOrder.length ? (currentChatId = chatOrder[0], isDraft = false, draftChat = null) : startDraft();
  saveChats(); renderChatList(); renderChat(); updateHeader();
}

function renderChatList(q) {
  const list = document.getElementById('chatList');
  list.innerHTML = '';
  const query = (q || '').toLowerCase();
  let ids = chatOrder.filter(id => chats[id] && (!query || chats[id].title.toLowerCase().includes(query)));
  ids.sort((a, b) => (chats[b].starred ? 1 : 0) - (chats[a].starred ? 1 : 0));
  ids.forEach(id => {
    const chat = chats[id];
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === currentChatId && !isTemp && !isDraft ? ' active' : '');
    const tw = document.createElement('span'); tw.className = 'chat-item-title';
    if (chat.starred) { const si = document.createElement('span'); si.className = 'chat-star'; si.innerHTML = I.star; tw.appendChild(si); }
    const tt = document.createElement('span'); tt.className = 'chat-item-title-text'; tt.textContent = chat.title; tw.appendChild(tt);
    item.appendChild(tw);
    const del = document.createElement('button'); del.className = 'chat-del-btn'; del.innerHTML = I.trash;
    del.addEventListener('click', e => { e.stopPropagation(); if (confirm('Delete?')) delChat(id); });
    item.appendChild(del);
    let pt = null, lp = false;
    const sl = () => { lp = false; pt = setTimeout(() => { lp = true; item.classList.add('show-delete'); }, 500); };
    const cl = () => clearTimeout(pt);
    item.addEventListener('mousedown', sl); item.addEventListener('touchstart', sl, { passive: true });
    ['mouseup', 'mouseleave', 'touchend'].forEach(e => item.addEventListener(e, cl));
    item.addEventListener('click', () => { if (lp) return; if (item.classList.contains('show-delete')) { item.classList.remove('show-delete'); return; } switchChat(id); });
    list.appendChild(item);
  });
}

document.getElementById('chatSearchInput').addEventListener('input', function () { renderChatList(this.value); });

function renderChat() {
  const msgs = document.getElementById('chatMessages'); msgs.innerHTML = '';
  const chat = activeChat();
  if (isTemp) addBubble("🕶️ Temporary Chat — this won't be saved.", 'bot-message');
  if (!chat.messages.length) { if (!isTemp) addBubble('Hi! I\'m Fexer AI. How can I help you?', 'bot-message'); return; }
  chat.messages.forEach(m => addBubble(m.content, m.role === 'user' ? 'user-message' : 'bot-message'));
}

// ── 3-dot menu ──
document.getElementById('sidebarNewChatBtn').addEventListener('click', startDraft);
document.getElementById('bubbleNewChatBtn').addEventListener('click', startDraft);

document.getElementById('chatMenuBtn').addEventListener('click', e => {
  e.stopPropagation();
  if (isTemp) { if (confirm('End temporary chat?')) { exitTemp(); startDraft(); } return; }
  const c = chats[currentChatId];
  if (c) document.getElementById('starLabel').textContent = c.starred ? 'Unstar' : 'Star';
  document.getElementById('chatDropdown').classList.toggle('show');
});

document.getElementById('optStarBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) { chats[currentChatId].starred = !chats[currentChatId].starred; saveChats(); renderChatList(); }
});
document.getElementById('optRenameBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) { const n = prompt('Rename:', chats[currentChatId].title); if (n?.trim()) { chats[currentChatId].title = n.trim(); saveChats(); renderChatList(); updateHeader(); } }
});
document.getElementById('optDeleteBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (confirm('Delete this chat?')) delChat(currentChatId);
});

document.addEventListener('click', e => {
  const am = document.getElementById('attachMenu');
  const ab = document.getElementById('attachBtn');
  const dd = document.getElementById('chatDropdown');
  const mb = document.getElementById('chatMenuBtn');
  if (!am.contains(e.target) && e.target !== ab) am.classList.remove('show');
  if (!dd.contains(e.target) && !mb.contains(e.target)) dd.classList.remove('show');
});

// ── Attach menu ──
document.getElementById('attachBtn').addEventListener('click', e => {
  e.stopPropagation(); document.getElementById('attachMenu').classList.toggle('show');
});
document.getElementById('choosePhotoBtn').addEventListener('click', () => { document.getElementById('imageInput').click(); document.getElementById('attachMenu').classList.remove('show'); });
document.getElementById('takePhotoBtn').addEventListener('click', () => { document.getElementById('attachMenu').classList.remove('show'); openCamera(); });
document.getElementById('chooseFileBtn').addEventListener('click', () => { document.getElementById('fileInput').click(); document.getElementById('attachMenu').classList.remove('show'); });

document.getElementById('toolsToggle').addEventListener('click', () => {
  appSettings.toolsEnabled = !appSettings.toolsEnabled;
  document.getElementById('toolsToggle').classList.toggle('on', appSettings.toolsEnabled); saveSettings();
});
document.getElementById('searchToggle').addEventListener('click', () => {
  appSettings.deepSearch = !appSettings.deepSearch;
  document.getElementById('searchToggle').classList.toggle('on', appSettings.deepSearch); saveSettings();
});

// ── File/image input ──
document.getElementById('imageInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  selFileContent = null; selFileName = null;
  if (f.type.startsWith('video/')) extractFrame(f, b => { selImage = b; showImgPrev(b, true); updateBtn(); });
  else compressImg(f, b => { selImage = b; showImgPrev(b, false); updateBtn(); });
  e.target.value = '';
});
document.getElementById('fileInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return; selImage = null;
  const r = new FileReader();
  r.onload = ev => { selFileContent = ev.target.result; selFileName = f.name; showFilePrev(f.name); updateBtn(); };
  r.readAsText(f); e.target.value = '';
});

function compressImg(file, cb) {
  const r = new FileReader(); r.onload = ev => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; } const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); cb(c.toDataURL('image/jpeg', .8)); }; img.src = ev.target.result; }; r.readAsDataURL(file);
}
function extractFrame(file, cb) {
  const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = URL.createObjectURL(file);
  v.addEventListener('loadeddata', () => { v.currentTime = Math.min(0.3, v.duration / 2); });
  v.addEventListener('seeked', () => { let w = v.videoWidth, h = v.videoHeight; if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; } const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); URL.revokeObjectURL(v.src); cb(c.toDataURL('image/jpeg', .8)); });
}

function showImgPrev(b, fromVideo) {
  const a = document.getElementById('previewArea');
  a.innerHTML = `<div class="prev-img-chip"><img src="${b}" alt="preview">${fromVideo ? '<span class="video-badge">Video frame</span>' : ''}<button class="rm-prev-btn" id="rmPrev">×</button></div>`;
  a.classList.add('show'); document.getElementById('rmPrev').addEventListener('click', clearPrev);
}
function showFilePrev(name) {
  const a = document.getElementById('previewArea');
  a.innerHTML = `<div class="prev-file-chip">${I.pdf}<span class="prev-file-name">${esc(name)}</span><button class="rm-prev-btn" id="rmPrev" style="position:static;margin-left:auto;">×</button></div>`;
  a.classList.add('show'); document.getElementById('rmPrev').addEventListener('click', clearPrev);
}
function clearPrev() {
  selImage = null; selFileContent = null; selFileName = null;
  const a = document.getElementById('previewArea'); a.innerHTML = ''; a.classList.remove('show'); updateBtn();
}

// ── Camera ──
async function openCamera() { document.getElementById('cameraOverlay').classList.add('show'); camFacing = 'user'; await startCam(); }
async function startCam() {
  if (camStream) camStream.getTracks().forEach(t => t.stop());
  try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing } }); document.getElementById('camVideo').srcObject = camStream; }
  catch (e) { addBubble('⚠️ Camera access denied.', 'bot-message'); closeCamera(); }
}
document.getElementById('camSwitchBtn').addEventListener('click', () => { camFacing = camFacing === 'user' ? 'environment' : 'user'; startCam(); });
document.getElementById('camCaptureBtn').addEventListener('click', () => {
  const v = document.getElementById('camVideo'); const c = document.getElementById('camCanvas');
  c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const b = c.toDataURL('image/jpeg', .9); selImage = b; selFileContent = null; selFileName = null;
  showImgPrev(b, false); updateBtn(); closeCamera();
});
document.getElementById('camCancelBtn').addEventListener('click', closeCamera);
function closeCamera() { document.getElementById('cameraOverlay').classList.remove('show'); if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; } }

// ── Mic ──
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
if (SR) {
  recog = new SR(); recog.lang = 'en-US'; recog.continuous = false; recog.interimResults = false;
  recog.onresult = e => { document.getElementById('userInput').value = e.results[0][0].transcript; updateBtn(); };
  recog.onend = () => { isListening = false; document.getElementById('micBtn').classList.remove('listening'); };
  recog.onerror = () => { isListening = false; document.getElementById('micBtn').classList.remove('listening'); };
  document.getElementById('micBtn').addEventListener('click', () => {
    if (isListening) { recog.stop(); }
    else { try { isListening = true; document.getElementById('micBtn').classList.add('listening'); recog.start(); } catch (e) { isListening = false; } }
  });
} else { document.getElementById('micBtn').style.display = 'none'; }

// ── Action button ──
function updateBtn() {
  const btn = document.getElementById('actionBtn');
  btn.classList.remove('is-send', 'is-stop', 'is-voice');
  if (isWaiting) { btn.innerHTML = I.stop; btn.classList.add('is-stop'); btn.onclick = () => { if (abortCtrl) abortCtrl.abort(); }; return; }
  if (voiceOn) { btn.innerHTML = I.voice; btn.classList.add('is-voice'); btn.onclick = stopVoice; return; }
  const has = document.getElementById('userInput').value.trim() || selImage || selFileContent;
  if (has) { btn.innerHTML = I.send; btn.classList.add('is-send'); btn.onclick = sendMsg; }
  else { btn.innerHTML = I.voice; btn.onclick = startVoice; }
}

document.getElementById('userInput').addEventListener('input', updateBtn);
document.getElementById('userInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

// ── Send ──
async function sendMsg() {
  const inp = document.getElementById('userInput');
  let txt = inp.value.trim();
  if (!txt && !selImage && !selFileContent) return;

  const ok = await useCredit();
  if (!ok) { openProfileModal('subscription'); return; }

  promoteDraft();
  const chat = activeChat();

  if (selFileContent) { const b = 'Attached file: ' + selFileName + '\n```\n' + selFileContent.slice(0, 20000) + '\n```'; txt = txt ? txt + '\n\n' + b : b; }

  let content;
  if (selImage) { content = []; if (txt) content.push({ type: 'text', text: txt }); content.push({ type: 'image_url', image_url: { url: selImage } }); }
  else { content = txt; }

  if (!chat.messages.length) { const src = inp.value.trim() || selFileName || 'Image'; chat.title = src.length > 35 ? src.slice(0, 35) + '...' : src; if (!isTemp) renderChatList(); }

  addBubble(content, 'user-message');
  chat.messages.push({ role: 'user', content });
  if (!isTemp) saveChats();
  updateHeader(); inp.value = ''; clearPrev();

  isWaiting = true; setDis(true); updateBtn(); showTyping();
  if (voiceOn) orbState('thinking');
  abortCtrl = new AbortController();

  try {
    const r = await apiFetch('/.netlify/functions/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: chat.messages, voiceMode: voiceOn, deepThinking: appSettings.deepThinking, deepSearch: appSettings.deepSearch, customInstructions: appSettings.customInstructions || '', toolsEnabled: appSettings.toolsEnabled }),
      signal: abortCtrl.signal
    });

    if (r.status === 402) { removeTyping(); done(); addBubble("⚠️ No credits left. Upgrade to continue.", 'bot-message'); openProfileModal('subscription'); return; }
    if (!r.ok) { const d = await r.json(); removeTyping(); errBubble(r.status); done(); return; }

    const data = await r.json();
    const reply = data.choices[0].message.content;

    removeTyping(); addBubble(reply, 'bot-message');
    chat.messages.push({ role: 'assistant', content: reply });
    if (!isTemp) saveChats(); done();

    if (voiceOn) { orbState('speaking'); await tts(speakable(reply)); if (voiceOn) { orbState('listening'); startRecording(); } }

  } catch (e) {
    removeTyping();
    addBubble(e.name === 'AbortError' ? '⏹️ Stopped.' : '⚠️ Connection error. Check your internet.', 'bot-message');
    done();
  }
}

function done() { isWaiting = false; abortCtrl = null; setDis(false); updateBtn(); }
function setDis(v) { ['userInput', 'attachBtn', 'micBtn'].forEach(id => document.getElementById(id).disabled = v); }
function errBubble(code) { const m = { 401: '⚠️ Invalid API key.', 429: '⚠️ Rate limit exceeded.', 500: '⚠️ Server error.', 503: '⚠️ Server error.' }; addBubble(m[code] || '⚠️ Something went wrong.', 'bot-message'); }

// ── Render bubble ──
function addBubble(content, cls) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div'); div.className = 'message ' + cls;

  if (Array.isArray(content)) {
    content.forEach(p => {
      if (p.type === 'text') { const t = document.createElement('div'); t.innerHTML = cls === 'bot-message' ? renderMd(p.text) : esc(p.text); div.appendChild(t); }
      else if (p.type === 'image_url') { const img = document.createElement('img'); img.src = p.image_url.url; img.className = 'message-image'; div.appendChild(img); }
    });
  } else if (cls === 'bot-message') {
    const imgM = typeof content === 'string' ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/) : null;
    if (imgM) {
      const img = document.createElement('img'); img.src = 'data:image/png;base64,' + imgM[1]; img.className = 'message-image'; div.appendChild(img);
      if (imgM[2].trim()) { const c = document.createElement('div'); c.textContent = imgM[2].trim(); div.appendChild(c); }
      const acts = document.createElement('div'); acts.className = 'msg-actions';
      const db = document.createElement('button'); db.className = 'msg-btn'; db.innerHTML = I.dl;
      db.addEventListener('click', () => dlImage(imgM[1])); acts.appendChild(db); div.appendChild(acts);
    } else {
      div.innerHTML = renderMd(content);
      // Copy code blocks
      div.querySelectorAll('pre').forEach(pre => {
        const cp = document.createElement('button'); cp.className = 'msg-btn'; cp.style.cssText = 'position:absolute;top:6px;right:6px;'; cp.innerHTML = I.copy; cp.title = 'Copy code'; pre.style.position = 'relative';
        cp.addEventListener('click', () => { navigator.clipboard.writeText(pre.textContent.trim()).then(() => { cp.style.color = '#22c55e'; setTimeout(() => cp.style.color = '', 1500); }); });
        pre.appendChild(cp);
      });
      const acts = document.createElement('div'); acts.className = 'msg-actions';
      const pb = document.createElement('button'); pb.className = 'msg-btn'; pb.title = 'Save PDF'; pb.innerHTML = I.pdf; pb.addEventListener('click', () => dlPDF(content));
      const cb = document.createElement('button'); cb.className = 'msg-btn copy-btn'; cb.title = 'Copy'; cb.innerHTML = I.copy;
      cb.addEventListener('click', async () => { await navigator.clipboard.writeText(content.replace(/\{\{FEXER_IMAGE:[\s\S]+?\}\}/g, '[image]')); cb.classList.add('copied'); setTimeout(() => cb.classList.remove('copied'), 1500); });
      acts.appendChild(pb); acts.appendChild(cb); div.appendChild(acts);
    }
  } else { div.textContent = content; }

  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
}

function renderMd(text) { marked.setOptions({ breaks: true, gfm: true }); return marked.parse(text); }

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  const d = document.createElement('div'); d.className = 'message bot-message typing-indicator'; d.id = 'typingDot';
  d.innerHTML = '<span></span><span></span><span></span>'; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
}
function removeTyping() { const d = document.getElementById('typingDot'); if (d) d.remove(); }

// ── Sidebar ──
document.getElementById('menuToggle').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); }

// ── Live Voice ──
document.getElementById('closeVoiceBtn').addEventListener('click', stopVoice);

async function startVoice() {
  if (!navigator.mediaDevices) { addBubble('⚠️ Microphone not available.', 'bot-message'); return; }
  voiceOn = true; document.getElementById('voiceOverlay').classList.add('show'); orbState('listening'); updateBtn();
  await startRecording();
}

function stopVoice() {
  voiceOn = false; document.getElementById('voiceOverlay').classList.remove('show');
  if (mRecorder && mRecorder.state === 'recording') mRecorder.stop();
  cleanAudio(); if (curPlayer) { curPlayer.pause(); curPlayer = null; }
  if (abortCtrl) abortCtrl.abort(); updateBtn();
}

function orbState(s) {
  const orb = document.getElementById('voiceOrb'); const txt = document.getElementById('voiceTxt');
  orb.classList.remove('thinking', 'speaking');
  if (s === 'thinking') { orb.classList.add('thinking'); txt.textContent = 'Thinking...'; }
  else if (s === 'speaking') { orb.classList.add('speaking'); txt.textContent = 'Speaking...'; }
  else { txt.textContent = 'Listening...'; }
}

async function startRecording() {
  try { mStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { addBubble('⚠️ Microphone access denied.', 'bot-message'); stopVoice(); return; }
  mChunks = []; spokenAbove = false; mRecorder = new MediaRecorder(mStream);
  mRecorder.ondataavailable = e => { if (e.data.size > 0) mChunks.push(e.data); };
  mRecorder.onstop = () => { cleanAudio(); if (!voiceOn) return; const blob = new Blob(mChunks, { type: mRecorder.mimeType }); if (blob.size > 1000) processAudio(blob); else startRecording(); };
  mRecorder.start(); orbState('listening'); watchSilence();
  mTimer = setTimeout(() => { if (mRecorder && mRecorder.state === 'recording') mRecorder.stop(); }, 15000);
}

function watchSilence() {
  mCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = mCtx.createMediaStreamSource(mStream); mAnalyser = mCtx.createAnalyser(); mAnalyser.fftSize = 512; src.connect(mAnalyser);
  const arr = new Uint8Array(mAnalyser.frequencyBinCount); let silStart = null;
  function chk() {
    if (!mRecorder || mRecorder.state !== 'recording') return;
    mAnalyser.getByteFrequencyData(arr); const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (avg > 12) { spokenAbove = true; silStart = null; }
    else if (spokenAbove) { if (!silStart) silStart = Date.now(); if (Date.now() - silStart > 1200) { mRecorder.stop(); return; } }
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
  orbState('thinking'); const b64 = await blobTo64(blob);
  try {
    const r = await apiFetch('/.netlify/functions/transcribe', { method: 'POST', body: JSON.stringify({ audioBase64: b64, mimeType: blob.type }) });
    if (!r.ok) throw new Error('fail');
    const d = await r.json(); const txt = (d.text || '').trim();
    if (!txt) { if (voiceOn) startRecording(); return; }
    document.getElementById('userInput').value = txt; sendMsg();
  } catch (e) { if (voiceOn) { addBubble("⚠️ Couldn't understand. Try again.", 'bot-message'); startRecording(); } }
}

const blobTo64 = blob => new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); });

async function tts(text) {
  return new Promise(async res => {
    try {
      const r = await apiFetch('/.netlify/functions/speak', { method: 'POST', body: JSON.stringify({ text: stripMd(text), voice: chatVoice() }) });
      if (!r.ok) { res(); return; }
      const d = await r.json(); const au = new Audio('data:audio/mp3;base64,' + d.audioBase64); curPlayer = au;
      au.onended = () => { curPlayer = null; res(); }; au.onerror = () => { curPlayer = null; res(); }; au.play();
    } catch (e) { res(); }
  });
}

const speakable = t => { const m = t.match(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?([\s\S]*)$/); return m ? (m[1] || "Here's the image.") : t; };
const stripMd = t => t.replace(/```[\s\S]*?```/g, '').replace(/[*_`#>~-]/g, '').replace(/\n+/g, '. ');

function dlPDF(text) {
  const doc = new jspdf.jsPDF();
  const plain = text.replace(/```([\s\S]*?)```/g, (_, c) => c.trim()).replace(/^#{1,6}\s*/gm, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/^[-*]\s+/gm, '• ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const lines = doc.splitTextToSize(plain, 180); doc.setFontSize(11); let y = 20;
  lines.forEach(l => { if (y > doc.internal.pageSize.height - 15) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += 7; });
  doc.save('Fexer-AI.pdf');
}

function dlImage(b64) { const a = document.createElement('a'); a.href = 'data:image/png;base64,' + b64; a.download = 'Fexer-AI-Image.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }

// ═══════════════════════════════════════════
//  AGENTS
// ═══════════════════════════════════════════

let agents = [], currentAgentId = null, agentPlan = null;

function saveAgents() { try { localStorage.setItem('fexerAgents', JSON.stringify(agents)); } catch (e) { } }
function loadAgents() { const s = localStorage.getItem('fexerAgents'); if (s) agents = JSON.parse(s); renderAgentsSidebar(); }

function openAgentPanel() { document.getElementById('agentPanel').classList.add('show'); renderAgentsPanelList(); }
function closeAgentPanel() { document.getElementById('agentPanel').classList.remove('show'); }

document.getElementById('closeAgentPanel').addEventListener('click', closeAgentPanel);

// Sidebar agents
document.getElementById('newAgentBtn').addEventListener('click', () => { openAgentPanel(); showAgentState('welcome'); currentAgentId = null; renderAgentsPanelList(); });
document.getElementById('newAgentBtnPanel').addEventListener('click', () => { showAgentState('welcome'); currentAgentId = null; renderAgentsPanelList(); });

function renderAgentsSidebar() {
  const list = document.getElementById('sidebarAgentsList');
  if (!agents.length) { list.innerHTML = '<div class="sb-agents-empty">No agents yet</div>'; return; }
  list.innerHTML = '';
  agents.forEach(a => {
    const item = document.createElement('div'); item.className = 'sb-agent-item' + (a.id === currentAgentId ? ' active' : '');
    item.innerHTML = `<div class="sb-agent-icon">${I.bolt}</div><span class="sb-agent-name">${esc(a.name)}</span>`;
    item.addEventListener('click', () => { openAgentPanel(); currentAgentId = a.id; renderAgentsPanelList(); showAgentDashboard(a); });
    list.appendChild(item);
  });
}

function renderAgentsPanelList() {
  const list = document.getElementById('agentsListPanel');
  if (!agents.length) { list.innerHTML = '<div class="agents-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p>No agents yet</p></div>'; return; }
  list.innerHTML = '';
  agents.forEach(a => {
    const item = document.createElement('div'); item.className = 'agent-panel-item' + (a.id === currentAgentId ? ' active' : '');
    item.innerHTML = `<div class="ap-icon">${I.bolt}</div><div class="ap-info"><div class="ap-name">${esc(a.name)}</div><div class="ap-status ${a.active ? 'active' : ''}">${a.active ? '🟢 Active' : '⚪ Inactive'}</div></div><button class="ap-del">${I.trash}</button>`;
    item.querySelector('.ap-del').addEventListener('click', e => {
      e.stopPropagation(); if (!confirm('Delete agent?')) return;
      agents = agents.filter(x => x.id !== a.id); saveAgents();
      if (currentAgentId === a.id) { currentAgentId = null; showAgentState('welcome'); }
      renderAgentsPanelList(); renderAgentsSidebar();
    });
    item.addEventListener('click', e => { if (e.target.closest('.ap-del')) return; currentAgentId = a.id; renderAgentsPanelList(); showAgentDashboard(a); });
    list.appendChild(item);
  });
}

function showAgentState(name) {
  document.querySelectorAll('.agent-state').forEach(s => s.classList.remove('active'));
  document.getElementById('state-' + name).classList.add('active');
}

// Example chips
document.querySelectorAll('.ex-chip').forEach(chip => {
  chip.addEventListener('click', () => { document.getElementById('agentPromptInput').value = chip.dataset.p; document.getElementById('agentPromptInput').focus(); });
});

// Build agent
document.getElementById('agentSubmitBtn').addEventListener('click', buildAgent);
document.getElementById('agentPromptInput').addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buildAgent(); } });

async function buildAgent() {
  const prompt = document.getElementById('agentPromptInput').value.trim();
  if (!prompt) return;

  const ok = await useCredit();
  if (!ok) { closeAgentPanel(); openProfileModal('subscription'); return; }

  document.getElementById('agentSubmitBtn').disabled = true;
  showAgentState('planning');

  const steps = document.getElementById('planningSteps').querySelectorAll('.plan-step');
  let si = 0;
  const timer = setInterval(() => {
    if (si > 0) { steps[si - 1].classList.remove('active'); steps[si - 1].classList.add('done'); }
    if (si < steps.length) { steps[si].classList.add('active'); si++; }
    else clearInterval(timer);
  }, 700);

  try {
    const r = await apiFetch('/.netlify/functions/agent-plan', { method: 'POST', body: JSON.stringify({ prompt }) });
    const data = await r.json();
    clearInterval(timer); steps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
    if (r.status === 402) { document.getElementById('agentSubmitBtn').disabled = false; showAgentState('welcome'); closeAgentPanel(); openProfileModal('subscription'); return; }
    if (!r.ok || !data.plan) throw new Error(data.error || 'Planning failed');
    agentPlan = { prompt, ...data.plan };
    document.getElementById('agentSubmitBtn').disabled = false;
    showPlan(data.plan);
  } catch (e) {
    clearInterval(timer); document.getElementById('agentSubmitBtn').disabled = false;
    showAgentState('welcome'); alert('❌ Planning failed: ' + e.message);
  }
}

function showPlan(plan) {
  document.getElementById('planName').textContent = plan.agentName || 'Agent';
  document.getElementById('planDesc').textContent = plan.description || '';
  document.getElementById('planStepsList').innerHTML = (plan.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  document.getElementById('planNodeTags').innerHTML = (plan.n8nNodes || []).map(n => `<span class="plan-tag">${esc(n)}</span>`).join('');
  const needs = (plan.services || []).filter(s => s.credentialType !== 'none');
  const cs = document.getElementById('credSection');
  if (!needs.length) { cs.style.display = 'none'; }
  else {
    cs.style.display = ''; document.getElementById('credList').innerHTML = '';
    needs.forEach(svc => {
      const item = document.createElement('div'); item.className = 'cred-item';
      item.innerHTML = `<div class="cred-item-head"><div class="cred-icon">🔌</div><div><div class="cred-name">${esc(svc.name)}</div><div class="cred-reason">${esc(svc.reason || '')}</div></div></div><div class="cred-row"><input type="password" class="cred-input" placeholder="${esc(svc.credentialLabel || svc.name + ' Key')}" data-key="${esc(svc.credentialKey)}">${svc.getUrl ? `<a href="${esc(svc.getUrl)}" target="_blank" class="cred-get-a">Get Key →</a>` : ''}</div>`;
      document.getElementById('credList').appendChild(item);
    });
  }
  showAgentState('credentials');
}

document.getElementById('backBtn').addEventListener('click', () => showAgentState('welcome'));

document.getElementById('deployBtn').addEventListener('click', async () => {
  if (!agentPlan) return;
  const credentials = {};
  document.getElementById('credList').querySelectorAll('.cred-input').forEach(inp => { if (inp.value.trim()) credentials[inp.dataset.key] = inp.value.trim(); });

  const ok = await useCredit();
  if (!ok) { closeAgentPanel(); openProfileModal('subscription'); return; }

  document.getElementById('deployBtn').disabled = true;
  showAgentState('deploying');

  const dsIds = ['ds1', 'ds2', 'ds3', 'ds4']; let di = 0;
  const dt = setInterval(() => {
    if (di > 0) { const p = document.getElementById(dsIds[di - 1]); if (p) p.querySelector('.ds-icon').textContent = '✅'; }
    if (di < dsIds.length) { const c = document.getElementById(dsIds[di]); if (c) { c.querySelector('.ds-icon').textContent = '⏳'; c.querySelector('.ds-icon').classList.remove('pending'); } di++; }
    else clearInterval(dt);
  }, 1200);

  try {
    const r = await apiFetch('/.netlify/functions/agent-deploy', { method: 'POST', body: JSON.stringify({ prompt: agentPlan.prompt, plan: agentPlan, credentials }) });
    const data = await r.json();
    clearInterval(dt); document.getElementById('deployBtn').disabled = false;
    if (r.status === 402) { showAgentState('credentials'); closeAgentPanel(); openProfileModal('subscription'); return; }
    if (!r.ok || !data.success) throw new Error(data.error || 'Deploy failed');
    const agent = { id: 'agent_' + Date.now(), name: agentPlan.agentName, description: agentPlan.description, workflowId: data.workflowId, workflowUrl: data.workflowUrl, active: true, createdAt: new Date().toISOString(), prompt: agentPlan.prompt };
    agents.unshift(agent); saveAgents(); currentAgentId = agent.id;
    renderAgentsPanelList(); renderAgentsSidebar(); showAgentDashboard(agent);
  } catch (e) {
    clearInterval(dt); document.getElementById('deployBtn').disabled = false;
    showAgentState('credentials'); alert('❌ Deploy failed: ' + e.message);
  }
});

function showAgentDashboard(agent) {
  document.getElementById('dashName').textContent = agent.name;
  document.getElementById('dashDesc').textContent = agent.description || agent.prompt || '';
  document.getElementById('dashStatus').textContent = agent.active ? '🟢 Active' : '⚪ Inactive';
  document.getElementById('dashStatus').className = 'status-badge ' + (agent.active ? 'active-badge' : 'inactive-badge');
  document.getElementById('dashN8nLink').href = agent.workflowUrl || '#';
  showAgentState('running'); loadExecs(agent);
}

async function loadExecs(agent) {
  if (!agent.workflowId) return;
  try {
    const r = await apiFetch('/.netlify/functions/agent-status', { method: 'POST', body: JSON.stringify({ workflowId: agent.workflowId }) });
    if (!r.ok) return;
    const data = await r.json(); const execs = data.executions || [];
    document.getElementById('stTotal').textContent = execs.length;
    document.getElementById('stOk').textContent = execs.filter(e => e.status === 'success').length;
    document.getElementById('stFail').textContent = execs.filter(e => e.status === 'error').length;
    document.getElementById('stLast').textContent = execs.length ? timeAgo(execs[0].startedAt) : '—';
    const el = document.getElementById('execList');
    if (!execs.length) { el.innerHTML = '<p class="hint">No executions yet.</p>'; return; }
    el.innerHTML = execs.map(e => `<div class="exec-row"><div class="exec-st"><div class="exec-dot ${e.status === 'success' ? 'success' : e.status === 'running' ? 'running' : 'error'}"></div><span class="exec-label">${e.status === 'success' ? '✓ Success' : e.status === 'running' ? '↻ Running' : '✗ Failed'}</span></div><span class="exec-time">${timeAgo(e.startedAt)}</span></div>`).join('');
  } catch (e) { }
}

document.getElementById('dashRefresh').addEventListener('click', () => { const a = agents.find(x => x.id === currentAgentId); if (a) loadExecs(a); });
document.getElementById('dashDelete').addEventListener('click', () => {
  const a = agents.find(x => x.id === currentAgentId);
  if (!a || !confirm("Delete '" + a.name + "'?")) return;
  agents = agents.filter(x => x.id !== currentAgentId); saveAgents(); currentAgentId = null;
  renderAgentsPanelList(); renderAgentsSidebar(); showAgentState('welcome');
});

function timeAgo(d) {
  if (!d) return '—'; const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago';
}

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════

(async () => {
  await initAuth();
  loadChats();
  loadSettings();
  loadAgents();
  updateBtn();
  updateHeader();
})();