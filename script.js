// ============================================================
// FEXER AI - MAIN APP LOGIC
// ============================================================

const SUPABASE_URL = "https://your-project.supabase.co"; // placeholder
const SUPABASE_ANON_KEY = "placeholder-your-supabase-anon-key"; // placeholder

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentSession = null;
let currentChatId = null;
let chatMessages = []; // { role, content }
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

  chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
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

  chatMessages.forEach(msg => appendMessageToDOM(msg.role, msg.content));
  container.scrollTop = container.scrollHeight;
}

function appendMessageToDOM(role, content) {
  const container = document.getElementById("messages");
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.remove();

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = formatMessageContent(content);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function formatMessageContent(content) {
  let html = escapeHtml(content);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

sendBtn.onclick = sendMessage;

let webSearchEnabled = false;
document.getElementById("websearch-toggle").onclick = () => {
  webSearchEnabled = !webSearchEnabled;
  document.getElementById("websearch-toggle").classList.toggle("active", webSearchEnabled);
};

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text && attachments.length === 0) return;

  const allowed = await useCredit();
  if (!allowed) return;

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
  appendMessageToDOM("user", userContent);

  chatInput.value = "";
  chatInput.style.height = "auto";
  const sentAttachments = [...attachments];
  attachments = [];
  renderAttachmentPreview();

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
      }),
    });

    const data = await res.json();
    loadingDiv.remove();

    if (!res.ok) {
      appendMessageToDOM("assistant", `⚠️ ${data.error || "Something went wrong."}`);
      return;
    }

    chatMessages.push({ role: "assistant", content: data.reply });
    appendMessageToDOM("assistant", data.reply);
  } catch (err) {
    loadingDiv.remove();
    appendMessageToDOM("assistant", "⚠️ Network error. Please try again.");
    console.error(err);
  }
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
      const res = await fetch("/.netlify/functions/stripe-checkout", {
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
    const res = await fetch("/.netlify/functions/stripe-portal", {
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
// STRIPE CHECKOUT SUCCESS/CANCEL HANDLING (from redirect)
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