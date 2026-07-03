// ════════════════════════════════════════════
//  CHAT SECTION
// ════════════════════════════════════════════

// ── Elements ──
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const actionBtn = document.getElementById("actionBtn");
const micBtn = document.getElementById("micBtn");
const attachBtn = document.getElementById("attachBtn");
const attachMenu = document.getElementById("attachMenu");
const imageInput = document.getElementById("imageInput");
const fileUploadInput = document.getElementById("fileUploadInput");
const imagePreviewArea = document.getElementById("imagePreviewArea");
const chatList = document.getElementById("chatList");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const chatSearchInput = document.getElementById("chatSearchInput");
const sidebarNewChatBtn = document.getElementById("sidebarNewChatBtn");
const ghostChatBtn = document.getElementById("ghostChatBtn");
const chatOptionsWrapper = document.getElementById("chatOptionsWrapper");
const chatOptionsMenuBtn = document.getElementById("chatOptionsMenuBtn");
const bubbleNewChatBtn = document.getElementById("bubbleNewChatBtn");
const chatOptionsDropdown = document.getElementById("chatOptionsDropdown");
const optStarBtn = document.getElementById("optStarBtn");
const optRenameBtn = document.getElementById("optRenameBtn");
const optDeleteBtn = document.getElementById("optDeleteBtn");
const starBtnLabel = document.getElementById("starBtnLabel");
const choosePhotoBtn = document.getElementById("choosePhotoBtn");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const toolsToggleMenu = document.getElementById("toolsToggleMenu");
const webSearchToggleMenu = document.getElementById("webSearchToggleMenu");
const voiceOverlay = document.getElementById("voiceOverlay");
const voiceOrb = document.getElementById("voiceOrb");
const voiceStatusText = document.getElementById("voiceStatusText");
const closeVoiceOverlayBtn = document.getElementById("closeVoiceOverlayBtn");
const cameraOverlay = document.getElementById("cameraOverlay");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCancelBtn = document.getElementById("cameraCancelBtn");
const cameraCaptureBtn = document.getElementById("cameraCaptureBtn");
const cameraSwitchBtn = document.getElementById("cameraSwitchBtn");

// ── State ──
let chats = {}, chatOrder = [], currentChatId = null;
let isDraftChat = false, draftChat = null;
let isTemporary = false, tempChat = null;
let selectedImage = null, selectedFileContent = null, selectedFileName = null;
let isWaiting = false, voiceOn = false, isListening = false, autoSpeak = false;
let abortCtrl = null, currentPlayer = null;
let appSettings = { deepThinking: false, deepSearch: false, toolsEnabled: true, voice: "auto" };
const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
const randVoice = () => VOICES[Math.floor(Math.random() * VOICES.length)];

function activeChat() {
  if (isDraftChat) return draftChat;
  if (isTemporary) return tempChat;
  return chats[currentChatId];
}

function chatVoice() {
  if (appSettings.voice !== "auto") return appSettings.voice;
  const c = activeChat();
  if (!c.voice) { c.voice = randVoice(); if (!isDraftChat && !isTemporary) saveChats(); }
  return c.voice;
}

let mediaStream = null, mediaRecorder = null, audioChunks = [];
let audioCtx = null, analyserNode = null, maxTimer = null, spokenAbove = false;
let camStream = null, camFacing = "user";

const SVG = {
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="11" y1="3" x2="11" y2="21"/><line x1="15" y1="6" x2="15" y2="18"/><line x1="19" y1="10" x2="19" y2="14"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  dl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

const esc = s => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };

// ── Storage ──
function saveChats() { try { localStorage.setItem("fexerChats", JSON.stringify({ chats, chatOrder })); } catch (e) { } }
function loadChats() {
  const s = localStorage.getItem("fexerChats");
  if (s) { const p = JSON.parse(s); chats = p.chats || {}; chatOrder = p.chatOrder || []; }
  chatOrder.length ? (currentChatId = chatOrder[0], renderChatList(), renderChatView()) : startDraft();
}
function saveSettings() { localStorage.setItem("fexerSettings", JSON.stringify(appSettings)); }
function loadSettings() {
  const s = localStorage.getItem("fexerSettings");
  if (s) appSettings = Object.assign(appSettings, JSON.parse(s));
  toolsToggleMenu.classList.toggle("on", appSettings.toolsEnabled);
  webSearchToggleMenu.classList.toggle("on", appSettings.deepSearch);
}

// ── Draft / Temp ──
function startDraft() {
  isTemporary = false; tempChat = null;
  isDraftChat = true; draftChat = { title: "New Chat", messages: [], voice: randVoice() };
  currentChatId = null; renderChatList(); renderChatView(); updateHeader(); closeSidebar();
}
function startTemp() {
  isDraftChat = false; draftChat = null; isTemporary = true;
  tempChat = { title: "Temporary Chat", messages: [], voice: randVoice() };
  renderChatList(); renderChatView(); updateHeader(); closeSidebar();
}
function exitTemp() { isTemporary = false; tempChat = null; }
function promoteDraft() {
  if (!isDraftChat) return;
  const id = "chat_" + Date.now();
  chats[id] = draftChat; chatOrder.unshift(id); currentChatId = id;
  isDraftChat = false; draftChat = null;
}

ghostChatBtn.addEventListener("click", startTemp);

function updateHeader() {
  const c = activeChat(); const has = c && c.messages.length > 0;
  ghostChatBtn.hidden = has; chatOptionsWrapper.hidden = !has;
}

// ── Chat ──
function switchChat(id) {
  isDraftChat = false; draftChat = null; exitTemp(); currentChatId = id;
  renderChatList(); renderChatView(); updateHeader(); closeSidebar();
}
function deleteChat(id) {
  delete chats[id]; chatOrder = chatOrder.filter(x => x !== id);
  if (currentChatId === id) { chatOrder.length ? (currentChatId = chatOrder[0], isDraftChat = false, draftChat = null) : (saveChats(), startDraft(), renderAgentList(), undefined); }
  saveChats(); renderChatList(); renderChatView(); updateHeader();
}
function renderChatList(q) {
  chatList.innerHTML = "";
  const qry = (q || "").toLowerCase();
  let ids = chatOrder.filter(id => chats[id] && (!qry || chats[id].title.toLowerCase().includes(qry)));
  ids.sort((a, b) => (chats[b].starred ? 1 : 0) - (chats[a].starred ? 1 : 0));
  ids.forEach(id => {
    const c = chats[id];
    const item = document.createElement("div");
    item.className = "chat-item" + (id === currentChatId && !isTemporary && !isDraftChat ? " active" : "");
    const tw = document.createElement("span"); tw.className = "chat-item-title";
    if (c.starred) { const si = document.createElement("span"); si.className = "chat-star"; si.innerHTML = SVG.star; tw.appendChild(si); }
    const tt = document.createElement("span"); tt.className = "chat-item-title-text"; tt.textContent = c.title; tw.appendChild(tt);
    item.appendChild(tw);
    const del = document.createElement("button"); del.className = "chat-delete-btn"; del.innerHTML = SVG.trash;
    del.addEventListener("click", e => { e.stopPropagation(); if (confirm("Delete?")) deleteChat(id); });
    item.appendChild(del);
    let pt = null, lp = false;
    item.addEventListener("mousedown", () => { lp = false; pt = setTimeout(() => { lp = true; item.classList.add("show-delete"); }, 500); });
    item.addEventListener("touchstart", () => { lp = false; pt = setTimeout(() => { lp = true; item.classList.add("show-delete"); }, 500); });
    ["mouseup", "mouseleave", "touchend"].forEach(e => item.addEventListener(e, () => clearTimeout(pt)));
    item.addEventListener("click", () => { if (lp) return; if (item.classList.contains("show-delete")) { item.classList.remove("show-delete"); return; } switchChat(id); });
    chatList.appendChild(item);
  });
}
chatSearchInput.addEventListener("input", () => renderChatList(chatSearchInput.value));

function renderChatView() {
  chatMessages.innerHTML = "";
  const c = activeChat();
  if (isTemporary) addChatBubble("🕶️ Temporary Chat — this conversation will not be saved.", "bot-message");
  if (!c.messages.length) { if (!isTemporary) addChatBubble("Hi! I'm Fexer AI. Ask me anything.", "bot-message"); return; }
  c.messages.forEach(m => addChatBubble(m.content, m.role === "user" ? "user-message" : "bot-message"));
}

// ── 3-dot Menu ──
sidebarNewChatBtn.addEventListener("click", startDraft);
bubbleNewChatBtn.addEventListener("click", startDraft);
chatOptionsMenuBtn.addEventListener("click", e => {
  e.stopPropagation();
  if (isTemporary) { if (confirm("End temporary chat?")) { exitTemp(); startDraft(); } return; }
  const c = chats[currentChatId]; if (c) starBtnLabel.textContent = c.starred ? "Unstar" : "Star";
  chatOptionsDropdown.classList.toggle("show");
});
optStarBtn.addEventListener("click", () => {
  chatOptionsDropdown.classList.remove("show");
  if (!isDraftChat && !isTemporary && chats[currentChatId]) { chats[currentChatId].starred = !chats[currentChatId].starred; saveChats(); renderChatList(); }
});
optRenameBtn.addEventListener("click", () => {
  chatOptionsDropdown.classList.remove("show");
  if (!isDraftChat && !isTemporary && chats[currentChatId]) { const n = prompt("Rename:", chats[currentChatId].title); if (n?.trim()) { chats[currentChatId].title = n.trim(); saveChats(); renderChatList(); } }
});
optDeleteBtn.addEventListener("click", () => { chatOptionsDropdown.classList.remove("show"); if (confirm("Delete this chat?")) deleteChat(currentChatId); });
document.addEventListener("click", e => {
  if (!attachMenu.contains(e.target) && e.target !== attachBtn) attachMenu.classList.remove("show");
  if (!chatOptionsDropdown.contains(e.target) && !chatOptionsMenuBtn.contains(e.target)) chatOptionsDropdown.classList.remove("show");
});

// ── Attach ──
attachBtn.addEventListener("click", e => { e.stopPropagation(); attachMenu.classList.toggle("show"); });
choosePhotoBtn.addEventListener("click", () => { imageInput.click(); attachMenu.classList.remove("show"); });
takePhotoBtn.addEventListener("click", () => { attachMenu.classList.remove("show"); openCamera(); });
chooseFileBtn.addEventListener("click", () => { fileUploadInput.click(); attachMenu.classList.remove("show"); });
toolsToggleMenu.addEventListener("click", () => { appSettings.toolsEnabled = !appSettings.toolsEnabled; saveSettings(); toolsToggleMenu.classList.toggle("on", appSettings.toolsEnabled); });
webSearchToggleMenu.addEventListener("click", () => { appSettings.deepSearch = !appSettings.deepSearch; saveSettings(); webSearchToggleMenu.classList.toggle("on", appSettings.deepSearch); });

imageInput.addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  selectedFileContent = null; selectedFileName = null;
  if (f.type.startsWith("video/")) { extractFrame(f, b => { selectedImage = b; showImgPrev(b, true); updateBtn(); }); }
  else { compressImg(f, b => { selectedImage = b; showImgPrev(b, false); updateBtn(); }); }
  e.target.value = "";
});
fileUploadInput.addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return; selectedImage = null;
  const r = new FileReader();
  r.onload = ev => { selectedFileContent = ev.target.result; selectedFileName = f.name; showFilePrev(f.name); updateBtn(); };
  r.readAsText(f); e.target.value = "";
});

function compressImg(file, cb) {
  const r = new FileReader(); r.onload = ev => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w > 800) { h = Math.round(h * 800 / w); w = 800; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); cb(c.toDataURL("image/jpeg", 0.7)); }; img.src = ev.target.result; }; r.readAsDataURL(file);
}
function extractFrame(file, cb) {
  const v = document.createElement("video"); v.preload = "metadata"; v.muted = true; v.src = URL.createObjectURL(file);
  v.addEventListener("loadeddata", () => { v.currentTime = Math.min(0.3, v.duration / 2); });
  v.addEventListener("seeked", () => { let w = v.videoWidth, h = v.videoHeight; if (w > 800) { h = Math.round(h * 800 / w); w = 800; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h); URL.revokeObjectURL(v.src); cb(c.toDataURL("image/jpeg", 0.7)); });
}
function showImgPrev(b, fromVideo) {
  imagePreviewArea.innerHTML = `<div class="image-preview-chip"><img src="${b}" alt="preview">${fromVideo ? '<span class="video-frame-badge">Video frame</span>' : ''}<button class="remove-preview-btn" id="rmPrev">×</button></div>`;
  imagePreviewArea.classList.add("show"); document.getElementById("rmPrev").addEventListener("click", clearPrev);
}
function showFilePrev(name) {
  imagePreviewArea.innerHTML = `<div class="file-preview-chip">${SVG.pdf}<span class="file-chip-name">${esc(name)}</span><button class="remove-preview-btn" id="rmPrev" style="position:static;margin-left:auto;">×</button></div>`;
  imagePreviewArea.classList.add("show"); document.getElementById("rmPrev").addEventListener("click", clearPrev);
}
function clearPrev() { selectedImage = null; selectedFileContent = null; selectedFileName = null; imagePreviewArea.innerHTML = ""; imagePreviewArea.classList.remove("show"); updateBtn(); }

// ── Camera ──
async function openCamera() { cameraOverlay.classList.add("show"); camFacing = "user"; await startCam(); }
async function startCam() {
  if (camStream) camStream.getTracks().forEach(t => t.stop());
  try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing } }); cameraVideo.srcObject = camStream; }
  catch (e) { addChatBubble("⚠️ Camera access denied.", "bot-message"); closeCamera(); }
}
cameraSwitchBtn.addEventListener("click", () => { camFacing = camFacing === "user" ? "environment" : "user"; startCam(); });
cameraCaptureBtn.addEventListener("click", () => {
  cameraCanvas.width = cameraVideo.videoWidth; cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext("2d").drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  const b = cameraCanvas.toDataURL("image/jpeg", 0.8);
  selectedImage = b; selectedFileContent = null; selectedFileName = null; showImgPrev(b, false); updateBtn(); closeCamera();
});
cameraCancelBtn.addEventListener("click", closeCamera);
function closeCamera() { cameraOverlay.classList.remove("show"); if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; } }

// ── Mic ──
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
if (SR) {
  recog = new SR(); recog.lang = "en-US"; recog.continuous = false; recog.interimResults = false;
  recog.onresult = e => { userInput.value = e.results[0][0].transcript; updateBtn(); };
  recog.onend = () => { isListening = false; micBtn.classList.remove("listening"); };
  recog.onerror = () => { isListening = false; micBtn.classList.remove("listening"); };
  micBtn.addEventListener("click", () => { if (isListening) { recog.stop(); } else { try { isListening = true; micBtn.classList.add("listening"); recog.start(); } catch (e) { isListening = false; } } });
} else { micBtn.style.display = "none"; }

// ── Action Button ──
function updateBtn() {
  actionBtn.classList.remove("is-send", "is-stop", "is-voice-active");
  if (isWaiting) { actionBtn.innerHTML = SVG.stop; actionBtn.classList.add("is-stop"); actionBtn.onclick = () => { if (abortCtrl) abortCtrl.abort(); }; return; }
  if (voiceOn) { actionBtn.innerHTML = SVG.voice; actionBtn.classList.add("is-voice-active"); actionBtn.onclick = stopVoice; return; }
  const has = userInput.value.trim() || selectedImage || selectedFileContent;
  if (has) { actionBtn.innerHTML = SVG.send; actionBtn.classList.add("is-send"); actionBtn.onclick = sendMsg; }
  else { actionBtn.innerHTML = SVG.voice; actionBtn.onclick = startVoice; }
}
userInput.addEventListener("input", updateBtn);
userInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMsg(); });

// ── Send ──
async function sendMsg() {
  let txt = userInput.value.trim();
  if (!txt && !selectedImage && !selectedFileContent) return;
  promoteDraft();
  const chat = activeChat();
  if (selectedFileContent) { const b = "Attached file: " + selectedFileName + "\n```\n" + selectedFileContent.slice(0, 20000) + "\n```"; txt = txt ? txt + "\n\n" + b : b; }
  let content = selectedImage ? [((txt ? [{ type: "text", text: txt }] : [])), { type: "image_url", image_url: { url: selectedImage } }] : txt;
  if (!chat.messages.length) { const src = userInput.value.trim() || selectedFileName || "Image"; chat.title = src.length > 30 ? src.slice(0, 30) + "..." : src; if (!isTemporary) renderChatList(); }
  addChatBubble(content, "user-message"); chat.messages.push({ role: "user", content });
  if (!isTemporary) saveChats(); updateHeader();
  userInput.value = ""; clearPrev();
  isWaiting = true; setDis(true); updateBtn(); showTyping();
  if (voiceOn) orbState("thinking");
  abortCtrl = new AbortController();
  try {
    const res = await fetch("/.netlify/functions/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: chat.messages, voiceMode: voiceOn, deepThinking: appSettings.deepThinking, deepSearch: appSettings.deepSearch, customInstructions: "", toolsEnabled: appSettings.toolsEnabled }), signal: abortCtrl.signal });
    if (!res.ok) { const d = await res.json(); errBubble(res.status, d); removeTyping(); done(); return; }
    const data = await res.json(); const reply = data.choices[0].message.content;
    removeTyping(); addChatBubble(reply, "bot-message"); chat.messages.push({ role: "assistant", content: reply });
    if (!isTemporary) saveChats(); done();
    if (voiceOn) { orbState("speaking"); await tts(speakable(reply)); if (voiceOn) { orbState("listening"); startRecording(); } }
    else if (autoSpeak) { tts(speakable(reply)); }
  } catch (e) { removeTyping(); if (e.name === "AbortError") addChatBubble("⏹️ Stopped.", "bot-message"); else { addChatBubble("⚠️ Connection error.", "bot-message"); console.error(e); } done(); }
}
function done() { isWaiting = false; abortCtrl = null; setDis(false); updateBtn(); }
function setDis(v) { userInput.disabled = v; attachBtn.disabled = v; micBtn.disabled = v; }
function errBubble(code, d) { const m = { 401: "⚠️ Invalid API key.", 429: "⚠️ Rate limit exceeded.", 500: "⚠️ OpenAI server error.", 503: "⚠️ OpenAI server error." }; addChatBubble(m[code] || "⚠️ Something went wrong.", "bot-message"); }

// ── Render Bubble ──
function addChatBubble(content, cls) {
  const div = document.createElement("div"); div.className = "message " + cls;
  if (Array.isArray(content)) {
    content.forEach(p => {
      if (p.type === "text") { const t = document.createElement("div"); t.innerHTML = cls === "bot-message" ? marked.parse(p.text) : esc(p.text); div.appendChild(t); }
      else if (p.type === "image_url") { const img = document.createElement("img"); img.src = p.image_url.url; img.className = "message-image"; div.appendChild(img); }
    });
  } else if (cls === "bot-message") {
    const im = typeof content === "string" ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/) : null;
    if (im) {
      const img = document.createElement("img"); img.src = "data:image/png;base64," + im[1]; img.className = "message-image"; div.appendChild(img);
      if (im[2].trim()) { const c = document.createElement("div"); c.textContent = im[2].trim(); div.appendChild(c); }
      const acts = document.createElement("div"); acts.className = "message-actions"; const db = document.createElement("button"); db.className = "msg-action-btn"; db.innerHTML = SVG.dl; db.addEventListener("click", () => dlImage(im[1])); acts.appendChild(db); div.appendChild(acts);
    } else {
      div.innerHTML = marked.parse(content);
      const acts = document.createElement("div"); acts.className = "message-actions"; const pb = document.createElement("button"); pb.className = "msg-action-btn"; pb.innerHTML = SVG.pdf; pb.addEventListener("click", () => dlPDF(content)); acts.appendChild(pb); div.appendChild(acts);
    }
  } else { div.textContent = content; }
  chatMessages.appendChild(div); chatMessages.scrollTop = chatMessages.scrollHeight;
}
function showTyping() { const d = document.createElement("div"); d.className = "message bot-message typing-indicator"; d.id = "typingDot"; d.innerHTML = "<span></span><span></span><span></span>"; chatMessages.appendChild(d); chatMessages.scrollTop = chatMessages.scrollHeight; }
function removeTyping() { const d = document.getElementById("typingDot"); if (d) d.remove(); }

// ── Sidebar ──
menuToggle.addEventListener("click", () => { sidebar.classList.toggle("open"); sidebarOverlay.classList.toggle("active"); });
sidebarOverlay.addEventListener("click", closeSidebar);
sidebarCloseBtn.addEventListener("click", closeSidebar);
function closeSidebar() { sidebar.classList.remove("open"); sidebarOverlay.classList.remove("active"); }

// ── Voice ──
closeVoiceOverlayBtn.addEventListener("click", stopVoice);
async function startVoice() { if (!navigator.mediaDevices) { addChatBubble("⚠️ Microphone not available.", "bot-message"); return; } voiceOn = true; voiceOverlay.classList.add("show"); orbState("listening"); updateBtn(); await startRecording(); }
function stopVoice() { voiceOn = false; voiceOverlay.classList.remove("show"); if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); cleanAudio(); if (currentPlayer) { currentPlayer.pause(); currentPlayer = null; } if (abortCtrl) abortCtrl.abort(); updateBtn(); }
function orbState(s) { voiceOrb.classList.remove("thinking", "speaking"); if (s === "thinking") { voiceOrb.classList.add("thinking"); voiceStatusText.textContent = "Thinking..."; } else if (s === "speaking") { voiceOrb.classList.add("speaking"); voiceStatusText.textContent = "Speaking..."; } else { voiceStatusText.textContent = "Listening..."; } }
async function startRecording() {
  try { mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { addChatBubble("⚠️ Microphone access denied.", "bot-message"); stopVoice(); return; }
  audioChunks = []; spokenAbove = false; mediaRecorder = new MediaRecorder(mediaStream);
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => { cleanAudio(); if (!voiceOn) return; const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType }); if (blob.size > 1000) processAudio(blob); else startRecording(); };
  mediaRecorder.start(); orbState("listening"); watchSilence();
  maxTimer = setTimeout(() => { if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); }, 15000);
}
function watchSilence() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)(); const src = audioCtx.createMediaStreamSource(mediaStream); analyserNode = audioCtx.createAnalyser(); analyserNode.fftSize = 512; src.connect(analyserNode);
  const arr = new Uint8Array(analyserNode.frequencyBinCount); let silStart = null;
  function chk() { if (!mediaRecorder || mediaRecorder.state !== "recording") return; analyserNode.getByteFrequencyData(arr); const avg = arr.reduce((a, b) => a + b, 0) / arr.length; if (avg > 12) { spokenAbove = true; silStart = null; } else if (spokenAbove) { if (!silStart) silStart = Date.now(); if (Date.now() - silStart > 1200) { mediaRecorder.stop(); return; } } requestAnimationFrame(chk); }
  requestAnimationFrame(chk);
}
function cleanAudio() { if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; } if (audioCtx) { audioCtx.close(); audioCtx = null; } if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; } }
async function processAudio(blob) {
  orbState("thinking"); const b64 = await blobTo64(blob);
  try { const res = await fetch("/.netlify/functions/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioBase64: b64, mimeType: blob.type }) }); if (!res.ok) throw new Error("fail"); const d = await res.json(); const txt = (d.text || "").trim(); if (!txt) { if (voiceOn) startRecording(); return; } userInput.value = txt; sendMsg(); } catch (e) { if (voiceOn) { addChatBubble("⚠️ Couldn't understand. Try again.", "bot-message"); startRecording(); } }
}
const blobTo64 = blob => new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result.split(",")[1]); fr.readAsDataURL(blob); });
async function tts(text) { return new Promise(async r => { try { const res = await fetch("/.netlify/functions/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: stripMd(text), voice: chatVoice() }) }); if (!res.ok) { r(); return; } const d = await res.json(); const au = new Audio("data:audio/mp3;base64," + d.audioBase64); currentPlayer = au; au.onended = () => { currentPlayer = null; r(); }; au.onerror = () => { currentPlayer = null; r(); }; au.play(); } catch (e) { r(); } }); }
const speakable = t => { const m = t.match(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?([\s\S]*)$/); return m ? (m[1] || "Here's the image.") : t; };
const stripMd = t => t.replace(/```[\s\S]*?```/g, "").replace(/[*_`#>~-]/g, "").replace(/\n+/g, ". ");

function dlPDF(text) { const doc = new jspdf.jsPDF(); const plain = text.replace(/```([\s\S]*?)```/g, (_, c) => c.trim()).replace(/^#{1,6}\s*/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`([^`]*)`/g, "$1").replace(/^[-*]\s+/gm, "• ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); const lines = doc.splitTextToSize(plain, 180); doc.setFontSize(11); let y = 20; lines.forEach(l => { if (y > doc.internal.pageSize.height - 15) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += 7; }); doc.save("Fexer-AI.pdf"); }
function dlImage(b64) { const a = document.createElement("a"); a.href = "data:image/png;base64," + b64; a.download = "Fexer-AI-Image.png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }


// ════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════

document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("view-" + tab.dataset.view).classList.add("active");
    if (tab.dataset.view === "agents") renderAgentList();
  });
});


// ════════════════════════════════════════════
//  AGENTS SECTION
// ════════════════════════════════════════════

let agents = [];
let currentAgentId = null;
let currentPlan = null;

const agentsList = document.getElementById("agentsList");
const agentsMain = document.getElementById("agentsMain");
const agentPromptInput = document.getElementById("agentPromptInput");
const agentSubmitBtn = document.getElementById("agentSubmitBtn");
const newAgentBtn = document.getElementById("newAgentBtn");
const planAgentName = document.getElementById("planAgentName");
const planDescription = document.getElementById("planDescription");
const planSteps = document.getElementById("planSteps");
const planNodes = document.getElementById("planNodes");
const credentialsSection = document.getElementById("credentialsSection");
const credentialsList = document.getElementById("credentialsList");
const backToWelcomeBtn = document.getElementById("backToWelcomeBtn");
const deployAgentBtn = document.getElementById("deployAgentBtn");
const planningSteps = document.getElementById("planningSteps");
const dashAgentName = document.getElementById("dashAgentName");
const dashAgentDesc = document.getElementById("dashAgentDesc");
const dashStatus = document.getElementById("dashStatus");
const dashN8nLink = document.getElementById("dashN8nLink");
const dashRefreshBtn = document.getElementById("dashRefreshBtn");
const dashDeleteBtn = document.getElementById("dashDeleteBtn");
const executionsList = document.getElementById("executionsList");
const statTotal = document.getElementById("statTotal");
const statSuccess = document.getElementById("statSuccess");
const statFailed = document.getElementById("statFailed");
const statLast = document.getElementById("statLast");

// ── Storage ──
function saveAgents() { try { localStorage.setItem("fexerAgents", JSON.stringify(agents)); } catch (e) { } }
function loadAgents() { const s = localStorage.getItem("fexerAgents"); if (s) agents = JSON.parse(s); renderAgentList(); }

// ── State Switching ──
function showAgentState(name) {
  document.querySelectorAll(".agent-state").forEach(s => s.classList.remove("active"));
  document.getElementById("state-" + name).classList.add("active");
}

// ── Render Agent List ──
function renderAgentList() {
  if (!agents.length) {
    agentsList.innerHTML = `<div class="agents-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><p>No agents yet</p><span>Create your first AI agent</span></div>`;
    return;
  }
  agentsList.innerHTML = "";
  agents.forEach(agent => {
    const item = document.createElement("div");
    item.className = "agent-list-item" + (agent.id === currentAgentId ? " active" : "");
    item.innerHTML = `
      <div class="agent-list-icon">${SVG.bolt}</div>
      <div class="agent-list-info">
        <div class="agent-list-name">${esc(agent.name)}</div>
        <div class="agent-list-status ${agent.active ? 'active' : ''}">${agent.active ? '🟢 Active' : '⚪ Inactive'}</div>
      </div>
      <button class="agent-list-del" title="Delete">${SVG.trash}</button>
    `;
    item.querySelector(".agent-list-del").addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Delete this agent?")) {
        agents = agents.filter(a => a.id !== agent.id);
        saveAgents();
        if (currentAgentId === agent.id) { currentAgentId = null; showAgentState("welcome"); }
        renderAgentList();
      }
    });
    item.addEventListener("click", e => {
      if (e.target.closest(".agent-list-del")) return;
      currentAgentId = agent.id;
      renderAgentList();
      showAgentDashboard(agent);
    });
    agentsList.appendChild(item);
  });
}

// ── Welcome: example chips ──
document.querySelectorAll(".example-chip").forEach(chip => {
  chip.addEventListener("click", () => { agentPromptInput.value = chip.dataset.prompt; agentPromptInput.focus(); });
});

newAgentBtn.addEventListener("click", () => { currentAgentId = null; renderAgentList(); showAgentState("welcome"); });

// ── Submit Prompt → Plan ──
agentSubmitBtn.addEventListener("click", buildAgent);
agentPromptInput.addEventListener("keypress", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); buildAgent(); } });

async function buildAgent() {
  const prompt = agentPromptInput.value.trim();
  if (!prompt) return;

  agentSubmitBtn.disabled = true;
  showAgentState("planning");

  // Animate planning steps
  const steps = planningSteps.querySelectorAll(".plan-step");
  let si = 0;
  const stepTimer = setInterval(() => {
    if (si > 0) { steps[si - 1].classList.remove("active"); steps[si - 1].classList.add("done"); }
    if (si < steps.length) { steps[si].classList.add("active"); si++; }
    else { clearInterval(stepTimer); }
  }, 700);

  try {
    const res = await fetch("/.netlify/functions/agent-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    clearInterval(stepTimer);
    steps.forEach(s => { s.classList.remove("active"); s.classList.add("done"); });

    if (!res.ok || !data.plan) throw new Error(data.error || "Planning failed");

    currentPlan = { prompt, ...data.plan };
    agentSubmitBtn.disabled = false;
    showPlanAndCredentials(data.plan);

  } catch (e) {
    clearInterval(stepTimer);
    agentSubmitBtn.disabled = false;
    showAgentState("welcome");
    alert("❌ Planning failed: " + e.message);
  }
}

function showPlanAndCredentials(plan) {
  planAgentName.textContent = plan.agentName || "Your Agent";
  planDescription.textContent = plan.description || "";

  planSteps.innerHTML = (plan.steps || []).map(s => `<li>${esc(s)}</li>`).join("");
  planNodes.innerHTML = (plan.n8nNodes || []).map(n => `<span class="plan-tag">${esc(n)}</span>`).join("");

  // Build credential inputs
  credentialsList.innerHTML = "";
  const needsCreds = (plan.services || []).filter(s => s.credentialType !== "none");

  if (!needsCreds.length) {
    credentialsSection.style.display = "none";
  } else {
    credentialsSection.style.display = "block";
    needsCreds.forEach(svc => {
      const item = document.createElement("div");
      item.className = "cred-item";
      item.innerHTML = `
        <div class="cred-item-header">
          <div class="cred-service-icon">🔌</div>
          <div>
            <div class="cred-service-name">${esc(svc.name)}</div>
            <div class="cred-reason">${esc(svc.reason || "")}</div>
          </div>
        </div>
        <div class="cred-input-row">
          <input type="password" class="cred-input" placeholder="${esc(svc.credentialLabel || svc.name + ' Key')}" data-key="${esc(svc.credentialKey)}">
          ${svc.getUrl ? `<a href="${esc(svc.getUrl)}" target="_blank" class="cred-get-btn">Get Key →</a>` : ""}
        </div>
      `;
      credentialsList.appendChild(item);
    });
  }

  showAgentState("credentials");
}

// ── Back Button ──
backToWelcomeBtn.addEventListener("click", () => showAgentState("welcome"));

// ── Deploy Agent ──
deployAgentBtn.addEventListener("click", async () => {
  if (!currentPlan) return;

  // Collect credentials
  const credentials = {};
  credentialsList.querySelectorAll(".cred-input").forEach(input => {
    if (input.value.trim()) credentials[input.dataset.key] = input.value.trim();
  });

  deployAgentBtn.disabled = true;
  showAgentState("deploying");
  animateDeploySteps();

  try {
    const res = await fetch("/.netlify/functions/agent-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: currentPlan.prompt, plan: currentPlan, credentials })
    });
    const data = await res.json();

    deployAgentBtn.disabled = false;

    if (!res.ok || !data.success) throw new Error(data.error || "Deploy failed");

    // Save agent locally
    const agent = {
      id: "agent_" + Date.now(),
      name: currentPlan.agentName,
      description: currentPlan.description,
      workflowId: data.workflowId,
      workflowUrl: data.workflowUrl,
      active: true,
      createdAt: new Date().toISOString(),
      prompt: currentPlan.prompt
    };
    agents.unshift(agent);
    saveAgents();
    currentAgentId = agent.id;
    renderAgentList();
    showAgentDashboard(agent);

  } catch (e) {
    deployAgentBtn.disabled = false;
    showAgentState("credentials");
    alert("❌ Deploy failed: " + e.message + "\n\nMake sure N8N_URL and N8N_API_KEY are set in Netlify environment variables.");
  }
});

function animateDeploySteps() {
  const steps = ["dstep-1", "dstep-2", "dstep-3", "dstep-4"];
  let i = 0;
  const t = setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById(steps[i - 1]);
      if (prev) prev.querySelector(".dstep-icon").textContent = "✅";
    }
    if (i < steps.length) {
      const cur = document.getElementById(steps[i]);
      if (cur) { cur.querySelector(".dstep-icon").textContent = "⏳"; cur.querySelector(".dstep-icon").classList.remove("pending"); }
      i++;
    } else { clearInterval(t); }
  }, 1200);
}

// ── Dashboard ──
function showAgentDashboard(agent) {
  dashAgentName.textContent = agent.name;
  dashAgentDesc.textContent = agent.description || agent.prompt || "";
  dashStatus.textContent = agent.active ? "🟢 Active" : "⚪ Inactive";
  dashStatus.className = "status-badge " + (agent.active ? "active-badge" : "inactive-badge");
  dashN8nLink.href = agent.workflowUrl || "#";
  showAgentState("running");
  loadExecutions(agent);
}

async function loadExecutions(agent) {
  if (!agent.workflowId) return;
  try {
    const res = await fetch("/.netlify/functions/agent-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: agent.workflowId }) });
    if (!res.ok) return;
    const data = await res.json();

    const execs = data.executions || [];
    statTotal.textContent = execs.length;
    statSuccess.textContent = execs.filter(e => e.status === "success").length;
    statFailed.textContent = execs.filter(e => e.status === "error").length;
    statLast.textContent = execs.length ? timeAgo(execs[0].startedAt) : "—";

    if (!execs.length) { executionsList.innerHTML = `<p class="exec-empty">No executions yet. The agent will run based on its trigger.</p>`; return; }

    executionsList.innerHTML = execs.map(e => `
      <div class="exec-row">
        <div class="exec-status">
          <div class="exec-dot ${e.status === 'success' ? 'success' : e.status === 'running' ? 'running' : 'error'}"></div>
          <span class="exec-label">${e.status === 'success' ? '✓ Success' : e.status === 'running' ? '↻ Running' : '✗ Failed'}</span>
        </div>
        <span class="exec-time">${timeAgo(e.startedAt)}</span>
      </div>
    `).join("");

  } catch (e) { console.error("Status fetch failed:", e); }
}

dashRefreshBtn.addEventListener("click", () => {
  const agent = agents.find(a => a.id === currentAgentId);
  if (agent) loadExecutions(agent);
});

dashDeleteBtn.addEventListener("click", () => {
  const agent = agents.find(a => a.id === currentAgentId);
  if (!agent) return;
  if (!confirm("Delete agent '" + agent.name + "'?")) return;
  agents = agents.filter(a => a.id !== currentAgentId);
  saveAgents(); currentAgentId = null; renderAgentList(); showAgentState("welcome");
});

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}


// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
loadChats();
loadSettings();
loadAgents();
updateBtn();
updateHeader();