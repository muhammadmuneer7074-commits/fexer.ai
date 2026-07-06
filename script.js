// ============================================================
// FEXER AI - MAIN APP LOGIC
// ============================================================

const SUPABASE_URL = "https://fiwukodsrhibrbhmoqgp.supabase.co/rest/v1/"; // placeholder
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3Vrb2RzcmhpYnJiaG1vcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODU1MDQsImV4cCI6MjA5ODc2MTUwNH0.elrA9MQLI0bZVi0jF3qsUTdb-n-60v0YzEx5zsv3xoI"; // placeholder

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentSession = null;
let currentChatId = null;
let chatMessages = []; // { role, content, id, createdAt }
let attachments = []; // { name, type, dataUrl }
let mediaRecorder = null;
let recordedChunks = [];
let voiceActive = false;
let silenceTimer = null;

// ------------------------------------------------------------
// AUTH GUARD
// ------------------------------------------------------------
(async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "/auth.html";
    return;
  }
  currentSession = data.session;
  currentUser = data.session.user;
  document.getElementById("user-email").textContent = currentUser.email;
  document.getElementById("user-avatar").textContent = (currentUser.email || "U")[0].toUpperCase();

  await loadCredits();
  await loadChatList();
  await loadAgentList();
})();

supabase.auth.onAuthStateChange((event, session) => {
  currentSession = session;
  if (!session) window.location.href = "/auth.html";
});

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${currentSession?.access_token}`,
  };
}

// ------------------------------------------------------------
// SIDEBAR: collapse / mobile toggle
// ------------------------------------------------------------
document.getElementById("collapse-sidebar-btn").onclick = () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
};

["open-sidebar-btn", "open-sidebar-btn-2"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.onclick = () => document.getElementById("sidebar").classList.toggle("mobile-open");
});

// ------------------------------------------------------------
// SIDEBAR TABS (Chats / Agents)
// ------------------------------------------------------------
document.querySelectorAll(".sidebar-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".sidebar-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;
    document.getElementById("chat-list-section").classList.toggle("hidden", target !== "chat");
    document.getElementById("agent-list-section").classList.toggle("hidden", target !== "agents");

    document.getElementById("chat-view").classList.toggle("active", target === "chat");
    document.getElementById("agents-view").classList.toggle("active", target === "agents");
  };
});

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = "/auth.html";
};

// ------------------------------------------------------------
// CREDITS
// ------------------------------------------------------------
async function loadCredits() {
  try {
    const res = await fetch("/.netlify/functions/credits-get", { headers: authHeaders() });
    const data = await res.json();

    const fill = document.getElementById("credits-fill");
    const text = document.getElementById("credits-text");

    if (data.limit === "unlimited") {
      fill.style.width = "100%";
      text.textContent = "Unlimited";
    } else {
      const pct = Math.min(100, (data.used / data.limit) * 100);
      fill.style.width = `${pct}%`;
      text.textContent = `${data.used} / ${data.limit} used`;
    }
  } catch (err) {
    console.error("Failed to load credits:", err);
  }
}

async function useCredit() {
  try {
    const res = await fetch("/.netlify/functions/credits-use", { method: "POST", headers: authHeaders() });
    const data = await res.json();

    if (!res.ok || !data.allowed) {
      openUpgradeModal();
      return false;
    }

    loadCredits();
    return true;
  } catch (err) {
    console.error("Credit check failed:", err);
    return false;
  }
}

// ------------------------------------------------------------
// CHAT LIST (sidebar)
// ------------------------------------------------------------
async function loadChatList() {
  try {
    const { data: chats, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("is_draft", false)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const starred = chats.filter(c => c.is_starred);
    const recent = chats.filter(c => !c.is_starred);

    renderChatList("starred-chats", starred);
    renderChatList("recent-chats", recent);
  } catch (err) {
    console.error("Failed to load chats:", err);
  }
}

function renderChatList(containerId, chats) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-list-item" + (chat.id === currentChatId ? " active" : "");
    item.innerHTML = `
      <span class="title">${escapeHtml(chat.title)}</span>
      <div class="item-actions">
        <button class="star-item-btn" title="${chat.is_starred ? "Unstar" : "Star"}">${chat.is_starred ? "★" : "☆"}</button>
        <button class="rename-item-btn" title="Rename">✎</button>
        <button class="delete-item-btn" title="Delete">🗑</button>
      </div>
    `;

    item.querySelector(".title").onclick = () => openChat(chat.id, chat.title);
    item.querySelector(".star-item-btn").onclick = (e) => { e.stopPropagation(); toggleStarChat(chat.id, !chat.is_starred); };
    item.querySelector(".rename-item-btn").onclick = (e) => { e.stopPropagation(); renameChat(chat.id, chat.title); };
    item.querySelector(".delete-item-btn").onclick = (e) => { e.stopPropagation(); deleteChat(chat.id); };

    container.appendChild(item);
  });
}

async function toggleStarChat(chatId, starred) {
  await supabase.from("chats").update({ is_starred: starred }).eq("id", chatId);
  loadChatList();
}

async function renameChat(chatId, oldTitle) {
  const newTitle = prompt("Rename chat:", oldTitle);
  if (!newTitle || newTitle.trim() === "") return;
  await supabase.from("chats").update({ title: newTitle.trim() }).eq("id", chatId);
  loadChatList();
  if (chatId === currentChatId) document.getElementById("chat-title").textContent = newTitle.trim();
}

async function deleteChat(chatId) {
  if (!confirm("Delete this chat permanently?")) return;
  await supabase.from("chats").delete().eq("id", chatId);
  if (chatId === currentChatId) startNewChat();
  loadChatList();
}

async function openChat(chatId, title) {
  currentChatId = chatId;
  document.getElementById("chat-title").textContent = title;
  document.getElementById("sidebar").classList.remove("mobile-open");

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return;
  }

  chatMessages = messages.map(m => ({ role: m.role, content: m.content, id: m.id, createdAt: m.created_at }));
  renderAllMessages();
  loadChatList();

  const { data: chat } = await supabase.from("chats").select("is_starred").eq("id", chatId).single();
  document.getElementById("star-chat-btn").textContent = chat?.is_starred ? "★" : "☆";
}

// ------------------------------------------------------------
// NEW CHAT (draft/ghost until first message sent)
// ------------------------------------------------------------
document.getElementById("new-chat-btn").onclick = startNewChat;

function startNewChat() {
  currentChatId = null;
  chatMessages = [];
  attachments = [];
  document.getElementById("chat-title").textContent = "New Chat";
  document.getElementById("star-chat-btn").textContent = "☆";
  renderAttachmentPreview();
  renderAllMessages();
}

// ------------------------------------------------------------
// STAR CURRENT CHAT
// ------------------------------------------------------------
document.getElementById("star-chat-btn").onclick = async () => {
  if (!currentChatId) return;
  const btn = document.getElementById("star-chat-btn");
  const isStarred = btn.textContent === "★";
  await toggleStarChat(currentChatId, !isStarred);
  btn.textContent = !isStarred ? "★" : "☆";
};

// ------------------------------------------------------------
// MESSAGE RENDERING
// ------------------------------------------------------------
function renderAllMessages() {
  const container = document.getElementById("messages");
  container.innerHTML = "";

  if (chatMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-state" id="empty-state">
        <div class="empty-orb"></div>
        <h2>What can I help with, Muhammad?</h2>
        <p>Ask anything, generate images, search the web, or talk with voice.</p>
      </div>`;
    return;
  }

  chatMessages.forEach(msg => appendMessageToDOM(msg.role, msg.content, msg.id, msg.createdAt));
  container.scrollTop = container.scrollHeight;
}

function formatTimestamp(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Renders markdown -> HTML (headings, bold, italics, inline code, code blocks, lists, links)
function formatMessageContent(content) {
  const codeBlocks = [];

  // Extract fenced code blocks first so their content isn't mangled by other regexes
  let working = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "plaintext", code: code.replace(/\n$/, "") });
    return `%%CODEBLOCK_${idx}%%`;
  });

  let html = escapeHtml(working);

  // Headings
  html = html.replace(/^### (.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^## (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^# (.*$)/gim, "<h2>$1</h2>");

  // Bold, italics, inline code
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Unordered lists (simple line-based)
  html = html.replace(/(^|\n)- (.*)/g, "$1<li>$2</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match.replace(/\n/g, "")}</ul>`);

  html = html.replace(/\n/g, "<br>");

  // Re-insert code blocks as syntax-highlighted <pre><code> with a header/copy button
  codeBlocks.forEach((block, idx) => {
    const escapedCode = escapeHtml(block.code);
    const blockHtml = `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>${escapeHtml(block.lang)}</span>
          <button class="code-copy-btn" data-code-idx="${idx}">Copy</button>
        </div>
        <pre><code class="language-${escapeHtml(block.lang)}">${escapedCode}</code></pre>
      </div>`;
    html = html.replace(`%%CODEBLOCK_${idx}%%`, blockHtml);
  });

  return { html, codeBlocks };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function appendMessageToDOM(role, content, messageId, createdAt) {
  const container = document.getElementById("messages");
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.remove();

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${role}`;
  wrapper.dataset.messageId = messageId || "";
  wrapper.dataset.rawContent = content;

  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  const { html, codeBlocks } = formatMessageContent(content);
  bubble.innerHTML = html;
  bubble._codeBlocks = codeBlocks;

  const actionsRow = document.createElement("div");
  actionsRow.className = "message-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "message-action-btn";
  copyBtn.textContent = "Copy";
  copyBtn.onclick = () => copyToClipboard(content, copyBtn);
  actionsRow.appendChild(copyBtn);

  if (role === "user") {
    const editBtn = document.createElement("button");
    editBtn.className = "message-action-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => enterEditMode(wrapper, bubble, content, messageId);
    actionsRow.appendChild(editBtn);
  }

  if (role === "assistant") {
    const regenBtn = document.createElement("button");
    regenBtn.className = "message-action-btn";
    regenBtn.textContent = "↻ Regenerate";
    regenBtn.onclick = () => regenerateResponse(wrapper);
    actionsRow.appendChild(regenBtn);
  }

  const timestamp = document.createElement("div");
  timestamp.className = "message-timestamp";
  timestamp.textContent = formatTimestamp(createdAt);

  wrapper.appendChild(bubble);
  wrapper.appendChild(actionsRow);
  if (createdAt) wrapper.appendChild(timestamp);

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;

  highlightCodeBlocks(bubble);
  wireCodeCopyButtons(bubble, codeBlocks);

  return wrapper;
}

function highlightCodeBlocks(bubble) {
  if (!window.hljs) return;
  bubble.querySelectorAll("pre code").forEach(block => {
    try { window.hljs.highlightElement(block); } catch (e) { /* ignore unknown language */ }
  });
}

function wireCodeCopyButtons(bubble, codeBlocks) {
  bubble.querySelectorAll(".code-copy-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.codeIdx, 10);
      const code = codeBlocks[idx]?.code || "";
      copyToClipboard(code, btn, "Copy");
    };
  });
}

function copyToClipboard(text, btn, resetLabel) {
  navigator.clipboard.writeText(text).then(() => {
    const original = resetLabel || btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, 1500);
  }).catch(() => {
    alert("Couldn't copy — please copy manually.");
  });
}

// ------------------------------------------------------------
// EDIT MESSAGE
// ------------------------------------------------------------
function enterEditMode(wrapper, bubble, originalContent, messageId) {
  const textarea = document.createElement("textarea");
  textarea.className = "message-edit-textarea";
  textarea.value = originalContent;
  textarea.rows = Math.min(8, Math.max(2, originalContent.split("\n").length));

  const actions = document.createElement("div");
  actions.className = "message-edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "message-edit-save";
  saveBtn.textContent = "Save & Submit";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "message-edit-cancel";
  cancelBtn.textContent = "Cancel";

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);

  const existingActionsRow = wrapper.querySelector(".message-actions");
  bubble.style.display = "none";
  wrapper.insertBefore(textarea, bubble);
  wrapper.insertBefore(actions, existingActionsRow);

  textarea.focus();

  cancelBtn.onclick = () => {
    textarea.remove();
    actions.remove();
    bubble.style.display = "";
  };

  saveBtn.onclick = async () => {
    const newText = textarea.value.trim();
    if (!newText) return;

    const msgIndex = chatMessages.findIndex(m => m.id === messageId);
    const truncateAt = msgIndex >= 0 ? msgIndex : chatMessages.length - 1;
    chatMessages = chatMessages.slice(0, truncateAt);

    let node = wrapper;
    const toRemove = [];
    while (node) {
      toRemove.push(node);
      node = node.nextElementSibling;
    }
    toRemove.forEach(n => n.remove());

    await sendMessage(newText, messageId);
  };
}

// ------------------------------------------------------------
// REGENERATE RESPONSE
// ------------------------------------------------------------
async function regenerateResponse(assistantWrapper) {
  const assistantMessageId = assistantWrapper.dataset.messageId;

  const msgIndex = chatMessages.findIndex(m => m.id === assistantMessageId);
  if (msgIndex < 1) return;

  const userMsg = chatMessages[msgIndex - 1];
  chatMessages = chatMessages.slice(0, msgIndex - 1);

  const userWrapper = document.querySelector(`[data-message-id="${userMsg.id}"]`) ||
    assistantWrapper.previousElementSibling;

  let node = userWrapper;
  const toRemove = [];
  while (node) {
    toRemove.push(node);
    node = node.nextElementSibling;
  }
  toRemove.forEach(n => n.remove());

  await sendMessage(userMsg.content, userMsg.id);
}

// ------------------------------------------------------------
// SENDING MESSAGES
// ------------------------------------------------------------
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.onclick = () => sendMessage();

let webSearchEnabled = false;
document.getElementById("websearch-toggle").onclick = () => {
  webSearchEnabled = !webSearchEnabled;
  document.getElementById("websearch-toggle").classList.toggle("active", webSearchEnabled);
};

// overrideText/replaceFromMessageId are used for Edit and Regenerate flows.
// When absent, the function reads from the input box as usual (normal send).
async function sendMessage(overrideText, replaceFromMessageId) {
  const text = overrideText !== undefined ? overrideText : chatInput.value.trim();
  if (!text && attachments.length === 0) return;

  const allowed = await useCredit();
  if (!allowed) return;

  // Ensure a chat exists (create on first real message = "ghost chat" becomes real)
  if (!currentChatId) {
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({ user_id: currentUser.id, title: text.slice(0, 40) || "New Chat", is_draft: false })
      .select()
      .single();

    if (error) {
      console.error("Failed to create chat:", error);
      return;
    }
    currentChatId = newChat.id;
    document.getElementById("chat-title").textContent = newChat.title;
    loadChatList();
  }

  const userContent = text;
  chatMessages.push({ role: "user", content: userContent });
  appendMessageToDOM("user", userContent, null, new Date().toISOString());

  if (overrideText === undefined) {
    chatInput.value = "";
    chatInput.style.height = "auto";
  }
  const sentAttachments = [...attachments];
  attachments = [];
  renderAttachmentPreview();

  // Loading indicator (AI thinking)
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message assistant message-loading";
  loadingDiv.innerHTML = "<span></span><span></span><span></span>";
  document.getElementById("messages").appendChild(loadingDiv);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;

  try {
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        messages: chatMessages,
        chatId: currentChatId,
        webSearch: webSearchEnabled,
        attachments: sentAttachments,
        replaceFromMessageId: replaceFromMessageId || undefined,
      }),
    });

    const data = await res.json();
    loadingDiv.remove();

    if (!res.ok) {
      appendMessageToDOM("assistant", `⚠️ ${data.error || "Something went wrong."}`);
      return;
    }

    // Attach real DB ids to the last pushed messages, if returned
    if (data.userMessageId) {
      chatMessages[chatMessages.length - 1].id = data.userMessageId;
      const userWrapper = document.querySelector(".message-wrapper.user:last-of-type");
      if (userWrapper) userWrapper.dataset.messageId = data.userMessageId;
    }

    chatMessages.push({ role: "assistant", content: data.reply, id: data.assistantMessageId });
    await streamAssistantMessage(data.reply, data.assistantMessageId);
  } catch (err) {
    loadingDiv.remove();
    appendMessageToDOM("assistant", "⚠️ Network error. Please try again.");
    console.error(err);
  }
}

// Simulated "typing" stream: the full reply already arrived from the API,
// but we reveal it progressively so it feels like ChatGPT-style streaming.
async function streamAssistantMessage(fullText, messageId) {
  const container = document.getElementById("messages");
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper assistant";
  wrapper.dataset.messageId = messageId || "";
  wrapper.dataset.rawContent = fullText;

  const bubble = document.createElement("div");
  bubble.className = "message assistant";
  bubble.innerHTML = '<span class="streaming-cursor"></span>';

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;

  const chunkSize = 3; // characters per tick — tune for speed
  let shown = "";

  for (let i = 0; i < fullText.length; i += chunkSize) {
    shown += fullText.slice(i, i + chunkSize);
    const { html } = formatMessageContent(shown);
    bubble.innerHTML = html + '<span class="streaming-cursor"></span>';
    container.scrollTop = container.scrollHeight;
    await new Promise(r => setTimeout(r, 12));
  }

  // Final render with full formatting, actions, timestamp, and highlighting
  const { html, codeBlocks } = formatMessageContent(fullText);
  bubble.innerHTML = html;

  const actionsRow = document.createElement("div");
  actionsRow.className = "message-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "message-action-btn";
  copyBtn.textContent = "Copy";
  copyBtn.onclick = () => copyToClipboard(fullText, copyBtn);
  actionsRow.appendChild(copyBtn);

  const regenBtn = document.createElement("button");
  regenBtn.className = "message-action-btn";
  regenBtn.textContent = "↻ Regenerate";
  regenBtn.onclick = () => regenerateResponse(wrapper);
  actionsRow.appendChild(regenBtn);

  const timestamp = document.createElement("div");
  timestamp.className = "message-timestamp";
  timestamp.textContent = formatTimestamp(new Date().toISOString());

  wrapper.appendChild(actionsRow);
  wrapper.appendChild(timestamp);

  highlightCodeBlocks(bubble);
  wireCodeCopyButtons(bubble, codeBlocks);
}

// ------------------------------------------------------------
// FILE ATTACHMENTS
// ------------------------------------------------------------
document.getElementById("attach-btn").onclick = () => document.getElementById("file-input").click();

document.getElementById("file-input").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    attachments.push({ name: file.name, type: file.type, dataUrl });
  }
  renderAttachmentPreview();
  e.target.value = "";
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAttachmentPreview() {
  const container = document.getElementById("attachment-preview");
  container.innerHTML = "";
  attachments.forEach((att, idx) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    chip.innerHTML = `<span>${escapeHtml(att.name)}</span><button data-idx="${idx}">×</button>`;
    chip.querySelector("button").onclick = () => {
      attachments.splice(idx, 1);
      renderAttachmentPreview();
    };
    container.appendChild(chip);
  });
}

// ------------------------------------------------------------
// CAMERA CAPTURE
// ------------------------------------------------------------
const cameraModal = document.getElementById("camera-modal");
const cameraVideo = document.getElementById("camera-video");
let cameraStream = null;

document.getElementById("camera-btn").onclick = async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraVideo.srcObject = cameraStream;
    cameraModal.classList.add("show");
  } catch (err) {
    alert("Camera access denied or unavailable.");
  }
};

document.getElementById("close-camera-modal").onclick = closeCameraModal;

function closeCameraModal() {
  cameraModal.classList.remove("show");
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

document.getElementById("capture-photo-btn").onclick = () => {
  const canvas = document.getElementById("camera-canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  attachments.push({ name: "camera-photo.png", type: "image/png", dataUrl });
  renderAttachmentPreview();
  closeCameraModal();
};

// ------------------------------------------------------------
// VOICE CHAT (record -> transcribe -> chat -> speak)
// ------------------------------------------------------------
const voiceOverlay = document.getElementById("voice-overlay");
const voiceStatus = document.getElementById("voice-status");

document.getElementById("voice-btn").onclick = startVoiceChat;
document.getElementById("voice-close-btn").onclick = stopVoiceChat;

async function startVoiceChat() {
  const allowed = await useCredit();
  if (!allowed) return;

  voiceActive = true;
  voiceOverlay.classList.add("show");
  voiceStatus.textContent = "Listening...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
    mediaRecorder.onstop = handleVoiceRecordingStop;

    // Silence detection via Web Audio API
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function checkSilence() {
      if (!voiceActive) return;
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (volume < 8) {
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
          }, 1500);
        }
      } else {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (voiceActive) requestAnimationFrame(checkSilence);
    }

    mediaRecorder.start();
    checkSilence();
  } catch (err) {
    alert("Microphone access denied or unavailable.");
    stopVoiceChat();
  }
}

async function handleVoiceRecordingStop() {
  if (!voiceActive) return;
  voiceStatus.textContent = "Thinking...";

  const blob = new Blob(recordedChunks, { type: "audio/webm" });
  const base64 = await blobToBase64(blob);

  try {
    // Transcribe
    const transcribeRes = await fetch("/.netlify/functions/transcribe", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ audio: base64, mimeType: "audio/webm" }),
    });
    const transcribeData = await transcribeRes.json();

    if (!transcribeRes.ok || !transcribeData.text) {
      voiceStatus.textContent = "Didn't catch that. Listening again...";
      if (voiceActive) restartVoiceRecording();
      return;
    }

    chatMessages.push({ role: "user", content: transcribeData.text });

    // Get AI response
    const chatRes = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: chatMessages, chatId: currentChatId }),
    });
    const chatData = await chatRes.json();

    if (!chatRes.ok) {
      voiceStatus.textContent = "Error getting response.";
      if (voiceActive) restartVoiceRecording();
      return;
    }

    chatMessages.push({ role: "assistant", content: chatData.reply });
    voiceStatus.textContent = "Speaking...";

    // Speak response
    const speakRes = await fetch("/.netlify/functions/speak", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: chatData.reply }),
    });
    const speakData = await speakRes.json();

    if (speakRes.ok && speakData.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${speakData.audio}`);
      audio.onended = () => {
        if (voiceActive) restartVoiceRecording();
      };
      audio.play();
    } else if (voiceActive) {
      restartVoiceRecording();
    }
  } catch (err) {
    console.error("Voice chat error:", err);
    voiceStatus.textContent = "Something went wrong.";
    if (voiceActive) restartVoiceRecording();
  }
}

function restartVoiceRecording() {
  voiceStatus.textContent = "Listening...";
  recordedChunks = [];
  if (mediaRecorder && mediaRecorder.state === "inactive") {
    mediaRecorder.start();
  }
}

function stopVoiceChat() {
  voiceActive = false;
  voiceOverlay.classList.remove("show");
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  if (mediaRecorder) mediaRecorder.stream.getTracks().forEach(t => t.stop());
  clearTimeout(silenceTimer);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ------------------------------------------------------------
// PDF EXPORT
// ------------------------------------------------------------
document.getElementById("export-pdf-btn").onclick = () => {
  if (chatMessages.length === 0) {
    alert("No messages to export.");
    return;
  }

  const printWindow = window.open("", "_blank");
  const title = document.getElementById("chat-title").textContent;
  const bodyHtml = chatMessages
    .map(m => `<p><strong>${m.role === "user" ? "You" : "Fexer AI"}:</strong> ${escapeHtml(m.content).replace(/\n/g, "<br>")}</p>`)
    .join("<hr>");

  printWindow.document.write(`
    <html><head><title>${escapeHtml(title)}</title>
    <style>body{font-family:sans-serif;padding:30px;line-height:1.6;} hr{border:none;border-top:1px solid #ddd;margin:16px 0;}</style>
    </head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

// ------------------------------------------------------------
// UPGRADE MODAL
// ------------------------------------------------------------
const upgradeModal = document.getElementById("upgrade-modal");

document.getElementById("upgrade-btn").onclick = openUpgradeModal;
document.getElementById("close-upgrade-modal").onclick = () => upgradeModal.classList.remove("show");

function openUpgradeModal() {
  upgradeModal.classList.add("show");
}

document.querySelectorAll(".plan-card-option button[data-plan]").forEach(btn => {
  btn.onclick = async () => {
    const plan = btn.dataset.plan;
    btn.disabled = true;
    btn.textContent = "Redirecting...";

    try {
      const res = await fetch("/.netlify/functions/lemonsqueezy-checkout", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout.");
        btn.disabled = false;
        btn.textContent = `Upgrade to ${plan === "pro" ? "Pro" : "Max"}`;
      }
    } catch (err) {
      console.error(err);
      btn.disabled = false;
    }
  };
});

document.getElementById("manage-billing-btn").onclick = async () => {
  try {
    const res = await fetch("/.netlify/functions/lemonsqueezy-portal", {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();

    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "No billing account found yet.");
    }
  } catch (err) {
    console.error(err);
  }
};

// ------------------------------------------------------------
// AGENT BUILDER
// ------------------------------------------------------------
let currentAgentId = null;
let currentAgentPlan = null;

document.getElementById("new-agent-btn").onclick = () => {
  showAgentStep("agent-step-prompt");
  document.getElementById("agent-prompt-input").value = "";
};

function showAgentStep(stepId) {
  document.querySelectorAll(".agent-step").forEach(s => s.classList.remove("active"));
  document.getElementById(stepId).classList.add("active");
}

document.getElementById("agent-plan-btn").onclick = async () => {
  const prompt = document.getElementById("agent-prompt-input").value.trim();
  if (!prompt) return;

  const allowed = await useCredit();
  if (!allowed) return;

  const btn = document.getElementById("agent-plan-btn");
  btn.disabled = true;
  btn.textContent = "Generating plan...";

  try {
    const res = await fetch("/.netlify/functions/agent-plan", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();

    btn.disabled = false;
    btn.textContent = "Generate Plan";

    if (!res.ok) {
      alert(data.error || "Failed to generate plan.");
      return;
    }

    currentAgentId = data.agentId;
    currentAgentPlan = data.plan;
    renderAgentPlan(data.plan);
    showAgentStep("agent-step-plan");
    loadAgentList();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = "Generate Plan";
  }
};

function renderAgentPlan(plan) {
  document.getElementById("agent-plan-name").textContent = plan.name || "Agent Plan";
  document.getElementById("agent-plan-desc").textContent = plan.description || "";

  document.getElementById("agent-plan-trigger").innerHTML =
    `<strong>${escapeHtml(plan.trigger?.type || "manual")}</strong> — ${escapeHtml(plan.trigger?.details || "")}`;

  const stepsContainer = document.getElementById("agent-plan-steps");
  stepsContainer.innerHTML = "";
  (plan.steps || []).forEach(step => {
    const card = document.createElement("div");
    card.className = "plan-card";
    card.innerHTML = `<strong>Step ${step.step}</strong> (${escapeHtml(step.service || "")}): ${escapeHtml(step.action || "")}`;
    stepsContainer.appendChild(card);
  });
}

document.getElementById("agent-back-btn").onclick = () => showAgentStep("agent-step-prompt");

document.getElementById("agent-continue-btn").onclick = () => {
  renderCredentialsForm(currentAgentPlan.required_credentials || []);
  showAgentStep("agent-step-credentials");
};

function renderCredentialsForm(credsNeeded) {
  const container = document.getElementById("agent-credentials-form");
  container.innerHTML = "";

  if (credsNeeded.length === 0) {
    container.innerHTML = `<p style="color:var(--text-secondary);font-size:13px;">No external credentials required for this agent.</p>`;
    return;
  }

  credsNeeded.forEach(cred => {
    const field = document.createElement("div");
    field.className = "credential-field";
    field.innerHTML = `
      <label>${escapeHtml(cred.label)} (${escapeHtml(cred.service)})</label>
      <input type="password" data-key="${escapeHtml(cred.key)}" placeholder="Enter ${escapeHtml(cred.label)}">
    `;
    container.appendChild(field);
  });
}

document.getElementById("agent-deploy-btn").onclick = async () => {
  const inputs = document.querySelectorAll("#agent-credentials-form input");
  const credentials = {};
  inputs.forEach(input => { credentials[input.dataset.key] = input.value; });

  const btn = document.getElementById("agent-deploy-btn");
  btn.disabled = true;
  btn.textContent = "Deploying...";

  try {
    const res = await fetch("/.netlify/functions/agent-deploy", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ agentId: currentAgentId, credentials }),
    });
    const data = await res.json();

    btn.disabled = false;
    btn.textContent = "Deploy Agent";

    if (!res.ok) {
      alert(data.error || "Deployment failed.");
      return;
    }

    document.getElementById("agent-dashboard-link").href = data.dashboardUrl;
    showAgentStep("agent-step-dashboard");
    loadAgentList();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = "Deploy Agent";
  }
};

document.getElementById("agent-done-btn").onclick = () => {
  showAgentStep("agent-step-prompt");
  document.getElementById("agent-prompt-input").value = "";
};

async function loadAgentList() {
  try {
    const res = await fetch("/.netlify/functions/agent-status", { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) return;

    const container = document.getElementById("agent-list");
    container.innerHTML = "";

    (data.agents || []).forEach(agent => {
      const item = document.createElement("div");
      item.className = "chat-list-item";
      item.innerHTML = `<span class="title">${escapeHtml(agent.name)}</span><span style="font-size:11px;color:var(--text-secondary);">${escapeHtml(agent.status)}</span>`;
      item.onclick = () => {
        if (agent.dashboard_url) {
          window.open(agent.dashboard_url, "_blank");
        }
      };
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to load agents:", err);
  }
}

// ------------------------------------------------------------
// LEMON SQUEEZY CHECKOUT SUCCESS HANDLING (from redirect)
// ------------------------------------------------------------
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    setTimeout(() => {
      alert("🎉 Upgrade successful! Your new plan is now active.");
      loadCredits();
    }, 500);
  }
})();