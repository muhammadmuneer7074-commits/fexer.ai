// ============ SELECT HTML ELEMENTS ============

const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const actionBtn = document.getElementById("actionBtn");
const micBtn = document.getElementById("micBtn");
const attachBtn = document.getElementById("attachBtn");
const attachMenu = document.getElementById("attachMenu");
const choosePhotoBtn = document.getElementById("choosePhotoBtn");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const attachToProjectBtn = document.getElementById("attachToProjectBtn");
const imageInput = document.getElementById("imageInput");
const fileUploadInput = document.getElementById("fileUploadInput");
const imagePreviewArea = document.getElementById("imagePreviewArea");
const chatList = document.getElementById("chatList");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const chatSearchInput = document.getElementById("chatSearchInput");

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

const deepThinkingToggle = document.getElementById("deepThinkingToggle");
const deepSearchToggle = document.getElementById("deepSearchToggle");
const toolsEnabledToggle = document.getElementById("toolsEnabledToggle");
const toolsToggleMenu = document.getElementById("toolsToggleMenu");
const webSearchToggleMenu = document.getElementById("webSearchToggleMenu");
const customInstructionsInput = document.getElementById("customInstructionsInput");

const autoSpeakToggle = document.getElementById("autoSpeakToggle");
const notifyOnCompleteToggle = document.getElementById("notifyOnCompleteToggle");
const clearAllChatsBtn = document.getElementById("clearAllChatsBtn");
const clearAllAutomationsBtn = document.getElementById("clearAllAutomationsBtn");

const profileOverlay = document.getElementById("profileOverlay");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const sidebarProfileBtn = document.getElementById("sidebarProfileBtn");
const sidebarProfileAvatarContent = document.getElementById("sidebarProfileAvatarContent");
const choosePhotoForProfileBtn = document.getElementById("choosePhotoForProfileBtn");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profileNameInput = document.getElementById("profileNameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const logoutBtnMain = document.getElementById("logoutBtnMain");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const upgradePlanBtn = document.getElementById("upgradePlanBtn");
const appearanceValue = document.getElementById("appearanceValue");
const voiceCurrentValue = document.getElementById("voiceCurrentValue");
const connectorsCountValue = document.getElementById("connectorsCountValue");
const sharedLinksCountValue = document.getElementById("sharedLinksCountValue");

const connectorsListInSettings = document.getElementById("connectorsListInSettings");
const addConnectorBtn = document.getElementById("addConnectorBtn");

const micPermissionStatus = document.getElementById("micPermissionStatus");
const camPermissionStatus = document.getElementById("camPermissionStatus");
const notifPermissionStatus = document.getElementById("notifPermissionStatus");
const micPermissionRow = document.getElementById("micPermissionRow");
const camPermissionRow = document.getElementById("camPermissionRow");
const notifPermissionRow = document.getElementById("notifPermissionRow");

const sharedLinksList = document.getElementById("sharedLinksList");
const sharedLinksEmptyState = document.getElementById("sharedLinksEmptyState");

const addAutomationBtn = document.getElementById("addAutomationBtn");
const automationList = document.getElementById("automationList");
const automationOverlay = document.getElementById("automationOverlay");
const automationModalTitle = document.getElementById("automationModalTitle");
const closeAutomationBtn = document.getElementById("closeAutomationBtn");
const automationNameInput = document.getElementById("automationNameInput");
const automationCommandInput = document.getElementById("automationCommandInput");
const automationUrlInput = document.getElementById("automationUrlInput");
const automationTargetInput = document.getElementById("automationTargetInput");
const saveAutomationBtn = document.getElementById("saveAutomationBtn");
const deleteAutomationBtn = document.getElementById("deleteAutomationBtn");

const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const sidebarNewChatBtn = document.getElementById("sidebarNewChatBtn");
const projectPickerOverlay = document.getElementById("projectPickerOverlay");
const closeProjectPickerBtn = document.getElementById("closeProjectPickerBtn");
const projectPickerList = document.getElementById("projectPickerList");
const newProjectNameInput = document.getElementById("newProjectNameInput");
const createProjectFromPickerBtn = document.getElementById("createProjectFromPickerBtn");

const ghostChatBtn = document.getElementById("ghostChatBtn");
const chatOptionsWrapper = document.getElementById("chatOptionsWrapper");
const chatOptionsMenuBtn = document.getElementById("chatOptionsMenuBtn");
const bubbleNewChatBtn = document.getElementById("bubbleNewChatBtn");
const chatOptionsDropdown = document.getElementById("chatOptionsDropdown");
const optAddToProjectBtn = document.getElementById("optAddToProjectBtn");
const optStarBtn = document.getElementById("optStarBtn");
const optRenameBtn = document.getElementById("optRenameBtn");
const optShareBtn = document.getElementById("optShareBtn");
const optDeleteBtn = document.getElementById("optDeleteBtn");
const starBtnLabel = document.getElementById("starBtnLabel");

// ============ STATE ============

let chats = {};
let chatOrder = [];
let currentChatId = null;

let isDraftChat = false;
let draftChat = null;

let isTemporaryChatActive = false;
let temporaryChat = null;

let selectedImageBase64 = null;
let selectedFileContent = null;
let selectedFileName = null;
let isWaitingForResponse = false;
let voiceModeOn = false;
let isListening = false;
let autoSpeakOn = false;
let currentAbortController = null;

let appSettings = {
  style: "normal",
  deepThinking: false,
  deepSearch: false,
  voice: "auto",
  customInstructions: "",
  toolsEnabled: true,
  theme: "dark",
  notifyOnComplete: false
};

let profile = { name: "", photo: null };
let automations = [];
let editingAutomationId = null;

let projects = [];
let projectPickerTargetChatId = null;

let sharedLinks = [];

const VOICE_POOL = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

function pickRandomVoice() {
  return VOICE_POOL[Math.floor(Math.random() * VOICE_POOL.length)];
}

function getActiveChat() {
  if (isDraftChat) return draftChat;
  if (isTemporaryChatActive) return temporaryChat;
  return chats[currentChatId];
}

function getChatVoice() {
  if (appSettings.voice && appSettings.voice !== "auto") {
    return appSettings.voice;
  }
  const chat = getActiveChat();
  if (!chat.voice) {
    chat.voice = pickRandomVoice();
    if (!isDraftChat && !isTemporaryChatActive) saveChatsToStorage();
  }
  return chat.voice;
}

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let maxRecordTimer = null;
let hasSpokenAboveThreshold = false;
let currentAudioPlayer = null;

let cameraStream = null;
let currentFacingMode = "user";

// ============ ICONS ============

const liveVoiceIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="11" y1="3" x2="11" y2="21"/><line x1="15" y1="6" x2="15" y2="18"/><line x1="19" y1="10" x2="19" y2="14"/></svg>`;
const sendIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
const stopIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
const pdfIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`;
const downloadIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const trashIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const playIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
const folderIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
const starFilledIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const linkIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============ LOCAL STORAGE: CHATS ============

function saveChatsToStorage() {
  try {
    localStorage.setItem("fexerChats", JSON.stringify({ chats: chats, chatOrder: chatOrder }));
  } catch (error) {
    console.error("Could not save chat history (storage might be full):", error);
  }
}

function loadChatsFromStorage() {
  const saved = localStorage.getItem("fexerChats");
  if (saved) {
    const parsed = JSON.parse(saved);
    chats = parsed.chats || {};
    chatOrder = parsed.chatOrder || [];
  }

  if (chatOrder.length === 0) {
    startDraftChat();
  } else {
    currentChatId = chatOrder[0];
    renderChatList();
    renderActiveChat();
  }
}

// ============ DRAFT CHAT ============

function startDraftChat() {
  isTemporaryChatActive = false;
  temporaryChat = null;
  isDraftChat = true;
  draftChat = { title: "New Chat", messages: [], voice: pickRandomVoice() };
  currentChatId = null;
  renderActiveChat();
  renderChatList();
  updateHeaderRightState();
  closeSidebarOnMobile();
}

// ============ TEMPORARY (GHOST) CHAT ============

function startTemporaryChat() {
  isDraftChat = false;
  draftChat = null;
  isTemporaryChatActive = true;
  temporaryChat = { title: "Temporary Chat", messages: [], voice: pickRandomVoice() };
  renderActiveChat();
  renderChatList();
  updateHeaderRightState();
  closeSidebarOnMobile();
}

function exitTemporaryChat() {
  if (!isTemporaryChatActive) return;
  isTemporaryChatActive = false;
  temporaryChat = null;
}

ghostChatBtn.addEventListener("click", startTemporaryChat);

// ============ HEADER RIGHT: GHOST <-> BUBBLE ============

function updateHeaderRightState() {
  const chat = getActiveChat();
  const hasMessages = chat && chat.messages.length > 0;

  if (hasMessages) {
    ghostChatBtn.hidden = true;
    chatOptionsWrapper.hidden = false;
  } else {
    ghostChatBtn.hidden = false;
    chatOptionsWrapper.hidden = true;
  }
}

// ============ CHAT MANAGEMENT ============

function createNewChat() {
  startDraftChat();
}

function switchToChat(chatId) {
  isDraftChat = false;
  draftChat = null;
  exitTemporaryChat();
  currentChatId = chatId;
  renderChatList();
  renderActiveChat();
  updateHeaderRightState();
  closeSidebarOnMobile();
}

function renderChatList(filterQuery) {
  chatList.innerHTML = "";
  const query = (filterQuery || "").toLowerCase();

  const visibleIds = chatOrder.filter(function (id) {
    const chat = chats[id];
    if (!chat) return false;
    if (!query) return true;
    return chat.title.toLowerCase().includes(query);
  });

  const sortedIds = visibleIds.slice().sort(function (a, b) {
    const aStarred = chats[a].starred ? 1 : 0;
    const bStarred = chats[b].starred ? 1 : 0;
    return bStarred - aStarred;
  });

  sortedIds.forEach(function (chatId) {
    const chat = chats[chatId];

    const item = document.createElement("div");
    item.classList.add("chat-item");
    if (chatId === currentChatId && !isTemporaryChatActive && !isDraftChat) item.classList.add("active");

    const titleWrap = document.createElement("span");
    titleWrap.classList.add("chat-item-title");

    if (chat.starred) {
      const starIcon = document.createElement("span");
      starIcon.classList.add("chat-star-indicator");
      starIcon.innerHTML = starFilledIconSVG;
      titleWrap.appendChild(starIcon);
    }

    const titleText = document.createElement("span");
    titleText.classList.add("chat-item-title-text");
    titleText.textContent = chat.title;
    titleWrap.appendChild(titleText);

    item.appendChild(titleWrap);

    const actions = document.createElement("div");
    actions.classList.add("chat-item-actions");

    const projectBtn = document.createElement("button");
    projectBtn.classList.add("chat-project-btn");
    projectBtn.innerHTML = folderIconSVG;
    projectBtn.title = "Add to project";
    projectBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openProjectPicker(chatId);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("chat-delete-btn");
    deleteBtn.innerHTML = trashIconSVG;
    deleteBtn.title = "Delete chat";
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (confirm("Delete this chat? This cannot be undone.")) {
        deleteChat(chatId);
      }
    });

    actions.appendChild(projectBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(actions);

    let pressTimer = null;
    let longPressTriggered = false;

    function startPress() {
      longPressTriggered = false;
      pressTimer = setTimeout(function () {
        longPressTriggered = true;
        item.classList.add("show-delete");
      }, 500);
    }

    function cancelPress() {
      if (pressTimer) clearTimeout(pressTimer);
    }

    item.addEventListener("mousedown", startPress);
    item.addEventListener("touchstart", startPress);
    item.addEventListener("mouseup", cancelPress);
    item.addEventListener("mouseleave", cancelPress);
    item.addEventListener("touchend", cancelPress);

    item.addEventListener("click", function () {
      if (longPressTriggered) return;
      if (item.classList.contains("show-delete")) {
        item.classList.remove("show-delete");
        return;
      }
      switchToChat(chatId);
    });

    chatList.appendChild(item);
  });
}

chatSearchInput.addEventListener("input", function () {
  renderChatList(chatSearchInput.value);
});

function deleteChat(chatId) {
  delete chats[chatId];
  chatOrder = chatOrder.filter(function (id) { return id !== chatId; });

  if (currentChatId === chatId) {
    if (chatOrder.length > 0) {
      currentChatId = chatOrder[0];
      isDraftChat = false;
      draftChat = null;
    } else {
      saveChatsToStorage();
      startDraftChat();
      return;
    }
  }

  saveChatsToStorage();
  renderChatList();
  renderActiveChat();
  renderProjectList();
  updateHeaderRightState();
}

function toggleStarCurrentChat() {
  if (isDraftChat || isTemporaryChatActive) return;
  const chat = chats[currentChatId];
  if (!chat) return;
  chat.starred = !chat.starred;
  saveChatsToStorage();
  renderChatList();
}

function renameCurrentChat() {
  if (isDraftChat || isTemporaryChatActive) return;
  const chat = chats[currentChatId];
  if (!chat) return;
  const newName = prompt("Rename chat:", chat.title);
  if (newName && newName.trim()) {
    chat.title = newName.trim();
    saveChatsToStorage();
    renderChatList();
  }
}

function renderActiveChat() {
  chatMessages.innerHTML = "";
  const chat = getActiveChat();

  if (isTemporaryChatActive) {
    renderMessageBubble("🕶️ Temporary Chat — this conversation will not be saved and won't appear in your history.", "bot-message");
  }

  if (chat.messages.length === 0) {
    if (!isTemporaryChatActive) {
      renderMessageBubble("Hi! I'm Fexer AI. Ask me anything.", "bot-message");
    }
  } else {
    chat.messages.forEach(function (msg) {
      const className = msg.role === "user" ? "user-message" : "bot-message";
      renderMessageBubble(msg.content, className);
    });
  }
}

// ============ CHAT OPTIONS BUBBLE (header) ============

sidebarNewChatBtn.addEventListener("click", createNewChat);
bubbleNewChatBtn.addEventListener("click", createNewChat);

chatOptionsMenuBtn.addEventListener("click", function (e) {
  e.stopPropagation();

  if (isTemporaryChatActive) {
    if (confirm("End temporary chat? This conversation will be discarded.")) {
      exitTemporaryChat();
      startDraftChat();
    }
    return;
  }

  const chat = chats[currentChatId];
  if (chat) starBtnLabel.textContent = chat.starred ? "Unstar" : "Star";

  chatOptionsDropdown.classList.toggle("show");
});

optAddToProjectBtn.addEventListener("click", function () {
  chatOptionsDropdown.classList.remove("show");
  openProjectPicker(currentChatId);
});

optStarBtn.addEventListener("click", function () {
  chatOptionsDropdown.classList.remove("show");
  toggleStarCurrentChat();
});

optRenameBtn.addEventListener("click", function () {
  chatOptionsDropdown.classList.remove("show");
  renameCurrentChat();
});

optDeleteBtn.addEventListener("click", function () {
  chatOptionsDropdown.classList.remove("show");
  if (confirm("Delete this chat? This cannot be undone.")) {
    deleteChat(currentChatId);
  }
});

// ============ SHARE CHAT ============

function buildChatTextExport(chat) {
  let text = chat.title + "\n\n";
  chat.messages.forEach(function (msg) {
    const who = msg.role === "user" ? "You" : "Fexer AI";
    let content = msg.content;
    if (Array.isArray(content)) {
      content = content.filter(function (p) { return p.type === "text"; }).map(function (p) { return p.text; }).join(" ");
    }
    if (typeof content === "string") {
      content = content.replace(/^\{\{FEXER_IMAGE:[\s\S]+?\}\}\n?/, "[Image]\n");
    }
    text += who + ": " + content + "\n\n";
  });
  return text.trim();
}

optShareBtn.addEventListener("click", async function () {
  chatOptionsDropdown.classList.remove("show");

  if (isDraftChat || isTemporaryChatActive) {
    alert("Send a message first, then you can share this chat.");
    return;
  }

  const chat = chats[currentChatId];
  if (!chat || chat.messages.length === 0) {
    alert("Nothing to share yet.");
    return;
  }

  const exportText = buildChatTextExport(chat);

  const linkEntry = {
    id: "shared_" + Date.now(),
    chatId: currentChatId,
    title: chat.title,
    createdAt: new Date().toISOString()
  };
  sharedLinks.unshift(linkEntry);
  saveSharedLinks();
  renderSharedLinksList();

  if (navigator.share) {
    try {
      await navigator.share({ title: "Fexer AI — " + chat.title, text: exportText });
      return;
    } catch (err) {
      // user cancelled or share failed, fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(exportText);
    alert("Chat copied to clipboard. Paste it anywhere to share.");
  } catch (err) {
    alert("Couldn't copy automatically. Open Shared Links in Settings to find this chat.");
  }
});

function loadSharedLinks() {
  const saved = localStorage.getItem("fexerSharedLinks");
  sharedLinks = saved ? JSON.parse(saved) : [];
  renderSharedLinksList();
}

function saveSharedLinks() {
  localStorage.setItem("fexerSharedLinks", JSON.stringify(sharedLinks));
}

function renderSharedLinksList() {
  sharedLinksList.innerHTML = "";
  sharedLinksCountValue.textContent = sharedLinks.length;

  if (sharedLinks.length === 0) {
    sharedLinksEmptyState.classList.remove("hidden");
    return;
  }

  sharedLinksEmptyState.classList.add("hidden");

  sharedLinks.forEach(function (link) {
    const item = document.createElement("div");
    item.classList.add("automation-item");

    const info = document.createElement("div");
    info.classList.add("automation-item-info");
    const dateStr = new Date(link.createdAt).toLocaleString();
    info.innerHTML =
      '<span class="automation-item-name">' + escapeHtml(link.title) + "</span>" +
      '<span class="automation-item-command">' + escapeHtml(dateStr) + "</span>";
    info.addEventListener("click", function () {
      if (chats[link.chatId]) {
        profileOverlay.classList.remove("show");
        switchToChat(link.chatId);
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("automation-run-btn", "automation-delete-btn");
    deleteBtn.innerHTML = trashIconSVG;
    deleteBtn.title = "Remove";
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      sharedLinks = sharedLinks.filter(function (l) { return l.id !== link.id; });
      saveSharedLinks();
      renderSharedLinksList();
    });

    item.appendChild(info);
    item.appendChild(deleteBtn);
    sharedLinksList.appendChild(item);
  });
}

// ============ PROJECTS ============

function loadProjects() {
  const saved = localStorage.getItem("fexerProjects");
  projects = saved ? JSON.parse(saved) : [];
  renderProjectList();
}

function saveProjects() {
  localStorage.setItem("fexerProjects", JSON.stringify(projects));
}

function createProject(name) {
  const id = "project_" + Date.now();
  projects.push({ id: id, name: name });
  saveProjects();
  renderProjectList();
  return id;
}

function deleteProject(id) {
  projects = projects.filter(function (p) { return p.id !== id; });
  Object.keys(chats).forEach(function (chatId) {
    if (chats[chatId].projectId === id) {
      delete chats[chatId].projectId;
    }
  });
  saveProjects();
  saveChatsToStorage();
  renderProjectList();
}

function renderProjectList() {
  projectList.innerHTML = "";

  if (projects.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.classList.add("settings-hint");
    emptyMsg.textContent = "No projects yet.";
    projectList.appendChild(emptyMsg);
    return;
  }

  projects.forEach(function (project) {
    const item = document.createElement("div");
    item.classList.add("project-item");

    const header = document.createElement("div");
    header.classList.add("project-item-header");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("project-item-name");
    nameSpan.textContent = project.name;

    const chevron = document.createElement("span");
    chevron.classList.add("project-chevron");
    chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("automation-run-btn", "automation-delete-btn");
    deleteBtn.innerHTML = trashIconSVG;
    deleteBtn.title = "Delete project";
    deleteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (confirm('Delete project "' + project.name + '"? Chats will be ungrouped, not deleted.')) {
        deleteProject(project.id);
      }
    });

    header.appendChild(nameSpan);
    header.appendChild(chevron);
    header.appendChild(deleteBtn);

    const body = document.createElement("div");
    body.classList.add("project-item-body");

    const projectChats = chatOrder.filter(function (id) {
      return chats[id] && chats[id].projectId === project.id;
    });

    if (projectChats.length === 0) {
      const emptyChats = document.createElement("p");
      emptyChats.classList.add("settings-hint");
      emptyChats.textContent = "No chats in this project yet.";
      body.appendChild(emptyChats);
    } else {
      projectChats.forEach(function (chatId) {
        const chat = chats[chatId];
        const chatRow = document.createElement("div");
        chatRow.classList.add("project-chat-row");
        chatRow.textContent = chat.title;
        chatRow.addEventListener("click", function () { switchToChat(chatId); });
        body.appendChild(chatRow);
      });
    }

    header.addEventListener("click", function () {
      item.classList.toggle("open");
    });

    item.appendChild(header);
    item.appendChild(body);
    projectList.appendChild(item);
  });
}

addProjectBtn.addEventListener("click", function () {
  const name = prompt("Project name:");
  if (name && name.trim()) createProject(name.trim());
});

function openProjectPicker(chatId) {
  if (isDraftChat || isTemporaryChatActive) {
    alert("Send a message first, then you can add this chat to a project.");
    return;
  }
  projectPickerTargetChatId = chatId;
  renderProjectPickerList();
  newProjectNameInput.value = "";
  projectPickerOverlay.classList.add("show");
}

function renderProjectPickerList() {
  projectPickerList.innerHTML = "";

  const currentChat = chats[projectPickerTargetChatId];

  if (currentChat && currentChat.projectId) {
    const removeBtn = document.createElement("button");
    removeBtn.classList.add("style-chip");
    removeBtn.textContent = "Remove from project";
    removeBtn.addEventListener("click", function () {
      delete chats[projectPickerTargetChatId].projectId;
      saveChatsToStorage();
      renderProjectList();
      projectPickerOverlay.classList.remove("show");
    });
    projectPickerList.appendChild(removeBtn);
  }

  projects.forEach(function (project) {
    const btn = document.createElement("button");
    btn.classList.add("style-chip");
    if (currentChat && currentChat.projectId === project.id) btn.classList.add("selected");
    btn.textContent = project.name;
    btn.addEventListener("click", function () {
      chats[projectPickerTargetChatId].projectId = project.id;
      saveChatsToStorage();
      renderProjectList();
      projectPickerOverlay.classList.remove("show");
    });
    projectPickerList.appendChild(btn);
  });

  if (projects.length === 0) {
    const hint = document.createElement("p");
    hint.classList.add("settings-hint");
    hint.textContent = "No projects yet — create one below.";
    projectPickerList.appendChild(hint);
  }
}

closeProjectPickerBtn.addEventListener("click", function () {
  projectPickerOverlay.classList.remove("show");
});

projectPickerOverlay.addEventListener("click", function (e) {
  if (e.target === projectPickerOverlay) projectPickerOverlay.classList.remove("show");
});

createProjectFromPickerBtn.addEventListener("click", function () {
  const name = newProjectNameInput.value.trim();
  if (!name) return;
  const id = createProject(name);
  if (projectPickerTargetChatId) {
    chats[projectPickerTargetChatId].projectId = id;
    saveChatsToStorage();
  }
  renderProjectList();
  projectPickerOverlay.classList.remove("show");
});

attachToProjectBtn.addEventListener("click", function () {
  attachMenu.classList.remove("show");
  openProjectPicker(currentChatId);
});

// ============ ATTACH MENU ============

attachBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  attachMenu.classList.toggle("show");
});

document.addEventListener("click", function (e) {
  if (!attachMenu.contains(e.target) && e.target !== attachBtn) {
    attachMenu.classList.remove("show");
  }
  if (!chatOptionsDropdown.contains(e.target) && !chatOptionsMenuBtn.contains(e.target)) {
    chatOptionsDropdown.classList.remove("show");
  }
});

choosePhotoBtn.addEventListener("click", function () {
  imageInput.click();
  attachMenu.classList.remove("show");
});

takePhotoBtn.addEventListener("click", function () {
  attachMenu.classList.remove("show");
  openCamera();
});

chooseFileBtn.addEventListener("click", function () {
  fileUploadInput.click();
  attachMenu.classList.remove("show");
});

imageInput.addEventListener("change", handleImageSelected);

function handleImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedFileContent = null;
  selectedFileName = null;

  if (file.type.startsWith("video/")) {
    extractVideoFrame(file, function (base64) {
      selectedImageBase64 = base64;
      showImagePreview(base64, true);
      updateActionButton();
    });
  } else {
    compressImage(file, function (base64) {
      selectedImageBase64 = base64;
      showImagePreview(base64, false);
      updateActionButton();
    });
  }

  e.target.value = "";
}

fileUploadInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedImageBase64 = null;

  const reader = new FileReader();
  reader.onload = function (event) {
    selectedFileContent = event.target.result;
    selectedFileName = file.name;
    showFilePreview(file.name);
    updateActionButton();
  };
  reader.onerror = function () {
    renderMessageBubble("⚠️ Couldn't read that file. Only text-based files (.txt, .md, .csv, .json, code files) are supported.", "bot-message");
  };
  reader.readAsText(file);
  e.target.value = "";
});

function showFilePreview(name) {
  imagePreviewArea.innerHTML =
    '<div class="image-preview-chip file-preview-chip">' +
    '<div class="file-chip-icon">' + pdfIconSVG + "</div>" +
    '<span class="file-chip-name">' + escapeHtml(name) + "</span>" +
    '<button id="removePreviewBtn" class="remove-preview-btn" title="Remove file">×</button>' +
    "</div>";

  imagePreviewArea.classList.add("show");
  document.getElementById("removePreviewBtn").addEventListener("click", clearImagePreview);
}

function compressImage(file, callback) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();

    img.onload = function () {
      const maxWidth = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      callback(canvas.toDataURL("image/jpeg", 0.7));
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

function extractVideoFrame(file, callback) {
  const videoEl = document.createElement("video");
  videoEl.preload = "metadata";
  videoEl.muted = true;
  videoEl.src = URL.createObjectURL(file);

  videoEl.addEventListener("loadeddata", function () {
    videoEl.currentTime = Math.min(0.3, videoEl.duration / 2);
  });

  videoEl.addEventListener("seeked", function () {
    const maxWidth = 800;
    let width = videoEl.videoWidth;
    let height = videoEl.videoHeight;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(videoEl, 0, 0, width, height);

    const base64 = canvas.toDataURL("image/jpeg", 0.7);
    URL.revokeObjectURL(videoEl.src);
    callback(base64);
  });
}

function showImagePreview(base64, fromVideo) {
  const badge = fromVideo ? '<span class="video-frame-badge">Frame from video</span>' : "";

  imagePreviewArea.innerHTML =
    '<div class="image-preview-chip">' +
    '<img src="' + base64 + '" alt="preview">' +
    badge +
    '<button id="removePreviewBtn" class="remove-preview-btn" title="Remove image">×</button>' +
    "</div>";

  imagePreviewArea.classList.add("show");
  document.getElementById("removePreviewBtn").addEventListener("click", clearImagePreview);
}

function clearImagePreview() {
  selectedImageBase64 = null;
  selectedFileContent = null;
  selectedFileName = null;
  imagePreviewArea.innerHTML = "";
  imagePreviewArea.classList.remove("show");
  updateActionButton();
}

// ============ LIVE CAMERA ============

async function openCamera() {
  cameraOverlay.classList.add("show");
  currentFacingMode = "user";
  await startCameraStream();
}

async function startCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (track) { track.stop(); });
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
    cameraVideo.srcObject = cameraStream;
    refreshPermissionStatuses();
  } catch (error) {
    console.error("Camera error:", error);
    renderMessageBubble("⚠️ Couldn't access the camera. Please check permissions.", "bot-message");
    closeCamera();
  }
}

cameraSwitchBtn.addEventListener("click", function () {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  startCameraStream();
});

cameraCaptureBtn.addEventListener("click", function () {
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  cameraCanvas.getContext("2d").drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  const base64 = cameraCanvas.toDataURL("image/jpeg", 0.8);
  selectedFileContent = null;
  selectedFileName = null;
  selectedImageBase64 = base64;
  showImagePreview(base64, false);
  updateActionButton();
  closeCamera();
});

cameraCancelBtn.addEventListener("click", closeCamera);

function closeCamera() {
  cameraOverlay.classList.remove("show");
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (track) { track.stop(); });
    cameraStream = null;
  }
}

// ============ DICTATION MIC BUTTON ============

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    updateActionButton();
  };

  recognition.onend = function () {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event.error);
    isListening = false;
    micBtn.classList.remove("listening");
  };

  micBtn.addEventListener("click", function () {
    if (isListening) {
      recognition.stop();
    } else {
      try {
        isListening = true;
        micBtn.classList.add("listening");
        recognition.start();
      } catch (error) {
        isListening = false;
        console.error("Could not start dictation:", error);
      }
    }
  });
} else {
  micBtn.style.display = "none";
  console.warn("Speech recognition is not supported in this browser.");
}

// ============ DYNAMIC ACTION BUTTON ============

function updateActionButton() {
  actionBtn.classList.remove("is-send", "is-stop", "is-voice-active");

  if (isWaitingForResponse) {
    actionBtn.innerHTML = stopIconSVG;
    actionBtn.classList.add("is-stop");
    actionBtn.title = "Stop generating";
    actionBtn.onclick = stopGenerating;
    return;
  }

  if (voiceModeOn) {
    actionBtn.innerHTML = liveVoiceIconSVG;
    actionBtn.classList.add("is-voice-active");
    actionBtn.title = "Stop live voice chat";
    actionBtn.onclick = stopVoiceMode;
    return;
  }

  const hasContent = userInput.value.trim() !== "" || !!selectedImageBase64 || !!selectedFileContent;

  if (hasContent) {
    actionBtn.innerHTML = sendIconSVG;
    actionBtn.classList.add("is-send");
    actionBtn.title = "Send message";
    actionBtn.onclick = sendMessage;
  } else {
    actionBtn.innerHTML = liveVoiceIconSVG;
    actionBtn.title = "Start live voice chat";
    actionBtn.onclick = startVoiceMode;
  }
}

userInput.addEventListener("input", updateActionButton);

userInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

// ============ BROWSER NOTIFICATION ON RESPONSE COMPLETE ============

function maybeNotifyResponseComplete(chatTitle) {
  if (!appSettings.notifyOnComplete) return;
  if (document.visibilityState === "visible") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification("Fexer AI reply ready", {
      body: chatTitle || "Your conversation has a new reply.",
      icon: undefined
    });
  } catch (err) {
    console.error("Notification error:", err);
  }
}

// ============ SENDING MESSAGES ============

async function sendMessage() {
  let userText = userInput.value.trim();
  if (userText === "" && !selectedImageBase64 && !selectedFileContent) return;

  const matchedAutomation = automations.find(function (a) {
    return a.command && userText.toLowerCase().startsWith(a.command.toLowerCase());
  });

  if (matchedAutomation && !isTemporaryChatActive) {
    promoteDraftToRealChatIfNeeded();
    await handleAutomationCommand(userText, matchedAutomation);
    return;
  }

  promoteDraftToRealChatIfNeeded();

  const chat = getActiveChat();

  if (selectedFileContent) {
    const fileBlock = "Attached file: " + selectedFileName + "\n```\n" + selectedFileContent.slice(0, 20000) + "\n```";
    userText = userText ? (userText + "\n\n" + fileBlock) : fileBlock;
  }

  let messageContent;

  if (selectedImageBase64) {
    messageContent = [];
    if (userText !== "") messageContent.push({ type: "text", text: userText });
    messageContent.push({ type: "image_url", image_url: { url: selectedImageBase64 } });
  } else {
    messageContent = userText;
  }

  if (chat.messages.length === 0) {
    const titleSource = userInput.value.trim() !== "" ? userInput.value.trim() : (selectedFileName || "Image");
    chat.title = titleSource.length > 30 ? titleSource.slice(0, 30) + "..." : titleSource;
    if (!isTemporaryChatActive) renderChatList();
  }

  renderMessageBubble(messageContent, "user-message");
  chat.messages.push({ role: "user", content: messageContent });
  if (!isTemporaryChatActive) saveChatsToStorage();
  updateHeaderRightState();

  userInput.value = "";
  clearImagePreview();

  isWaitingForResponse = true;
  setInputDisabled(true);
  updateActionButton();
  showTypingIndicator();
  if (voiceModeOn) setVoiceOverlayState("thinking");

  currentAbortController = new AbortController();

  try {
    const response = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chat.messages,
        voiceMode: voiceModeOn,
        style: appSettings.style,
        deepThinking: appSettings.deepThinking,
        deepSearch: appSettings.deepSearch,
        customInstructions: appSettings.customInstructions,
        toolsEnabled: appSettings.toolsEnabled
      }),
      signal: currentAbortController.signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      handleApiError(response.status, errorData);
      removeTypingIndicator();
      finishResponseCycle();
      if (voiceModeOn) startRecordingWithSilenceDetection();
      return;
    }

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    removeTypingIndicator();
    renderMessageBubble(botReply, "bot-message");

    chat.messages.push({ role: "assistant", content: botReply });
    if (!isTemporaryChatActive) saveChatsToStorage();

    finishResponseCycle();
    maybeNotifyResponseComplete(chat.title);

    if (voiceModeOn) {
      setVoiceOverlayState("speaking");
      await speakTextOpenAI(getSpeakableText(botReply));
      if (voiceModeOn) {
        setVoiceOverlayState("listening");
        startRecordingWithSilenceDetection();
      }
    } else if (autoSpeakOn) {
      speakTextOpenAI(getSpeakableText(botReply));
    }

  } catch (error) {
    removeTypingIndicator();

    if (error.name === "AbortError") {
      renderMessageBubble("⏹️ Stopped.", "bot-message");
    } else {
      renderMessageBubble("⚠️ Connection error. Please check your internet and try again.", "bot-message");
      console.error(error);
    }

    finishResponseCycle();
  }
}

function promoteDraftToRealChatIfNeeded() {
  if (!isDraftChat) return;

  const newId = "chat_" + Date.now();
  chats[newId] = draftChat;
  chatOrder.unshift(newId);
  currentChatId = newId;

  isDraftChat = false;
  draftChat = null;
}

async function handleAutomationCommand(displayText, automation) {
  const chat = getActiveChat();

  const messageToSend = automation.command && displayText.toLowerCase().startsWith(automation.command.toLowerCase())
    ? displayText.slice(automation.command.length).trim()
    : displayText.trim();

  if (chat.messages.length === 0) {
    chat.title = automation.name;
    if (!isTemporaryChatActive) renderChatList();
  }

  renderMessageBubble(displayText, "user-message");
  chat.messages.push({ role: "user", content: displayText });
  if (!isTemporaryChatActive) saveChatsToStorage();
  updateHeaderRightState();

  userInput.value = "";
  updateActionButton();

  isWaitingForResponse = true;
  setInputDisabled(true);
  updateActionButton();
  showTypingIndicator();

  currentAbortController = new AbortController();

  try {
    const response = await fetch("/.netlify/functions/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage: messageToSend || "run",
        webhookUrl: automation.webhookUrl,
        appId: automation.appId,
        target: automation.target
      }),
      signal: currentAbortController.signal
    });

    const data = await response.json();
    const reply = data.reply || "Automation completed!";

    removeTypingIndicator();
    renderMessageBubble(reply, "bot-message");

    chat.messages.push({ role: "assistant", content: reply });
    if (!isTemporaryChatActive) saveChatsToStorage();
    maybeNotifyResponseComplete(chat.title);

  } catch (error) {
    removeTypingIndicator();

    if (error.name === "AbortError") {
      renderMessageBubble("⏹️ Stopped.", "bot-message");
    } else {
      renderMessageBubble("⚠️ Automation request failed. Please try again.", "bot-message");
      console.error(error);
    }
  }

  finishResponseCycle();
}

function finishResponseCycle() {
  isWaitingForResponse = false;
  currentAbortController = null;
  setInputDisabled(false);
  updateActionButton();
}

function stopGenerating() {
  if (currentAbortController) currentAbortController.abort();
}

// ============ DISPLAY HELPERS ============

function renderMessageBubble(content, className) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", className);

  if (Array.isArray(content)) {
    content.forEach(function (part) {
      if (part.type === "text") {
        const textDiv = document.createElement("div");
        if (className === "bot-message") {
          textDiv.innerHTML = marked.parse(part.text);
        } else {
          textDiv.textContent = part.text;
        }
        messageDiv.appendChild(textDiv);
      } else if (part.type === "image_url") {
        const img = document.createElement("img");
        img.src = part.image_url.url;
        img.classList.add("message-image");
        messageDiv.appendChild(img);
      }
    });
  } else if (className === "bot-message") {
    const imageMatch = typeof content === "string" ? content.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/) : null;

    if (imageMatch) {
      const base64 = imageMatch[1];
      const caption = imageMatch[2];

      const img = document.createElement("img");
      img.src = "data:image/png;base64," + base64;
      img.classList.add("message-image");
      messageDiv.appendChild(img);

      if (caption.trim() !== "") {
        const captionDiv = document.createElement("div");
        captionDiv.textContent = caption.trim();
        messageDiv.appendChild(captionDiv);
      }

      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("message-actions");

      const downloadBtn = document.createElement("button");
      downloadBtn.classList.add("message-action-btn");
      downloadBtn.title = "Download image";
      downloadBtn.innerHTML = downloadIconSVG;
      downloadBtn.addEventListener("click", function () { downloadBase64Image(base64); });

      actionsDiv.appendChild(downloadBtn);
      messageDiv.appendChild(actionsDiv);

    } else {
      messageDiv.innerHTML = marked.parse(content);

      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("message-actions");

      const pdfBtn = document.createElement("button");
      pdfBtn.classList.add("message-action-btn");
      pdfBtn.title = "Download as PDF";
      pdfBtn.innerHTML = pdfIconSVG;
      pdfBtn.addEventListener("click", function () { downloadAsPDF(content); });

      actionsDiv.appendChild(pdfBtn);
      messageDiv.appendChild(actionsDiv);
    }
  } else {
    messageDiv.textContent = content;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "bot-message", "typing-indicator");
  typingDiv.id = "typingIndicator";
  typingDiv.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const typingDiv = document.getElementById("typingIndicator");
  if (typingDiv) typingDiv.remove();
}

function handleApiError(statusCode, errorData) {
  let message = "⚠️ Something went wrong. Please try again.";

  if (statusCode === 401) {
    message = "⚠️ Invalid API key. Please check your OpenAI API key in the Netlify environment settings.";
  } else if (statusCode === 429) {
    message = "⚠️ You've hit a rate limit or run out of quota. Check your OpenAI billing/usage page.";
  } else if (statusCode === 500 || statusCode === 503) {
    message = "⚠️ OpenAI's servers are having issues right now. Please try again in a moment.";
  }

  renderMessageBubble(message, "bot-message");
  console.error("API Error:", statusCode, errorData);
}

function setInputDisabled(isDisabled) {
  userInput.disabled = isDisabled;
  attachBtn.disabled = isDisabled;
  micBtn.disabled = isDisabled;
}

// ============ SIDEBAR TOGGLE ============

menuToggle.addEventListener("click", function () {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("active");
});

sidebarOverlay.addEventListener("click", closeSidebarOnMobile);
sidebarCloseBtn.addEventListener("click", closeSidebarOnMobile);

function closeSidebarOnMobile() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}

// ============ LIVE VOICE CHAT ============

function showVoiceOverlay() { voiceOverlay.classList.add("show"); }
function hideVoiceOverlay() { voiceOverlay.classList.remove("show"); }

function setVoiceOverlayState(state) {
  voiceOrb.classList.remove("thinking", "speaking");

  if (state === "thinking") {
    voiceOrb.classList.add("thinking");
    voiceStatusText.textContent = "Thinking...";
  } else if (state === "speaking") {
    voiceOrb.classList.add("speaking");
    voiceStatusText.textContent = "Speaking...";
  } else {
    voiceStatusText.textContent = "Listening...";
  }
}

closeVoiceOverlayBtn.addEventListener("click", stopVoiceMode);

async function startVoiceMode() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    renderMessageBubble("⚠️ Live voice chat needs microphone access, which isn't available in this browser.", "bot-message");
    return;
  }

  voiceModeOn = true;
  showVoiceOverlay();
  setVoiceOverlayState("listening");
  updateActionButton();

  await startRecordingWithSilenceDetection();
}

function stopVoiceMode() {
  voiceModeOn = false;
  hideVoiceOverlay();

  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  cleanupAudioAnalysis();

  if (currentAudioPlayer) {
    currentAudioPlayer.pause();
    currentAudioPlayer = null;
  }

  if (currentAbortController) currentAbortController.abort();

  updateActionButton();
}

async function startRecordingWithSilenceDetection() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    refreshPermissionStatuses();
  } catch (error) {
    renderMessageBubble("⚠️ Microphone access was denied. Please allow microphone permission and try again.", "bot-message");
    stopVoiceMode();
    return;
  }

  audioChunks = [];
  hasSpokenAboveThreshold = false;
  mediaRecorder = new MediaRecorder(mediaStream);

  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = function () {
    cleanupAudioAnalysis();
    if (!voiceModeOn) return;

    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });

    if (audioBlob.size > 1000) {
      processRecordedAudio(audioBlob);
    } else {
      startRecordingWithSilenceDetection();
    }
  };

  mediaRecorder.start();
  setVoiceOverlayState("listening");
  monitorSilence();

  maxRecordTimer = setTimeout(function () {
    if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  }, 15000);
}

function monitorSilence() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const SILENCE_THRESHOLD = 12;
  const SILENCE_DURATION = 1200;
  let silenceStart = null;

  function checkVolume() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;

    analyser.getByteFrequencyData(dataArray);
    const avgVolume = dataArray.reduce(function (a, b) { return a + b; }, 0) / dataArray.length;

    if (avgVolume > SILENCE_THRESHOLD) {
      hasSpokenAboveThreshold = true;
      silenceStart = null;
    } else if (hasSpokenAboveThreshold) {
      if (silenceStart === null) silenceStart = Date.now();
      if (Date.now() - silenceStart > SILENCE_DURATION) {
        mediaRecorder.stop();
        return;
      }
    }

    requestAnimationFrame(checkVolume);
  }

  requestAnimationFrame(checkVolume);
}

function cleanupAudioAnalysis() {
  if (maxRecordTimer) {
    clearTimeout(maxRecordTimer);
    maxRecordTimer = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(function (track) { track.stop(); });
    mediaStream = null;
  }
}

async function processRecordedAudio(audioBlob) {
  setVoiceOverlayState("thinking");
  const base64Audio = await blobToBase64(audioBlob);

  try {
    const response = await fetch("/.netlify/functions/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: base64Audio, mimeType: audioBlob.type })
    });

    if (!response.ok) throw new Error("Transcription failed");

    const data = await response.json();
    const spokenText = data.text ? data.text.trim() : "";

    if (spokenText === "") {
      if (voiceModeOn) startRecordingWithSilenceDetection();
      return;
    }

    userInput.value = spokenText;
    sendMessage();

  } catch (error) {
    console.error(error);
    if (voiceModeOn) {
      renderMessageBubble("⚠️ Couldn't understand that. Please try again.", "bot-message");
      startRecordingWithSilenceDetection();
    }
  }
}

function blobToBase64(blob) {
  return new Promise(function (resolve) {
    const reader = new FileReader();
    reader.onloadend = function () { resolve(reader.result.split(",")[1]); };
    reader.readAsDataURL(blob);
  });
}

function speakTextOpenAI(text) {
  return new Promise(async function (resolve) {
    try {
      const response = await fetch("/.netlify/functions/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: stripMarkdownForSpeech(text), voice: getChatVoice() })
      });

      if (!response.ok) { resolve(); return; }

      const data = await response.json();
      const audio = new Audio("data:audio/mp3;base64," + data.audioBase64);
      currentAudioPlayer = audio;

      audio.onended = function () { currentAudioPlayer = null; resolve(); };
      audio.onerror = function () { currentAudioPlayer = null; resolve(); };

      audio.play();

    } catch (error) {
      console.error("TTS error:", error);
      resolve();
    }
  });
}

function stripMarkdownForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`#>~-]/g, "")
    .replace(/\n+/g, ". ");
}

function getSpeakableText(text) {
  const imageMatch = text.match(/^\{\{FEXER_IMAGE:([\s\S]+?)\}\}\n?([\s\S]*)$/);
  if (imageMatch) return imageMatch[2] || "Here's the image you asked for.";
  return text;
}

// ============ PDF & IMAGE DOWNLOAD HELPERS ============

function downloadAsPDF(text) {
  const doc = new jspdf.jsPDF();
  const plainText = stripMarkdownForPDF(text);
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const lineHeight = 7;

  const lines = doc.splitTextToSize(plainText, 180);
  doc.setFontSize(11);

  let y = 20;
  lines.forEach(function (line) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save("Fexer-AI-Document.pdf");
}

function stripMarkdownForPDF(text) {
  return text
    .replace(/```([\s\S]*?)```/g, function (match, code) { return code.trim(); })
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

function downloadBase64Image(base64) {
  const link = document.createElement("a");
  link.href = "data:image/png;base64," + base64;
  link.download = "Fexer-AI-Image.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============ THEME (Light / Dark / System) ============

let systemThemeMediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

function applyTheme() {
  let effectiveTheme = appSettings.theme;
  if (effectiveTheme === "system") {
    effectiveTheme = (systemThemeMediaQuery && systemThemeMediaQuery.matches) ? "light" : "dark";
  }
  document.body.classList.toggle("theme-light", effectiveTheme === "light");
}

if (systemThemeMediaQuery) {
  systemThemeMediaQuery.addEventListener("change", function () {
    if (appSettings.theme === "system") applyTheme();
  });
}

// ============ AI SETTINGS ============

function loadAppSettings() {
  const saved = localStorage.getItem("fexerSettings");
  if (saved) appSettings = Object.assign(appSettings, JSON.parse(saved));
  applySettingsToUI();
  applyTheme();
}

function saveAppSettings() {
  localStorage.setItem("fexerSettings", JSON.stringify(appSettings));
}

function applySettingsToUI() {
  document.querySelectorAll(".style-chip[data-style]").forEach(function (chip) {
    chip.classList.toggle("selected", chip.dataset.style === appSettings.style);
  });
  document.querySelectorAll(".voice-chip").forEach(function (chip) {
    chip.classList.toggle("selected", chip.dataset.voice === appSettings.voice);
  });
  document.querySelectorAll("#appearanceOptions .style-chip").forEach(function (chip) {
    chip.classList.toggle("selected", chip.dataset.theme === appSettings.theme);
  });
  if (appearanceValue) {
    appearanceValue.textContent = appSettings.theme.charAt(0).toUpperCase() + appSettings.theme.slice(1);
  }
  if (voiceCurrentValue) {
    voiceCurrentValue.textContent = appSettings.voice.charAt(0).toUpperCase() + appSettings.voice.slice(1);
  }
  deepThinkingToggle.classList.toggle("on", appSettings.deepThinking);
  deepThinkingToggle.setAttribute("aria-checked", appSettings.deepThinking);
  deepSearchToggle.classList.toggle("on", appSettings.deepSearch);
  deepSearchToggle.setAttribute("aria-checked", appSettings.deepSearch);
  webSearchToggleMenu.classList.toggle("on", appSettings.deepSearch);
  toolsEnabledToggle.classList.toggle("on", appSettings.toolsEnabled);
  toolsToggleMenu.classList.toggle("on", appSettings.toolsEnabled);
  notifyOnCompleteToggle.classList.toggle("on", appSettings.notifyOnComplete);
  customInstructionsInput.value = appSettings.customInstructions;
}

document.querySelectorAll(".style-chip[data-style]").forEach(function (chip) {
  chip.addEventListener("click", function () {
    appSettings.style = chip.dataset.style;
    saveAppSettings();
    applySettingsToUI();
  });
});

document.querySelectorAll(".voice-chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    appSettings.voice = chip.dataset.voice;
    saveAppSettings();
    applySettingsToUI();
  });
});

document.querySelectorAll("#appearanceOptions .style-chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    appSettings.theme = chip.dataset.theme;
    saveAppSettings();
    applySettingsToUI();
    applyTheme();
  });
});

deepThinkingToggle.addEventListener("click", function () {
  appSettings.deepThinking = !appSettings.deepThinking;
  saveAppSettings();
  applySettingsToUI();
});

deepSearchToggle.addEventListener("click", function () {
  appSettings.deepSearch = !appSettings.deepSearch;
  saveAppSettings();
  applySettingsToUI();
});

webSearchToggleMenu.addEventListener("click", function () {
  appSettings.deepSearch = !appSettings.deepSearch;
  saveAppSettings();
  applySettingsToUI();
});

toolsEnabledToggle.addEventListener("click", function () {
  appSettings.toolsEnabled = !appSettings.toolsEnabled;
  saveAppSettings();
  applySettingsToUI();
});

toolsToggleMenu.addEventListener("click", function () {
  appSettings.toolsEnabled = !appSettings.toolsEnabled;
  saveAppSettings();
  applySettingsToUI();
});

notifyOnCompleteToggle.addEventListener("click", async function () {
  if (!appSettings.notifyOnComplete) {
    if ("Notification" in window && Notification.permission !== "granted") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        alert("Notifications were blocked. Enable them in your browser settings to use this.");
        refreshPermissionStatuses();
        return;
      }
    }
  }
  appSettings.notifyOnComplete = !appSettings.notifyOnComplete;
  saveAppSettings();
  applySettingsToUI();
  refreshPermissionStatuses();
});

customInstructionsInput.addEventListener("blur", function () {
  appSettings.customInstructions = customInstructionsInput.value.trim();
  saveAppSettings();
});

// ============ PERMISSIONS PAGE (real status) ============

async function refreshPermissionStatuses() {
  // Microphone
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const micResult = await navigator.permissions.query({ name: "microphone" });
      setPermissionStatusUI(micPermissionStatus, micResult.state);
    } catch (err) {
      micPermissionStatus.textContent = "Tap to check";
      micPermissionStatus.className = "settings-row-value";
    }

    try {
      const camResult = await navigator.permissions.query({ name: "camera" });
      setPermissionStatusUI(camPermissionStatus, camResult.state);
    } catch (err) {
      camPermissionStatus.textContent = "Tap to check";
      camPermissionStatus.className = "settings-row-value";
    }
  } else {
    micPermissionStatus.textContent = "Tap to check";
    camPermissionStatus.textContent = "Tap to check";
  }

  // Notifications
  if ("Notification" in window) {
    setPermissionStatusUI(notifPermissionStatus, Notification.permission === "default" ? "prompt" : Notification.permission);
  } else {
    notifPermissionStatus.textContent = "Unsupported";
  }
}

function setPermissionStatusUI(el, state) {
  el.classList.remove("permission-status-granted", "permission-status-denied", "permission-status-prompt");
  if (state === "granted") {
    el.textContent = "Granted";
    el.classList.add("permission-status-granted");
  } else if (state === "denied") {
    el.textContent = "Denied";
    el.classList.add("permission-status-denied");
  } else {
    el.textContent = "Ask";
    el.classList.add("permission-status-prompt");
  }
}

micPermissionRow.addEventListener("click", async function () {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(function (t) { t.stop(); });
  } catch (err) {
    // denied or unavailable
  }
  refreshPermissionStatuses();
});

camPermissionRow.addEventListener("click", async function () {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(function (t) { t.stop(); });
  } catch (err) {
    // denied or unavailable
  }
  refreshPermissionStatuses();
});

notifPermissionRow.addEventListener("click", async function () {
  if ("Notification" in window) {
    await Notification.requestPermission();
  }
  refreshPermissionStatuses();
});

// ============ SETTINGS PAGE STACK NAVIGATION ============

function goToSettingsPage(pageName) {
  document.querySelectorAll(".settings-page").forEach(function (p) {
    p.classList.toggle("active", p.dataset.page === pageName);
  });
  if (pageName === "permissions") refreshPermissionStatuses();
  if (pageName === "connectors") renderConnectorsListInSettings();
}

document.querySelectorAll(".settings-row[data-nav]").forEach(function (row) {
  row.addEventListener("click", function () {
    goToSettingsPage(row.dataset.nav);
  });
});

document.querySelectorAll("[data-back]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    goToSettingsPage("main");
  });
});

function openProfileDashboard() {
  goToSettingsPage("main");
  profileOverlay.classList.add("show");
}

sidebarProfileBtn.addEventListener("click", openProfileDashboard);

closeProfileBtn.addEventListener("click", function () { profileOverlay.classList.remove("show"); });
profileOverlay.addEventListener("click", function (e) {
  if (e.target === profileOverlay) profileOverlay.classList.remove("show");
});

addConnectorBtn.addEventListener("click", function () {
  profileOverlay.classList.remove("show");
  openAddAutomationModal();
});

logoutBtnMain.addEventListener("click", function () {
  if (confirm("Log out? This will reset your local Fexer AI session on this browser.")) {
    localStorage.clear();
    location.reload();
  }
});

// ============ PROFILE & ACCOUNT ============

function loadProfile() {
  const saved = localStorage.getItem("fexerProfile");
  if (saved) profile = JSON.parse(saved);
  renderProfileAvatar();
}

function saveProfile() {
  localStorage.setItem("fexerProfile", JSON.stringify(profile));
}

function renderProfileAvatar() {
  if (profile.photo) {
    profilePhotoPreview.innerHTML = '<img src="' + profile.photo + '" alt="profile">';
    sidebarProfileAvatarContent.innerHTML = '<img src="' + profile.photo + '" alt="profile">';
  } else {
    const initial = profile.name ? profile.name.charAt(0).toUpperCase() : "U";
    profilePhotoPreview.textContent = initial;
    sidebarProfileAvatarContent.textContent = initial;
  }
  profileNameInput.value = profile.name || "";
}

choosePhotoForProfileBtn.addEventListener("click", function () { profilePhotoInput.click(); });

profilePhotoInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  compressImage(file, function (base64) {
    profile.photo = base64;
    renderProfileAvatar();
  });
  e.target.value = "";
});

saveProfileBtn.addEventListener("click", function () {
  profile.name = profileNameInput.value.trim();
  saveProfile();
  renderProfileAvatar();
});

deleteAccountBtn.addEventListener("click", function () {
  if (confirm("Delete your account? This permanently removes everything stored for Fexer AI on this device.")) {
    localStorage.clear();
    location.reload();
  }
});

exportDataBtn.addEventListener("click", function () {
  const exportPayload = {
    chats: chats,
    chatOrder: chatOrder,
    projects: projects,
    automations: automations,
    profile: profile,
    settings: appSettings,
    sharedLinks: sharedLinks,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Fexer-AI-Data-Export.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

upgradePlanBtn.addEventListener("click", function () {
  alert("Upgrade plans are coming soon to Fexer AI. (Requires Stripe integration.)");
});

autoSpeakToggle.addEventListener("click", function () {
  autoSpeakOn = !autoSpeakOn;
  autoSpeakToggle.classList.toggle("on", autoSpeakOn);

  if (!autoSpeakOn && currentAudioPlayer) {
    currentAudioPlayer.pause();
    currentAudioPlayer = null;
  }
});

clearAllChatsBtn.addEventListener("click", function () {
  if (confirm("Delete ALL chats? This cannot be undone.")) {
    chats = {};
    chatOrder = [];
    localStorage.removeItem("fexerChats");
    startDraftChat();
    renderProjectList();
  }
});

clearAllAutomationsBtn.addEventListener("click", function () {
  if (confirm("Delete ALL automations? This cannot be undone.")) {
    automations = [];
    localStorage.removeItem("fexerAutomations");
    renderAutomationList();
    renderConnectorsListInSettings();
  }
});

// ============ AUTOMATIONS / CONNECTORS MANAGER ============

function loadAutomations() {
  const saved = localStorage.getItem("fexerAutomations");
  automations = saved ? JSON.parse(saved) : [];
  renderAutomationList();
  renderConnectorsListInSettings();
}

function saveAutomations() {
  localStorage.setItem("fexerAutomations", JSON.stringify(automations));
}

function buildAutomationRow(auto, container) {
  const item = document.createElement("div");
  item.classList.add("automation-item");

  const info = document.createElement("div");
  info.classList.add("automation-item-info");
  info.innerHTML =
    '<span class="automation-item-name">' + escapeHtml(auto.name) + "</span>" +
    (auto.command ? '<span class="automation-item-command">' + escapeHtml(auto.command) + "</span>" : "");
  info.addEventListener("click", function () { openEditAutomation(auto.id); });

  const actionsWrapper = document.createElement("div");
  actionsWrapper.classList.add("automation-item-actions");

  const runBtn = document.createElement("button");
  runBtn.classList.add("automation-run-btn");
  runBtn.innerHTML = playIconSVG;
  runBtn.title = "Run now";
  runBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    runAutomationManually(auto);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("automation-run-btn", "automation-delete-btn");
  deleteBtn.innerHTML = trashIconSVG;
  deleteBtn.title = "Delete automation";
  deleteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (confirm('Delete "' + auto.name + '"? This cannot be undone.')) {
      deleteAutomation(auto.id);
    }
  });

  actionsWrapper.appendChild(runBtn);
  actionsWrapper.appendChild(deleteBtn);

  item.appendChild(info);
  item.appendChild(actionsWrapper);
  container.appendChild(item);
}

function renderAutomationList() {
  automationList.innerHTML = "";

  if (automations.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.classList.add("settings-hint");
    emptyMsg.textContent = "No automations yet. Tap + to add one.";
    automationList.appendChild(emptyMsg);
  } else {
    automations.forEach(function (auto) { buildAutomationRow(auto, automationList); });
  }

  if (connectorsCountValue) connectorsCountValue.textContent = automations.length;
}

function renderConnectorsListInSettings() {
  if (!connectorsListInSettings) return;
  connectorsListInSettings.innerHTML = "";

  if (automations.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.classList.add("settings-hint");
    emptyMsg.textContent = "No connectors yet. Tap + above to add your first automation.";
    connectorsListInSettings.appendChild(emptyMsg);
    return;
  }

  automations.forEach(function (auto) { buildAutomationRow(auto, connectorsListInSettings); });
}

function deleteAutomation(id) {
  automations = automations.filter(function (a) { return a.id !== id; });
  saveAutomations();
  renderAutomationList();
  renderConnectorsListInSettings();
}

function runAutomationManually(auto) {
  const extra = prompt('Message to send to "' + auto.name + '" (optional):', "");
  if (extra === null) return;

  promoteDraftToRealChatIfNeeded();

  const displayText = (auto.command ? auto.command + " " : "") + extra;
  handleAutomationCommand(displayText.trim() || auto.name, auto);
  closeSidebarOnMobile();
}

function setAutomationAppSelection(appId) {
  document.querySelectorAll(".app-chip").forEach(function (chip) {
    chip.classList.toggle("selected", chip.dataset.app === appId);
  });
}

document.querySelectorAll(".app-chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    setAutomationAppSelection(chip.dataset.app);
  });
});

function openAddAutomationModal() {
  editingAutomationId = null;
  automationModalTitle.textContent = "Add Automation";
  automationNameInput.value = "";
  automationCommandInput.value = "";
  automationUrlInput.value = "";
  automationTargetInput.value = "";
  setAutomationAppSelection(null);
  deleteAutomationBtn.style.display = "none";
  automationOverlay.classList.add("show");
}

function openEditAutomation(id) {
  const auto = automations.find(function (a) { return a.id === id; });
  if (!auto) return;

  editingAutomationId = id;
  automationModalTitle.textContent = "Edit Automation";
  automationNameInput.value = auto.name;
  automationCommandInput.value = auto.command || "";
  automationUrlInput.value = auto.webhookUrl;
  automationTargetInput.value = auto.target || "";
  setAutomationAppSelection(auto.appId || null);
  deleteAutomationBtn.style.display = "block";
  automationOverlay.classList.add("show");
}

addAutomationBtn.addEventListener("click", openAddAutomationModal);

closeAutomationBtn.addEventListener("click", function () { automationOverlay.classList.remove("show"); });
automationOverlay.addEventListener("click", function (e) {
  if (e.target === automationOverlay) automationOverlay.classList.remove("show");
});

saveAutomationBtn.addEventListener("click", function () {
  const name = automationNameInput.value.trim();
  const command = automationCommandInput.value.trim();
  const webhookUrl = automationUrlInput.value.trim();
  const target = automationTargetInput.value.trim();
  const selectedAppChip = document.querySelector(".app-chip.selected");
  const appId = selectedAppChip ? selectedAppChip.dataset.app : "";

  if (!name || !webhookUrl || !appId) {
    alert("Name, App, and Webhook URL are required.");
    return;
  }

  if (editingAutomationId) {
    const auto = automations.find(function (a) { return a.id === editingAutomationId; });
    auto.name = name;
    auto.command = command;
    auto.webhookUrl = webhookUrl;
    auto.appId = appId;
    auto.target = target;
  } else {
    automations.push({
      id: "auto_" + Date.now(),
      name: name,
      command: command,
      webhookUrl: webhookUrl,
      appId: appId,
      target: target
    });
  }

  saveAutomations();
  renderAutomationList();
  renderConnectorsListInSettings();
  automationOverlay.classList.remove("show");
});

deleteAutomationBtn.addEventListener("click", function () {
  if (!editingAutomationId) return;
  if (confirm("Delete this automation?")) {
    deleteAutomation(editingAutomationId);
    automationOverlay.classList.remove("show");
  }
});

// ============ START THE APP ============

loadChatsFromStorage();
loadAppSettings();
loadProfile();
loadAutomations();
loadProjects();
loadSharedLinks();
updateActionButton();
updateHeaderRightState();
refreshPermissionStatuses();