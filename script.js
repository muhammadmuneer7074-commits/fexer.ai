'use strict';

// ════════════════════════════════════════════
//  1. CONFIG
// ════════════════════════════════════════════
const SUPABASE_URL = 'https://fiwukodsrhibrbhmoqgp.supabase.co';   // replace karo
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI';       // replace karo

// ════════════════════════════════════════════
//  2. SUPABASE CLIENT
// ════════════════════════════════════════════
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ════════════════════════════════════════════
//  3. GLOBAL STATE
// ════════════════════════════════════════════
let currentUser = null;
let currentSession = null;
let userPlan = 'free';
let userCredits = 5;

// Chat state
let chats = {};
let chatOrder = [];
let currentChatId = null;
let isDraft = false;
let draftChat = null;
let isTemp = false;
let tempChat = null;

// Input state
let selImage = null;
let selFileContent = null;
let selFileName = null;

// Request state
let isWaiting = false;
let abortCtrl = null;
let curPlayer = null;

// Voice state
let voiceOn = false;
let isListening = false;
let mStream = null;
let mRecorder = null;
let mChunks = [];
let mCtx = null;
let mAnalyser = null;
let mTimer = null;
let spokenAbove = false;

// Camera state
let camStream = null;
let camFacing = 'user';

// Agent state
let agents = [];
let currentAgentId = null;
let agentPlan = null;

// App settings
let appSettings = {
  toolsEnabled: true,
  deepSearch: false,
  deepThinking: false,
  voice: 'auto',
  style: 'normal',
  customInstructions: ''
};

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

// ════════════════════════════════════════════
//  4. HELPERS
// ════════════════════════════════════════════
const esc = s => {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

const randVoice = () => VOICES[Math.floor(Math.random() * VOICES.length)];

function getAuthHeader() {
  return currentSession
    ? { 'Authorization': 'Bearer ' + currentSession.access_token }
    : {};
}

function apiFetch(url, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(opts.headers || {})
  };
  return fetch(url, { ...opts, headers });
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function activeChat() {
  if (isDraft) return draftChat;
  if (isTemp) return tempChat;
  return chats[currentChatId];
}

function chatVoice() {
  if (appSettings.voice !== 'auto') return appSettings.voice;
  const c = activeChat();
  if (!c.voice) {
    c.voice = randVoice();
    if (!isDraft && !isTemp) saveChats();
  }
  return c.voice;
}

// SVG icons
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
//  5. AUTH
// ════════════════════════════════════════════
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '/auth.html';
    return;
  }
  currentSession = session;
  currentUser = session.user;

  // Listen for session changes
  sb.auth.onAuthStateChange((_event, sess) => {
    if (!sess) { window.location.href = '/auth.html'; return; }
    currentSession = sess;
    currentUser = sess.user;
  });

  await loadUserData();
}

async function loadUserData() {
  if (!currentUser) return;

  // Load credits from backend
  try {
    const r = await apiFetch('/.netlify/functions/credits-get');
    if (r.ok) {
      const { credits } = await r.json();
      userPlan = credits.plan || 'free';
      userCredits = credits.plan === 'max' ? Infinity : (credits.credits_remaining || 0);
      updateCreditsUI();
    }
  } catch (e) {
    console.error('Credits load error:', e);
  }

  // Update nav UI
  const email = currentUser.email || '';
  const initial = email.charAt(0).toUpperCase();

  const sbAvatar = document.getElementById('sbAvatar');
  if (sbAvatar) sbAvatar.textContent = initial;

  const sbUserName = document.getElementById('sbUserName');
  if (sbUserName) sbUserName.textContent = email.split('@')[0];

  const profileEmail = document.getElementById('profileEmail');
  if (profileEmail) profileEmail.value = email;

  // Plan badge
  const badge = document.getElementById('navPlanBadge');
  if (badge) {
    badge.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
    badge.className = 'nav-plan-badge ' + userPlan;
  }

  updateCurrentPlanCard();

  // Load saved profile from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
    if (saved.name) {
      const el = document.getElementById('profileName');
      if (el) el.value = saved.name;
      const un = document.getElementById('sbUserName');
      if (un) un.textContent = saved.name;
    }
    if (saved.instructions) {
      const el = document.getElementById('profileInstructions');
      if (el) el.value = saved.instructions;
    }
    if (saved.photo) {
      const ph = document.getElementById('profilePhoto');
      if (ph) ph.innerHTML = `<img src="${saved.photo}" alt="profile">`;
      const av = document.getElementById('sbAvatar');
      if (av) av.innerHTML = `<img src="${saved.photo}" alt="profile">`;
    }
  } catch (e) { }

  // Check if user just upgraded
  if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
    window.history.replaceState({}, '', '/');
    setTimeout(() => alert('🎉 Plan upgraded! Your new credits are active.'), 600);
  }
}

function updateCreditsUI() {
  const el = document.getElementById('creditsCount');
  const wrap = document.getElementById('navCredits');

  if (el) el.textContent = userPlan === 'max' ? '∞' : String(userCredits);
  if (wrap) wrap.classList.toggle('low', userPlan !== 'max' && userCredits <= 1);

  const bar = document.getElementById('noCreditsBar');
  if (bar) {
    bar.style.display = (userCredits <= 0 && userPlan !== 'max') ? 'flex' : 'none';
  }
}

function updateCurrentPlanCard() {
  const info = {
    free: { name: 'Free Plan', creds: '5 credits/day', badge: 'Free' },
    pro: { name: 'Pro Plan', creds: '100 credits/day', badge: 'Pro' },
    max: { name: 'Max Plan', creds: 'Unlimited credits', badge: 'Max' }
  };
  const p = info[userPlan] || info.free;

  const n = document.getElementById('cplanName');
  const cr = document.getElementById('cplanCredits');
  const b = document.getElementById('cplanBadge');
  if (n) n.textContent = p.name;
  if (cr) cr.textContent = p.creds;
  if (b) { b.textContent = p.badge; b.className = 'cplan-badge ' + userPlan; }
}

async function useCredit() {
  if (userPlan === 'max') return true;
  if (userCredits <= 0) {
    const bar = document.getElementById('noCreditsBar');
    if (bar) bar.style.display = 'flex';
    return false;
  }
  userCredits = Math.max(0, userCredits - 1);
  updateCreditsUI();
  return true;
}

// ── Sign Out ──
document.getElementById('signoutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  await sb.auth.signOut();
  window.location.href = '/auth.html';
});

// ── No Credits Bar ──
document.getElementById('noCreditsUpgradeBtn').addEventListener('click', () => {
  document.getElementById('noCreditsBar').style.display = 'none';
  openProfileModal('subscription');
});
document.getElementById('dismissCreditsBar').addEventListener('click', () => {
  document.getElementById('noCreditsBar').style.display = 'none';
});

// ════════════════════════════════════════════
//  6. PROFILE MODAL
// ════════════════════════════════════════════
function openProfileModal(tab) {
  document.getElementById('profileModal').classList.add('show');
  switchProfileTab(tab || 'profile');
}

document.getElementById('sidebarProfileBtn').addEventListener('click', () => openProfileModal('profile'));

document.getElementById('closeProfileModal').addEventListener('click', () => {
  document.getElementById('profileModal').classList.remove('show');
});

document.getElementById('profileModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('show');
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

// ── Profile Photo Change ──
document.getElementById('changePhotoBtn').addEventListener('click', () => {
  document.getElementById('profilePhotoInput').click();
});

document.getElementById('profilePhotoInput').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const b64 = ev.target.result;
    const ph = document.getElementById('profilePhoto');
    const av = document.getElementById('sbAvatar');
    if (ph) ph.innerHTML = `<img src="${b64}" alt="profile">`;
    if (av) av.innerHTML = `<img src="${b64}" alt="profile">`;
    const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
    saved.photo = b64;
    localStorage.setItem('fexerProfile', JSON.stringify(saved));
  };
  reader.readAsDataURL(f);
  e.target.value = '';
});

// ── Style Chips ──
document.querySelectorAll('#styleChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#styleChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appSettings.style = chip.dataset.style;
    saveSettings();
  });
});

// ── Voice Chips ──
document.querySelectorAll('#voiceChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#voiceChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appSettings.voice = chip.dataset.voice;
    saveSettings();
  });
});

// ── Save Profile ──
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  const name = (document.getElementById('profileName').value || '').trim();
  const instructions = (document.getElementById('profileInstructions').value || '').trim();

  const saved = JSON.parse(localStorage.getItem('fexerProfile') || '{}');
  saved.name = name;
  saved.instructions = instructions;
  localStorage.setItem('fexerProfile', JSON.stringify(saved));

  appSettings.customInstructions = instructions;
  saveSettings();

  if (name) {
    const un = document.getElementById('sbUserName');
    if (un) un.textContent = name;
  }

  // Show success briefly
  const btn = document.getElementById('saveProfileBtn');
  const original = btn.textContent;
  btn.textContent = '✓ Saved!';
  setTimeout(() => { btn.textContent = original; }, 1500);
});

// ════════════════════════════════════════════
//  7. SUBSCRIPTION
// ════════════════════════════════════════════

// Upgrade plan buttons
document.querySelectorAll('[data-plan]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const plan = btn.dataset.plan;
    if (!plan) return;
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Loading...';

    try {
      const r = await apiFetch('/.netlify/functions/lemonsqueezy-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      alert('❌ Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
});

// Billing portal
document.getElementById('billingPortalBtn').addEventListener('click', async () => {
  const btn = document.getElementById('billingPortalBtn');
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.textContent = 'Loading...';

  try {
    const r = await apiFetch('/.netlify/functions/lemonsqueezy-portal', {
      method: 'POST',
      body: JSON.stringify({})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Portal failed');
    if (data.url) {
      window.open(data.url, '_blank');
    } else {
      alert('No billing portal found. Please subscribe to a plan first.');
    }
  } catch (e) {
    alert('❌ ' + e.message);
  }

  btn.disabled = false;
  btn.innerHTML = orig;
});

// ════════════════════════════════════════════
//  8. IMAGE GENERATION MODAL
// ════════════════════════════════════════════
document.getElementById('imageGenBtn').addEventListener('click', () => {
  document.getElementById('imageGenModal').classList.add('show');
  document.getElementById('imgGenPrompt').value = '';
  document.getElementById('imgGenResult').innerHTML = '';
});

document.getElementById('closeImageGenModal').addEventListener('click', () => {
  document.getElementById('imageGenModal').classList.remove('show');
});

document.getElementById('imageGenModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('show');
});

// Size chips
document.querySelectorAll('.size-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

document.getElementById('imgGenSubmit').addEventListener('click', async () => {
  const prompt = (document.getElementById('imgGenPrompt').value || '').trim();
  if (!prompt) {
    alert('Please enter a description for the image.');
    return;
  }

  const hasCredit = await useCredit();
  if (!hasCredit) {
    document.getElementById('imageGenModal').classList.remove('show');
    openProfileModal('subscription');
    return;
  }

  const sizeChip = document.querySelector('.size-chip.selected');
  const size = sizeChip ? sizeChip.dataset.size : '1024x1024';
  const btn = document.getElementById('imgGenSubmit');
  const result = document.getElementById('imgGenResult');

  btn.disabled = true;
  btn.textContent = 'Generating...';
  result.innerHTML = '<p style="color:var(--dim);text-align:center;padding:20px;font-size:13px;">🎨 Creating your image...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt, size })
    });
    const data = await r.json();

    if (r.status === 402) {
      result.innerHTML = '';
      document.getElementById('imageGenModal').classList.remove('show');
      openProfileModal('subscription');
      return;
    }

    if (!r.ok) throw new Error(data.error || 'Generation failed');

    result.innerHTML = `<img src="data:image/png;base64,${data.b64}" alt="Generated" style="width:100%;border-radius:12px;display:block;"><button class="dl-btn" id="dlGenImg" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:10px;padding:10px;background:var(--bg-b);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;cursor:pointer;">${I.dl} Download Image</button>`;

    document.getElementById('dlGenImg').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'data:image/png;base64,' + data.b64;
      a.download = 'Fexer-AI-Image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

  } catch (e) {
    result.innerHTML = `<p style="color:var(--red);font-size:13px;text-align:center;">❌ ${e.message}</p>`;
  }

  btn.disabled = false;
  btn.innerHTML = `${I.bolt} Generate`;
});

// ════════════════════════════════════════════
//  9. SETTINGS & STORAGE
// ════════════════════════════════════════════
function saveSettings() {
  try { localStorage.setItem('fexerSettings', JSON.stringify(appSettings)); } catch (e) { }
}

function loadSettings() {
  try {
    const s = localStorage.getItem('fexerSettings');
    if (s) Object.assign(appSettings, JSON.parse(s));
  } catch (e) { }

  // Apply toggle states
  const toolsEl = document.getElementById('toolsToggle');
  const searchEl = document.getElementById('searchToggle');
  if (toolsEl) toolsEl.classList.toggle('on', appSettings.toolsEnabled);
  if (searchEl) searchEl.classList.toggle('on', appSettings.deepSearch);

  // Apply active chips
  document.querySelectorAll('#styleChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.style === (appSettings.style || 'normal'));
  });
  document.querySelectorAll('#voiceChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.voice === (appSettings.voice || 'auto'));
  });

  // Apply custom instructions
  if (appSettings.customInstructions) {
    const el = document.getElementById('profileInstructions');
    if (el) el.value = appSettings.customInstructions;
  }
}

function saveChats() {
  try { localStorage.setItem('fexerChats', JSON.stringify({ chats, chatOrder })); } catch (e) { }
}

function loadChats() {
  try {
    const s = localStorage.getItem('fexerChats');
    if (s) {
      const p = JSON.parse(s);
      chats = p.chats || {};
      chatOrder = p.chatOrder || [];
    }
  } catch (e) { }

  if (chatOrder.length) {
    currentChatId = chatOrder[0];
    renderChatList();
    renderChat();
  } else {
    startDraft();
  }
}

// ── Toggles ──
document.getElementById('toolsToggle').addEventListener('click', () => {
  appSettings.toolsEnabled = !appSettings.toolsEnabled;
  document.getElementById('toolsToggle').classList.toggle('on', appSettings.toolsEnabled);
  saveSettings();
});

document.getElementById('searchToggle').addEventListener('click', () => {
  appSettings.deepSearch = !appSettings.deepSearch;
  document.getElementById('searchToggle').classList.toggle('on', appSettings.deepSearch);
  saveSettings();
});

// ════════════════════════════════════════════
//  10. CHAT — DRAFT / TEMP
// ════════════════════════════════════════════
function startDraft() {
  isTemp = false; tempChat = null;
  isDraft = true;
  draftChat = { title: 'New Chat', messages: [], voice: randVoice() };
  currentChatId = null;
  renderChatList();
  renderChat();
  updateHeader();
  closeSidebar();
}

function startTemp() {
  isDraft = false; draftChat = null;
  isTemp = true;
  tempChat = { title: 'Temporary Chat', messages: [], voice: randVoice() };
  renderChatList();
  renderChat();
  updateHeader();
  closeSidebar();
}

function exitTemp() { isTemp = false; tempChat = null; }

function promoteDraft() {
  if (!isDraft) return;
  const id = 'chat_' + Date.now();
  chats[id] = draftChat;
  chatOrder.unshift(id);
  currentChatId = id;
  isDraft = false;
  draftChat = null;
}

// ── Ghost button ──
document.getElementById('ghostChatBtn').addEventListener('click', startTemp);

function updateHeader() {
  const c = activeChat();
  const has = c && c.messages.length > 0;

  const ghostBtn = document.getElementById('ghostChatBtn');
  const bubbleWrap = document.getElementById('chatBubbleWrap');

  if (ghostBtn) ghostBtn.hidden = has;
  if (bubbleWrap) bubbleWrap.hidden = !has;

  // Update chat title
  const titleEl = document.getElementById('chatTitle');
  if (!titleEl) return;

  if (isTemp) { titleEl.textContent = '🕶️ Temporary Chat'; return; }
  if (isDraft) { titleEl.textContent = 'Fexer AI'; return; }
  const chat = chats[currentChatId];
  titleEl.textContent = (chat && chat.title) ? chat.title : 'Fexer AI';
}

// ════════════════════════════════════════════
//  11. CHAT LIST
// ════════════════════════════════════════════
function switchChat(id) {
  isDraft = false; draftChat = null; exitTemp();
  currentChatId = id;
  renderChatList();
  renderChat();
  updateHeader();
  closeSidebar();
}

function delChat(id) {
  delete chats[id];
  chatOrder = chatOrder.filter(x => x !== id);

  if (currentChatId === id) {
    if (chatOrder.length) {
      currentChatId = chatOrder[0];
      isDraft = false; draftChat = null;
    } else {
      saveChats();
      startDraft();
      return;
    }
  }
  saveChats();
  renderChatList();
  renderChat();
  updateHeader();
}

function renderChatList(query) {
  const list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';

  const q = (query || '').toLowerCase();
  let ids = chatOrder.filter(id =>
    chats[id] && (!q || chats[id].title.toLowerCase().includes(q))
  );
  ids.sort((a, b) => (chats[b].starred ? 1 : 0) - (chats[a].starred ? 1 : 0));

  ids.forEach(id => {
    const chat = chats[id];
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === currentChatId && !isTemp && !isDraft ? ' active' : '');

    const tw = document.createElement('span');
    tw.className = 'chat-item-title';
    if (chat.starred) {
      const si = document.createElement('span');
      si.className = 'chat-star';
      si.innerHTML = I.star;
      tw.appendChild(si);
    }
    const tt = document.createElement('span');
    tt.className = 'chat-item-title-text';
    tt.textContent = chat.title;
    tw.appendChild(tt);
    item.appendChild(tw);

    const del = document.createElement('button');
    del.className = 'chat-del-btn';
    del.innerHTML = I.trash;
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Delete this chat?')) delChat(id);
    });
    item.appendChild(del);

    // Long press for mobile delete
    let pressTimer = null, didLongPress = false;
    const onPressStart = () => {
      didLongPress = false;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        item.classList.add('show-delete');
      }, 500);
    };
    const onPressEnd = () => clearTimeout(pressTimer);
    item.addEventListener('mousedown', onPressStart);
    item.addEventListener('touchstart', onPressStart, { passive: true });
    ['mouseup', 'mouseleave', 'touchend'].forEach(ev => item.addEventListener(ev, onPressEnd));

    item.addEventListener('click', () => {
      if (didLongPress) return;
      if (item.classList.contains('show-delete')) {
        item.classList.remove('show-delete');
        return;
      }
      switchChat(id);
    });

    list.appendChild(item);
  });
}

document.getElementById('chatSearchInput').addEventListener('input', function () {
  renderChatList(this.value);
});

// ── New chat buttons ──
document.getElementById('sidebarNewChatBtn').addEventListener('click', startDraft);
document.getElementById('bubbleNewChatBtn').addEventListener('click', startDraft);

// ════════════════════════════════════════════
//  12. CHAT HEADER 3-DOT MENU
// ════════════════════════════════════════════
document.getElementById('chatMenuBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  if (isTemp) {
    if (confirm('End temporary chat?')) { exitTemp(); startDraft(); }
    return;
  }
  const c = chats[currentChatId];
  const lbl = document.getElementById('starLabel');
  if (c && lbl) lbl.textContent = c.starred ? 'Unstar' : 'Star';
  document.getElementById('chatDropdown').classList.toggle('show');
});

document.getElementById('optStarBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) {
    chats[currentChatId].starred = !chats[currentChatId].starred;
    saveChats();
    renderChatList();
  }
});

document.getElementById('optRenameBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (!isDraft && !isTemp && chats[currentChatId]) {
    const n = prompt('Rename:', chats[currentChatId].title);
    if (n && n.trim()) {
      chats[currentChatId].title = n.trim();
      saveChats();
      renderChatList();
      updateHeader();
    }
  }
});

document.getElementById('optDeleteBtn').addEventListener('click', () => {
  document.getElementById('chatDropdown').classList.remove('show');
  if (confirm('Delete this chat?')) delChat(currentChatId);
});

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  const am = document.getElementById('attachMenu');
  const ab = document.getElementById('attachBtn');
  const dd = document.getElementById('chatDropdown');
  const mb = document.getElementById('chatMenuBtn');

  if (am && ab && !am.contains(e.target) && e.target !== ab) {
    am.classList.remove('show');
  }
  if (dd && mb && !dd.contains(e.target) && !mb.contains(e.target)) {
    dd.classList.remove('show');
  }
});

// ════════════════════════════════════════════
//  13. SIDEBAR
// ════════════════════════════════════════════
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
});

document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ════════════════════════════════════════════
//  14. ATTACH MENU
// ════════════════════════════════════════════
document.getElementById('attachBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('attachMenu').classList.toggle('show');
});

document.getElementById('choosePhotoBtn').addEventListener('click', () => {
  document.getElementById('imageInput').click();
  document.getElementById('attachMenu').classList.remove('show');
});

document.getElementById('takePhotoBtn').addEventListener('click', () => {
  document.getElementById('attachMenu').classList.remove('show');
  openCamera();
});

document.getElementById('chooseFileBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
  document.getElementById('attachMenu').classList.remove('show');
});

// ── Image / Video input ──
document.getElementById('imageInput').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;
  selFileContent = null; selFileName = null;

  if (f.type.startsWith('video/')) {
    extractVideoFrame(f, b64 => {
      selImage = b64;
      showImgPreview(b64, true);
      updateBtn();
    });
  } else {
    compressImage(f, b64 => {
      selImage = b64;
      showImgPreview(b64, false);
      updateBtn();
    });
  }
  e.target.value = '';
});

// ── File input ──
document.getElementById('fileInput').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;
  selImage = null;

  const reader = new FileReader();
  reader.onload = ev => {
    selFileContent = ev.target.result;
    selFileName = f.name;
    showFilePreview(f.name);
    updateBtn();
  };
  reader.readAsText(f);
  e.target.value = '';
});

function compressImage(file, cb) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function extractVideoFrame(file, cb) {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = URL.createObjectURL(file);

  video.addEventListener('loadeddata', () => {
    video.currentTime = Math.min(0.3, video.duration / 2);
  });
  video.addEventListener('seeked', () => {
    let w = video.videoWidth, h = video.videoHeight;
    if (w > 1024) { h = Math.round(h * 1024 / w); w = 1024; }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    URL.revokeObjectURL(video.src);
    cb(canvas.toDataURL('image/jpeg', 0.8));
  });
}

function showImgPreview(b64, isVideo) {
  const area = document.getElementById('previewArea');
  area.innerHTML = `
    <div class="prev-img-chip">
      <img src="${b64}" alt="preview">
      ${isVideo ? '<span class="video-badge">Video frame</span>' : ''}
      <button class="rm-prev-btn" id="rmPrev">×</button>
    </div>`;
  area.classList.add('show');
  document.getElementById('rmPrev').addEventListener('click', clearPreview);
}

function showFilePreview(name) {
  const area = document.getElementById('previewArea');
  area.innerHTML = `
    <div class="prev-file-chip">
      ${I.pdf}
      <span class="prev-file-name">${esc(name)}</span>
      <button class="rm-prev-btn" id="rmPrev" style="position:static;margin-left:auto;">×</button>
    </div>`;
  area.classList.add('show');
  document.getElementById('rmPrev').addEventListener('click', clearPreview);
}

function clearPreview() {
  selImage = null; selFileContent = null; selFileName = null;
  const area = document.getElementById('previewArea');
  area.innerHTML = '';
  area.classList.remove('show');
  updateBtn();
}

// ════════════════════════════════════════════
//  15. CAMERA
// ════════════════════════════════════════════
async function openCamera() {
  document.getElementById('cameraOverlay').classList.add('show');
  camFacing = 'user';
  await startCamera();
}

async function startCamera() {
  if (camStream) camStream.getTracks().forEach(t => t.stop());
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: camFacing }
    });
    document.getElementById('camVideo').srcObject = camStream;
  } catch (e) {
    addBubble('⚠️ Camera access denied.', 'bot-message');
    closeCamera();
  }
}

document.getElementById('camSwitchBtn').addEventListener('click', () => {
  camFacing = camFacing === 'user' ? 'environment' : 'user';
  startCamera();
});

document.getElementById('camCaptureBtn').addEventListener('click', () => {
  const video = document.getElementById('camVideo');
  const canvas = document.getElementById('camCanvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

  const b64 = canvas.toDataURL('image/jpeg', 0.9);
  selImage = b64;
  selFileContent = null;
  selFileName = null;
  showImgPreview(b64, false);
  updateBtn();
  closeCamera();
});

document.getElementById('camCancelBtn').addEventListener('click', closeCamera);

function closeCamera() {
  document.getElementById('cameraOverlay').classList.remove('show');
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
}

// ════════════════════════════════════════════
//  16. MIC (DICTATION)
// ════════════════════════════════════════════
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = e => {
    document.getElementById('userInput').value = e.results[0][0].transcript;
    updateBtn();
  };
  recognition.onend = () => { isListening = false; document.getElementById('micBtn').classList.remove('listening'); };
  recognition.onerror = () => { isListening = false; document.getElementById('micBtn').classList.remove('listening'); };

  document.getElementById('micBtn').addEventListener('click', () => {
    if (isListening) {
      recognition.stop();
    } else {
      try {
        isListening = true;
        document.getElementById('micBtn').classList.add('listening');
        recognition.start();
      } catch (e) {
        isListening = false;
      }
    }
  });
} else {
  document.getElementById('micBtn').style.display = 'none';
}

// ════════════════════════════════════════════
//  17. ACTION BUTTON STATE
// ════════════════════════════════════════════
function updateBtn() {
  const btn = document.getElementById('actionBtn');
  btn.classList.remove('is-send', 'is-stop', 'is-voice');

  if (isWaiting) {
    btn.innerHTML = I.stop;
    btn.classList.add('is-stop');
    btn.onclick = () => { if (abortCtrl) abortCtrl.abort(); };
    return;
  }

  if (voiceOn) {
    btn.innerHTML = I.voice;
    btn.classList.add('is-voice');
    btn.onclick = stopVoice;
    return;
  }

  const hasInput = document.getElementById('userInput').value.trim() || selImage || selFileContent;
  if (hasInput) {
    btn.innerHTML = I.send;
    btn.classList.add('is-send');
    btn.onclick = sendMsg;
  } else {
    btn.innerHTML = I.voice;
    btn.onclick = startVoice;
  }
}

document.getElementById('userInput').addEventListener('input', updateBtn);
document.getElementById('userInput').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) sendMsg();
});

// ════════════════════════════════════════════
//  18. SEND MESSAGE
// ════════════════════════════════════════════
async function sendMsg() {
  const inputEl = document.getElementById('userInput');
  let txt = inputEl.value.trim();

  if (!txt && !selImage && !selFileContent) return;

  // Credit check
  const hasCredit = await useCredit();
  if (!hasCredit) { openProfileModal('subscription'); return; }

  promoteDraft();
  const chat = activeChat();

  // Append file content to text
  if (selFileContent) {
    const block = `Attached file: ${selFileName}\n\`\`\`\n${selFileContent.slice(0, 20000)}\n\`\`\``;
    txt = txt ? txt + '\n\n' + block : block;
  }

  // Build content
  let content;
  if (selImage) {
    content = [];
    if (txt) content.push({ type: 'text', text: txt });
    content.push({ type: 'image_url', image_url: { url: selImage } });
  } else {
    content = txt;
  }

  // Set chat title from first message
  if (!chat.messages.length) {
    const src = inputEl.value.trim() || selFileName || 'Image';
    chat.title = src.length > 35 ? src.slice(0, 35) + '...' : src;
    if (!isTemp) renderChatList();
  }

  addBubble(content, 'user-message');
  chat.messages.push({ role: 'user', content });
  if (!isTemp) saveChats();
  updateHeader();

  inputEl.value = '';
  clearPreview();
  isWaiting = true;
  setInputDisabled(true);
  updateBtn();
  showTyping();
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

    // No credits
    if (r.status === 402) {
      removeTyping();
      addBubble("⚠️ You've run out of credits for today. Upgrade to continue.", 'bot-message');
      chatDone();
      openProfileModal('subscription');
      return;
    }

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      removeTyping();
      showErrorBubble(r.status, err.message);
      chatDone();
      return;
    }

    const data = await r.json();
    const reply = data.choices[0].message.content;

    removeTyping();
    addBubble(reply, 'bot-message');
    chat.messages.push({ role: 'assistant', content: reply });
    if (!isTemp) saveChats();
    chatDone();

    // Voice mode: speak then continue listening
    if (voiceOn) {
      setOrbState('speaking');
      await playTTS(speakableText(reply));
      if (voiceOn) { setOrbState('listening'); startRecording(); }
    }

  } catch (e) {
    removeTyping();
    if (e.name === 'AbortError') {
      addBubble('⏹️ Stopped.', 'bot-message');
    } else {
      addBubble('⚠️ Connection error. Please check your internet connection.', 'bot-message');
      console.error('Chat error:', e);
    }
    chatDone();
  }
}

function chatDone() {
  isWaiting = false;
  abortCtrl = null;
  setInputDisabled(false);
  updateBtn();
}

function setInputDisabled(val) {
  ['userInput', 'attachBtn', 'micBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = val;
  });
}

function showErrorBubble(code, msg) {
  const errors = {
    401: '⚠️ Invalid API key.',
    429: '⚠️ Rate limit exceeded. Please wait a moment.',
    500: '⚠️ Server error. Please try again.',
    503: '⚠️ Server temporarily unavailable. Please try again.'
  };
  addBubble(msg || errors[code] || '⚠️ Something went wrong.', 'bot-message');
}

// ════════════════════════════════════════════
//  19. RENDER MESSAGES
// ════════════════════════════════════════════
function renderChat() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  msgs.innerHTML = '';

  const chat = activeChat();
  if (isTemp) addBubble("🕶️ Temporary Chat — this conversation won't be saved.", 'bot-message');
  if (!chat || !chat.messages.length) {
    if (!isTemp) addBubble('Hi! I\'m Fexer AI. How can I help you today?', 'bot-message');
    return;
  }
  chat.messages.forEach(m => addBubble(m.content, m.role === 'user' ? 'user-message' : 'bot-message'));
}

function addBubble(content, cls) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;

  const div = document.createElement('div');
  div.className = 'message ' + cls;

  if (Array.isArray(content)) {
    content.forEach(part => {
      if (part.type === 'text') {
        const t = document.createElement('div');
        t.innerHTML = cls === 'bot-message' ? renderMarkdown(part.text) : esc(part.text);
        div.appendChild(t);
      } else if (part.type === 'image_url') {
        const img = document.createElement('img');
        img.src = part.image_url.url;
        img.className = 'message-image';
        div.appendChild(img);
      }
    });

  } else if (cls === 'bot-message') {
    // Check for generated image
    const imgMatch = typeof content === 'string'
      ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/)
      : null;

    if (imgMatch) {
      const b64 = imgMatch[1];
      const cap = imgMatch[2];

      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + b64;
      img.className = 'message-image';
      div.appendChild(img);

      if (cap.trim()) {
        const c = document.createElement('div');
        c.textContent = cap.trim();
        div.appendChild(c);
      }

      const acts = document.createElement('div');
      acts.className = 'msg-actions';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'msg-btn';
      dlBtn.innerHTML = I.dl;
      dlBtn.title = 'Download image';
      dlBtn.addEventListener('click', () => downloadImage(b64));
      acts.appendChild(dlBtn);
      div.appendChild(acts);

    } else {
      // Regular bot message with markdown
      div.innerHTML = renderMarkdown(content);

      // Add copy button to each code block
      div.querySelectorAll('pre').forEach(pre => {
        pre.style.position = 'relative';
        const cpBtn = document.createElement('button');
        cpBtn.className = 'msg-btn';
        cpBtn.innerHTML = I.copy;
        cpBtn.title = 'Copy code';
        cpBtn.style.cssText = 'position:absolute;top:6px;right:6px;';
        cpBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
            cpBtn.style.color = '#22c55e';
            setTimeout(() => { cpBtn.style.color = ''; }, 1500);
          }).catch(() => { });
        });
        pre.appendChild(cpBtn);
      });

      // Message action buttons
      const acts = document.createElement('div');
      acts.className = 'msg-actions';

      const pdfBtn = document.createElement('button');
      pdfBtn.className = 'msg-btn';
      pdfBtn.innerHTML = I.pdf;
      pdfBtn.title = 'Save as PDF';
      pdfBtn.addEventListener('click', () => savePDF(content));

      const copyBtn = document.createElement('button');
      copyBtn.className = 'msg-btn copy-btn';
      copyBtn.innerHTML = I.copy;
      copyBtn.title = 'Copy text';
      copyBtn.addEventListener('click', async () => {
        const plain = content.replace(/\{\{FEXER_IMAGE:[\s\S]+?\}\}/g, '[image]');
        try {
          await navigator.clipboard.writeText(plain);
          copyBtn.classList.add('copied');
          setTimeout(() => copyBtn.classList.remove('copied'), 1500);
        } catch (e) { }
      });

      acts.appendChild(pdfBtn);
      acts.appendChild(copyBtn);
      div.appendChild(acts);
    }

  } else {
    // User message — plain text
    div.textContent = content;
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function renderMarkdown(text) {
  if (typeof marked === 'undefined') return esc(text);
  marked.setOptions({ breaks: true, gfm: true });
  return marked.parse(text);
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const d = document.createElement('div');
  d.className = 'message bot-message typing-indicator';
  d.id = 'typingDot';
  d.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const d = document.getElementById('typingDot');
  if (d) d.remove();
}

// ════════════════════════════════════════════
//  20. PDF / IMAGE DOWNLOAD
// ════════════════════════════════════════════
function savePDF(text) {
  if (typeof jspdf === 'undefined') { alert('PDF library not loaded.'); return; }
  const doc = new jspdf.jsPDF();
  const plain = text
    .replace(/```([\s\S]*?)```/g, (_, c) => c.trim())
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const lines = doc.splitTextToSize(plain, 180);
  doc.setFontSize(11);
  let y = 20;
  lines.forEach(line => {
    if (y > doc.internal.pageSize.height - 15) { doc.addPage(); y = 20; }
    doc.text(line, 15, y);
    y += 7;
  });
  doc.save('Fexer-AI.pdf');
}

function downloadImage(b64) {
  const a = document.createElement('a');
  a.href = 'data:image/png;base64,' + b64;
  a.download = 'Fexer-AI-Image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ════════════════════════════════════════════
//  21. LIVE VOICE CHAT
// ════════════════════════════════════════════
document.getElementById('closeVoiceBtn').addEventListener('click', stopVoice);

async function startVoice() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    addBubble('⚠️ Microphone is not available in this browser.', 'bot-message');
    return;
  }
  voiceOn = true;
  document.getElementById('voiceOverlay').classList.add('show');
  setOrbState('listening');
  updateBtn();
  await startRecording();
}

function stopVoice() {
  voiceOn = false;
  document.getElementById('voiceOverlay').classList.remove('show');

  if (mRecorder && mRecorder.state === 'recording') mRecorder.stop();
  cleanupAudio();

  if (curPlayer) { curPlayer.pause(); curPlayer = null; }
  if (abortCtrl) abortCtrl.abort();

  updateBtn();
}

function setOrbState(state) {
  const orb = document.getElementById('voiceOrb');
  const txt = document.getElementById('voiceTxt');
  if (!orb || !txt) return;

  orb.classList.remove('thinking', 'speaking');
  if (state === 'thinking') { orb.classList.add('thinking'); txt.textContent = 'Thinking...'; }
  else if (state === 'speaking') { orb.classList.add('speaking'); txt.textContent = 'Speaking...'; }
  else { txt.textContent = 'Listening...'; }
}

async function startRecording() {
  try {
    mStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    addBubble('⚠️ Microphone access denied.', 'bot-message');
    stopVoice();
    return;
  }

  mChunks = []; spokenAbove = false;
  mRecorder = new MediaRecorder(mStream);

  mRecorder.ondataavailable = e => { if (e.data.size > 0) mChunks.push(e.data); };
  mRecorder.onstop = () => {
    cleanupAudio();
    if (!voiceOn) return;
    const blob = new Blob(mChunks, { type: mRecorder.mimeType });
    if (blob.size > 1000) processVoiceAudio(blob);
    else startRecording();
  };

  mRecorder.start();
  setOrbState('listening');
  watchForSilence();

  // Auto-stop after 15 seconds max
  mTimer = setTimeout(() => {
    if (mRecorder && mRecorder.state === 'recording') mRecorder.stop();
  }, 15000);
}

function watchForSilence() {
  mCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = mCtx.createMediaStreamSource(mStream);
  mAnalyser = mCtx.createAnalyser();
  mAnalyser.fftSize = 512;
  src.connect(mAnalyser);

  const buffer = new Uint8Array(mAnalyser.frequencyBinCount);
  let silStart = null;

  function check() {
    if (!mRecorder || mRecorder.state !== 'recording') return;
    mAnalyser.getByteFrequencyData(buffer);
    const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;

    if (avg > 12) {
      spokenAbove = true;
      silStart = null;
    } else if (spokenAbove) {
      if (!silStart) silStart = Date.now();
      if (Date.now() - silStart > 1200) {
        mRecorder.stop();
        return;
      }
    }
    requestAnimationFrame(check);
  }
  requestAnimationFrame(check);
}

function cleanupAudio() {
  if (mTimer) { clearTimeout(mTimer); mTimer = null; }
  if (mCtx) { mCtx.close(); mCtx = null; }
  if (mStream) { mStream.getTracks().forEach(t => t.stop()); mStream = null; }
}

async function processVoiceAudio(blob) {
  setOrbState('thinking');
  const b64 = await blobToBase64(blob);

  try {
    const r = await apiFetch('/.netlify/functions/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioBase64: b64, mimeType: blob.type })
    });

    if (!r.ok) throw new Error('Transcription failed');
    const data = await r.json();
    const txt = (data.text || '').trim();

    if (!txt) {
      if (voiceOn) startRecording();
      return;
    }

    document.getElementById('userInput').value = txt;
    sendMsg();

  } catch (e) {
    console.error('Transcribe error:', e);
    if (voiceOn) {
      addBubble("⚠️ Couldn't understand. Please try again.", 'bot-message');
      startRecording();
    }
  }
}

const blobToBase64 = blob => new Promise(resolve => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.readAsDataURL(blob);
});

async function playTTS(text) {
  return new Promise(async resolve => {
    try {
      const r = await apiFetch('/.netlify/functions/speak', {
        method: 'POST',
        body: JSON.stringify({ text: stripMarkdown(text), voice: chatVoice() })
      });

      if (!r.ok) { resolve(); return; }
      const data = await r.json();
      const audio = new Audio('data:audio/mp3;base64,' + data.audioBase64);
      curPlayer = audio;

      audio.onended = () => { curPlayer = null; resolve(); };
      audio.onerror = () => { curPlayer = null; resolve(); };
      audio.play().catch(() => { curPlayer = null; resolve(); });

    } catch (e) {
      resolve();
    }
  });
}

function speakableText(text) {
  const m = text.match(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?([\s\S]*)$/);
  return m ? (m[1] || "Here's the image you requested.") : text;
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`#>~-]/g, '')
    .replace(/\n+/g, '. ')
    .trim();
}

// ════════════════════════════════════════════
//  22. AGENTS
// ════════════════════════════════════════════
function saveAgents() {
  try { localStorage.setItem('fexerAgents', JSON.stringify(agents)); } catch (e) { }
}

function loadAgents() {
  try {
    const s = localStorage.getItem('fexerAgents');
    if (s) agents = JSON.parse(s);
  } catch (e) { }
  renderAgentsSidebar();
}

// ── Open/Close Agent Panel ──
function openAgentPanel() {
  document.getElementById('agentPanel').classList.add('show');
  renderAgentsPanelList();
}

function closeAgentPanel() {
  document.getElementById('agentPanel').classList.remove('show');
}

document.getElementById('closeAgentPanel').addEventListener('click', closeAgentPanel);

// ── Sidebar agent items ──
document.getElementById('newAgentBtn').addEventListener('click', () => {
  openAgentPanel();
  currentAgentId = null;
  showAgentState('welcome');
  renderAgentsPanelList();
});

document.getElementById('newAgentBtnPanel').addEventListener('click', () => {
  currentAgentId = null;
  showAgentState('welcome');
  renderAgentsPanelList();
});

function renderAgentsSidebar() {
  const list = document.getElementById('sidebarAgentsList');
  if (!list) return;

  if (!agents.length) {
    list.innerHTML = '<div class="sb-agents-empty">No agents yet</div>';
    return;
  }

  list.innerHTML = '';
  agents.forEach(agent => {
    const item = document.createElement('div');
    item.className = 'sb-agent-item' + (agent.id === currentAgentId ? ' active' : '');
    item.innerHTML = `
      <div class="sb-agent-icon">${I.bolt}</div>
      <span class="sb-agent-name">${esc(agent.name)}</span>
    `;
    item.addEventListener('click', () => {
      openAgentPanel();
      currentAgentId = agent.id;
      renderAgentsPanelList();
      renderAgentDashboard(agent);
    });
    list.appendChild(item);
  });
}

function renderAgentsPanelList() {
  const list = document.getElementById('agentsListPanel');
  if (!list) return;

  if (!agents.length) {
    list.innerHTML = `<div class="agents-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p>No agents yet</p></div>`;
    return;
  }

  list.innerHTML = '';
  agents.forEach(agent => {
    const item = document.createElement('div');
    item.className = 'agent-panel-item' + (agent.id === currentAgentId ? ' active' : '');
    item.innerHTML = `
      <div class="ap-icon">${I.bolt}</div>
      <div class="ap-info">
        <div class="ap-name">${esc(agent.name)}</div>
        <div class="ap-status ${agent.active ? 'active' : ''}">${agent.active ? '🟢 Active' : '⚪ Inactive'}</div>
      </div>
      <button class="ap-del">${I.trash}</button>
    `;
    item.querySelector('.ap-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Delete agent "' + agent.name + '"?')) return;
      agents = agents.filter(a => a.id !== agent.id);
      saveAgents();
      if (currentAgentId === agent.id) { currentAgentId = null; showAgentState('welcome'); }
      renderAgentsPanelList();
      renderAgentsSidebar();
    });
    item.addEventListener('click', e => {
      if (e.target.closest('.ap-del')) return;
      currentAgentId = agent.id;
      renderAgentsPanelList();
      renderAgentDashboard(agent);
    });
    list.appendChild(item);
  });
}

function showAgentState(stateName) {
  document.querySelectorAll('.agent-state').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('state-' + stateName);
  if (el) el.classList.add('active');
}

// ── Example chips ──
document.querySelectorAll('.ex-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const inp = document.getElementById('agentPromptInput');
    if (inp) { inp.value = chip.dataset.p; inp.focus(); }
  });
});

// ── Build Agent ──
document.getElementById('agentSubmitBtn').addEventListener('click', buildAgent);
document.getElementById('agentPromptInput').addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buildAgent(); }
});

async function buildAgent() {
  const inp = document.getElementById('agentPromptInput');
  const prompt = (inp ? inp.value : '').trim();
  if (!prompt) { alert('Please describe your automation.'); return; }

  const hasCredit = await useCredit();
  if (!hasCredit) { closeAgentPanel(); openProfileModal('subscription'); return; }

  const submitBtn = document.getElementById('agentSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  showAgentState('planning');

  // Animate planning steps
  const stepEls = document.querySelectorAll('#planningSteps .plan-step');
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx > 0 && stepEls[stepIdx - 1]) {
      stepEls[stepIdx - 1].classList.remove('active');
      stepEls[stepIdx - 1].classList.add('done');
    }
    if (stepIdx < stepEls.length && stepEls[stepIdx]) {
      stepEls[stepIdx].classList.add('active');
      stepIdx++;
    } else {
      clearInterval(stepTimer);
    }
  }, 700);

  try {
    const r = await apiFetch('/.netlify/functions/agent-plan', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await r.json();

    clearInterval(stepTimer);
    stepEls.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

    if (r.status === 402) {
      if (submitBtn) submitBtn.disabled = false;
      showAgentState('welcome');
      closeAgentPanel();
      openProfileModal('subscription');
      return;
    }

    if (!r.ok || !data.plan) throw new Error(data.error || 'Planning failed');

    agentPlan = { prompt, ...data.plan };
    if (submitBtn) submitBtn.disabled = false;
    renderPlanAndCreds(data.plan);

  } catch (e) {
    clearInterval(stepTimer);
    if (submitBtn) submitBtn.disabled = false;
    showAgentState('welcome');
    alert('❌ Planning failed: ' + e.message);
  }
}

function renderPlanAndCreds(plan) {
  // Populate plan details
  const nameEl = document.getElementById('planName');
  const descEl = document.getElementById('planDesc');
  const stepsEl = document.getElementById('planStepsList');
  const nodesEl = document.getElementById('planNodeTags');

  if (nameEl) nameEl.textContent = plan.agentName || 'Your Agent';
  if (descEl) descEl.textContent = plan.description || '';
  if (stepsEl) stepsEl.innerHTML = (plan.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  if (nodesEl) nodesEl.innerHTML = (plan.n8nNodes || []).map(n => `<span class="plan-tag">${esc(n)}</span>`).join('');

  // Credentials
  const credSection = document.getElementById('credSection');
  const credList = document.getElementById('credList');
  const needCreds = (plan.services || []).filter(s => s.credentialType !== 'none');

  if (credSection && credList) {
    if (!needCreds.length) {
      credSection.style.display = 'none';
    } else {
      credSection.style.display = '';
      credList.innerHTML = '';
      needCreds.forEach(svc => {
        const item = document.createElement('div');
        item.className = 'cred-item';
        item.innerHTML = `
          <div class="cred-item-head">
            <div class="cred-icon">🔌</div>
            <div>
              <div class="cred-name">${esc(svc.name)}</div>
              <div class="cred-reason">${esc(svc.reason || '')}</div>
            </div>
          </div>
          <div class="cred-row">
            <input
              type="password"
              class="cred-input"
              placeholder="${esc(svc.credentialLabel || svc.name + ' Key')}"
              data-key="${esc(svc.credentialKey)}"
            >
            ${svc.getUrl ? `<a href="${esc(svc.getUrl)}" target="_blank" class="cred-get-a">Get Key →</a>` : ''}
          </div>`;
        credList.appendChild(item);
      });
    }
  }

  showAgentState('credentials');
}

// ── Back button ──
document.getElementById('backBtn').addEventListener('click', () => showAgentState('welcome'));

// ── Deploy Agent ──
document.getElementById('deployBtn').addEventListener('click', async () => {
  if (!agentPlan) { alert('No plan found. Please try again.'); return; }

  // Collect credentials
  const credentials = {};
  document.querySelectorAll('#credList .cred-input').forEach(inp => {
    if (inp.value.trim()) credentials[inp.dataset.key] = inp.value.trim();
  });

  const hasCredit = await useCredit();
  if (!hasCredit) { closeAgentPanel(); openProfileModal('subscription'); return; }

  const deployBtn = document.getElementById('deployBtn');
  if (deployBtn) deployBtn.disabled = true;
  showAgentState('deploying');

  // Animate deploy steps
  const dsIds = ['ds1', 'ds2', 'ds3', 'ds4'];
  let dsIdx = 0;
  const dsTimer = setInterval(() => {
    if (dsIdx > 0) {
      const prev = document.getElementById(dsIds[dsIdx - 1]);
      if (prev) prev.querySelector('.ds-icon').textContent = '✅';
    }
    if (dsIdx < dsIds.length) {
      const cur = document.getElementById(dsIds[dsIdx]);
      if (cur) {
        const icon = cur.querySelector('.ds-icon');
        icon.textContent = '⏳';
        icon.classList.remove('pending');
      }
      dsIdx++;
    } else {
      clearInterval(dsTimer);
    }
  }, 1200);

  try {
    const r = await apiFetch('/.netlify/functions/agent-deploy', {
      method: 'POST',
      body: JSON.stringify({
        prompt: agentPlan.prompt,
        plan: agentPlan,
        credentials
      })
    });
    const data = await r.json();

    clearInterval(dsTimer);
    if (deployBtn) deployBtn.disabled = false;

    if (r.status === 402) {
      showAgentState('credentials');
      closeAgentPanel();
      openProfileModal('subscription');
      return;
    }

    if (!r.ok || !data.success) throw new Error(data.error || 'Deployment failed');

    // Save agent locally
    const newAgent = {
      id: 'agent_' + Date.now(),
      name: agentPlan.agentName,
      description: agentPlan.description,
      workflowId: data.workflowId,
      workflowUrl: data.workflowUrl,
      active: true,
      createdAt: new Date().toISOString(),
      prompt: agentPlan.prompt
    };

    agents.unshift(newAgent);
    saveAgents();
    currentAgentId = newAgent.id;

    renderAgentsPanelList();
    renderAgentsSidebar();
    renderAgentDashboard(newAgent);

  } catch (e) {
    clearInterval(dsTimer);
    if (deployBtn) deployBtn.disabled = false;
    showAgentState('credentials');
    alert('❌ Deployment failed: ' + e.message + '\n\nMake sure N8N_URL and N8N_API_KEY are set in Netlify environment variables.');
  }
});

// ── Agent Dashboard ──
function renderAgentDashboard(agent) {
  const nameEl = document.getElementById('dashName');
  const descEl = document.getElementById('dashDesc');
  const statEl = document.getElementById('dashStatus');
  const linkEl = document.getElementById('dashN8nLink');

  if (nameEl) nameEl.textContent = agent.name;
  if (descEl) descEl.textContent = agent.description || agent.prompt || '';
  if (statEl) {
    statEl.textContent = agent.active ? '🟢 Active' : '⚪ Inactive';
    statEl.className = 'status-badge ' + (agent.active ? 'active-badge' : 'inactive-badge');
  }
  if (linkEl) linkEl.href = agent.workflowUrl || '#';

  showAgentState('running');
  loadAgentExecutions(agent);
}

document.getElementById('dashRefresh').addEventListener('click', () => {
  const agent = agents.find(a => a.id === currentAgentId);
  if (agent) loadAgentExecutions(agent);
});

document.getElementById('dashDelete').addEventListener('click', () => {
  const agent = agents.find(a => a.id === currentAgentId);
  if (!agent || !confirm(`Delete agent "${agent.name}"?`)) return;
  agents = agents.filter(a => a.id !== currentAgentId);
  saveAgents();
  currentAgentId = null;
  renderAgentsPanelList();
  renderAgentsSidebar();
  showAgentState('welcome');
});

async function loadAgentExecutions(agent) {
  if (!agent.workflowId) return;

  const execList = document.getElementById('execList');
  if (execList) execList.innerHTML = '<p class="hint">Loading...</p>';

  try {
    const r = await apiFetch('/.netlify/functions/agent-status', {
      method: 'POST',
      body: JSON.stringify({ workflowId: agent.workflowId })
    });

    if (!r.ok) {
      if (execList) execList.innerHTML = '<p class="hint">Could not load execution history.</p>';
      return;
    }

    const data = await r.json();
    const execs = data.executions || [];

    // Update stats
    const stTotal = document.getElementById('stTotal');
    const stOk = document.getElementById('stOk');
    const stFail = document.getElementById('stFail');
    const stLast = document.getElementById('stLast');

    if (stTotal) stTotal.textContent = execs.length;
    if (stOk) stOk.textContent = execs.filter(e => e.status === 'success').length;
    if (stFail) stFail.textContent = execs.filter(e => e.status === 'error').length;
    if (stLast) stLast.textContent = execs.length ? timeAgo(execs[0].startedAt) : '—';

    if (!execList) return;

    if (!execs.length) {
      execList.innerHTML = '<p class="hint">No executions yet. The agent will run based on its trigger.</p>';
      return;
    }

    execList.innerHTML = execs.map(e => {
      const status = e.status === 'success' ? 'success' : e.status === 'running' ? 'running' : 'error';
      const label = e.status === 'success' ? '✓ Success' : e.status === 'running' ? '↻ Running' : '✗ Failed';
      return `
        <div class="exec-row">
          <div class="exec-st">
            <div class="exec-dot ${status}"></div>
            <span class="exec-label">${label}</span>
          </div>
          <span class="exec-time">${timeAgo(e.startedAt)}</span>
        </div>`;
    }).join('');

  } catch (e) {
    console.error('Executions load error:', e);
    if (execList) execList.innerHTML = '<p class="hint">Error loading executions.</p>';
  }
}

// ════════════════════════════════════════════
//  23. INITIALISE EVERYTHING
// ════════════════════════════════════════════
(async function init() {
  // 1. Auth first — redirects to /auth.html if not logged in
  await initAuth();

  // 2. Load saved settings
  loadSettings();

  // 3. Load chat history from localStorage
  loadChats();

  // 4. Load agents from localStorage
  loadAgents();

  // 5. Set initial button state
  updateBtn();
  updateHeader();

  console.log('✅ Fexer AI initialized');
})();