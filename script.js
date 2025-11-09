// script.js - Merged: Supabase Auth + Original Chat Functionality
// Author: Moses - Frenzy Model 1.1 with Authentication

// ========================================
// SUPABASE CONFIGURATION
// ========================================
const SUPABASE_URL = "https://bhemodjjglfoqmnqhpxs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZW1vZGpqZ2xmb3FtbnFocHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODI0ODcsImV4cCI6MjA3ODI1ODQ4N30.czQCuoj3Tmv0-5LZ-mvYpE17NSYR2Mp4tm8mPUiLqJ4"; // Replace with your real key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// DOM REFERENCES - AUTH
// ========================================
const authOverlay = document.getElementById("auth-overlay");
const appContainer = document.getElementById("app-container");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabLoginBtn = document.getElementById("tab-login");
const tabRegisterBtn = document.getElementById("tab-register");
const authFeedback = document.getElementById("auth-feedback");

const maidIdLogin = document.getElementById("maid-id-login");
const passwordLogin = document.getElementById("password-login");
const maidIdRegister = document.getElementById("maid-id-register");
const passwordRegister = document.getElementById("password-register");

// ========================================
// DOM REFERENCES - CHAT
// ========================================
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const logoutBtn = document.getElementById("logout-btn");

// ========================================
// API CONFIGURATION
// ========================================
const API_KEY = "AIzaSyADfZP1FoX24QpmS2Y_m5c1V0KY5A3qB4U";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

let controller, typingInterval;

// System prompt
const systemPrompt = {
  role: "user",
  parts: [
    {
      text:
        "SYSTEM: You are Frenzy, a helpful, friendly, and concise AI chatbot created and fine-tuned by Issac Moses D. " +
        'Always identify yourself as "Frenzy" when asked about your name or identity. ' +
        "When asked who built you, clearly state that you were built by Issac Moses D. " +
        "Maintain a polite, professional tone and prioritize being helpful, accurate, and concise. " +
        "Don't mention in any conversation that you are made/created by Google."
    },
  ],
};

const chatHistory = [systemPrompt];
const userData = { message: "", file: {} };

// Global offline model instance
let offlineModel;

// ========================================
// AUTH UI HELPERS
// ========================================
function showAuthOverlay() {
  authOverlay.classList.remove("hidden");
  appContainer.classList.add("hidden");
}

function hideAuthOverlay() {
  authOverlay.classList.add("hidden");
  appContainer.classList.remove("hidden");
}

function showFeedback(text, isError = false) {
  authFeedback.textContent = text;
  authFeedback.style.color = isError ? "#ff6b6b" : "#4ade80";
  authFeedback.style.background = isError 
    ? "rgba(255, 107, 107, 0.1)" 
    : "rgba(74, 222, 128, 0.1)";
  authFeedback.style.border = isError
    ? "1px solid rgba(255, 107, 107, 0.3)"
    : "1px solid rgba(74, 222, 128, 0.3)";
}

// ========================================
// TAB SWITCHING
// ========================================
tabLoginBtn.addEventListener("click", () => {
  tabLoginBtn.classList.add("active");
  tabRegisterBtn.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  authFeedback.textContent = "";
});

tabRegisterBtn.addEventListener("click", () => {
  tabRegisterBtn.classList.add("active");
  tabLoginBtn.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  authFeedback.textContent = "";
});

// ========================================
// AUTHENTICATION HANDLERS
// ========================================
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = maidIdRegister.value.trim();
  const password = passwordRegister.value;

  if (!email || !password) {
    showFeedback("Please provide email and password.", true);
    return;
  }

  showFeedback("Creating account...");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      showFeedback("Registration error: " + error.message, true);
      return;
    }

    showFeedback("Account created! You can now login.");
    
    setTimeout(() => {
      tabLoginBtn.click();
      maidIdLogin.value = email;
      passwordLogin.value = "";
    }, 2000);

  } catch (err) {
    showFeedback("Unexpected error: " + err.message, true);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = maidIdLogin.value.trim();
  const password = passwordLogin.value;

  if (!email || !password) {
    showFeedback("Please provide email and password.", true);
    return;
  }

  showFeedback("Signing in...");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showFeedback("Login failed: " + error.message, true);
      return;
    }

    if (data && data.user) {
      showFeedback("Login successful!");
      await onAuthSuccess(data.user);
    }
  } catch (err) {
    showFeedback("Unexpected error: " + err.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await supabaseClient.auth.signOut();
      showFeedback("Logged out successfully.");
      showAuthOverlay();
      
      // Reset chat
      chatHistory.length = 0;
      chatHistory.push(systemPrompt);
      chatsContainer.innerHTML = "";
      document.body.classList.remove("chats-active", "bot-responding");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }
});

// ========================================
// POST-AUTH SETUP
// ========================================
async function onAuthSuccess(user) {
  hideAuthOverlay();
  console.log("Authenticated user:", user?.email);

  // Initialize chat UI
  initializeTheme();
  addNetworkStatusIndicator();
  addStatusMessageStyles();
  initializeOfflineModel();

  // Subscribe to auth state changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event);
    if (!session) {
      showAuthOverlay();
    }
  });
}

// ========================================
// SESSION CHECK ON LOAD
// ========================================
async function checkSessionOnLoad() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      showAuthOverlay();
      return;
    }

    const session = data?.session;

    if (session && session.user) {
      await onAuthSuccess(session.user);
    } else {
      showAuthOverlay();
    }
  } catch (err) {
    console.error("Error checking session:", err);
    showAuthOverlay();
  }
}

// ========================================
// OFFLINE AI MODEL FUNCTIONS
// ========================================
const isOnline = () => navigator.onLine;

const initializeOfflineModel = () => {
  if (typeof OfflineAIModel !== 'undefined') {
    offlineModel = new OfflineAIModel();
    console.log('Offline AI Model initialized successfully!');
    showTemporaryMessage('✅ Offline AI model loaded!', 'online-status');
    return true;
  }
  return false;
};

const useOfflineMode = (textElement, botMsgDiv) => {
  if (!offlineModel && !initializeOfflineModel()) {
    const fallbackResponse = "I'm setting up offline capabilities. Please check your connection!";
    typingEffect(fallbackResponse, textElement, botMsgDiv);
    chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
    chatHistory.push({ role: "model", parts: [{ text: fallbackResponse }] });
    document.body.classList.remove("bot-responding");
    botMsgDiv.classList.remove("loading");
    userData.file = {};
    return;
  }
  
  const responseText = offlineModel.generateResponse(userData.message);
  typingEffect(responseText, textElement, botMsgDiv);
  
  chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
  chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  
  document.body.classList.remove("bot-responding");
  botMsgDiv.classList.remove("loading");
  userData.file = {};
};

// ========================================
// THEME FUNCTIONS
// ========================================
const initializeTheme = () => {
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

  const darkVideo = document.getElementById("dark-video");
  const lightVideo = document.getElementById("light-video");

  if (isLightTheme) {
    if (darkVideo) { darkVideo.style.display = "none"; darkVideo.pause(); }
    if (lightVideo) { lightVideo.style.display = "block"; lightVideo.play(); }
  } else {
    if (lightVideo) { lightVideo.style.display = "none"; lightVideo.pause(); }
    if (darkVideo) { darkVideo.style.display = "block"; darkVideo.play(); }
  }
};

// ========================================
// NETWORK STATUS
// ========================================
const addNetworkStatusIndicator = () => {
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'network-status';
  statusIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    z-index: 1000;
    transition: background-color 0.3s;
    border: 2px solid var(--primary-color);
  `;
  
  document.body.appendChild(statusIndicator);
  updateNetworkStatus();
};

const updateNetworkStatus = () => {
  const statusIndicator = document.getElementById('network-status');
  if (statusIndicator) {
    if (isOnline()) {
      statusIndicator.style.backgroundColor = '#4ade80';
      statusIndicator.title = 'Online - Using Gemini API';
    } else {
      statusIndicator.style.backgroundColor = '#ef4444';
      statusIndicator.title = 'Offline - Using Local Model';
    }
  }
};

const showTemporaryMessage = (message, className) => {
  const existingMessage = document.querySelector('.status-message');
  if (existingMessage) existingMessage.remove();
  
  const statusMessage = document.createElement('div');
  statusMessage.className = `status-message ${className}`;
  statusMessage.textContent = message;
  statusMessage.style.cssText = `
    position: fixed;
    top: 30px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    z-index: 1000;
    max-width: 200px;
    animation: fadeOut 3s forwards;
  `;
  
  document.body.appendChild(statusMessage);
  setTimeout(() => statusMessage.remove(), 3000);
};

const addStatusMessageStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
};

window.addEventListener('online', () => {
  updateNetworkStatus();
  showTemporaryMessage('Back online! Using Gemini API.', 'online-status');
});

window.addEventListener('offline', () => {
  updateNetworkStatus();
  showTemporaryMessage('Offline. Using local model.', 'offline-status');
});

// ========================================
// CHAT FUNCTIONS
// ========================================
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent +=
        (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

const getCustomReply = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes("your name")) return "I'm Frenzy, your AI assistant!";
  if (lower.includes("who built you")) return "Hello! I'm Frenzy 1.1, created by Issac Moses D.";
  if (lower.includes("bye")) return "Goodbye! Have a great day!";
  return null;
};

const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  const userParts = [
    { text: userData.message },
    ...(userData.file && userData.file.data
      ? [
          {
            inline_data: (({ fileName, isImage, ...rest }) => rest)(
              userData.file
            ),
          },
        ]
      : []),
  ];

  chatHistory.push({
    role: "user",
    parts: userParts,
  });

  if (isOnline()) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: chatHistory }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API error");

      const candidate = data.candidates && data.candidates[0];
      const partText =
        candidate &&
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts[0] &&
        candidate.content.parts[0].text;
      const responseText = (partText || "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();

      typingEffect(responseText, textElement, botMsgDiv);
      chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    } catch (error) {
      console.error("Online API error, using offline:", error);
      useOfflineMode(textElement, botMsgDiv);
    } finally {
      userData.file = {};
    }
  } else {
    useOfflineMode(textElement, botMsgDiv);
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding"))
    return;
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file && userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img class="avatar" src="frenzy.svg" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(
      botMsgHTML,
      "bot-message",
      "loading"
    );
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();

    const customReply = getCustomReply(userData.message);
    if (customReply) {
      clearInterval(typingInterval);
      typingEffect(customReply, botMsgDiv.querySelector(".message-text"), botMsgDiv);
      chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
      chatHistory.push({ role: "model", parts: [{ text: customReply }] });
      document.body.classList.remove("bot-responding");
      botMsgDiv.classList.remove("loading");
    } else {
      generateResponse(botMsgDiv);
    }
  }, 600);
};

// ========================================
// EVENT LISTENERS
// ========================================
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    const previewImg = fileUploadWrapper.querySelector(".file-preview");
    if (previewImg) previewImg.src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage,
    };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  const botMsg = chatsContainer.querySelector(".bot-message.loading");
  if (botMsg) botMsg.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

  const darkVideo = document.getElementById("dark-video");
  const lightVideo = document.getElementById("light-video");
  if (isLightTheme) {
    if (darkVideo) { darkVideo.style.display = "none"; darkVideo.pause(); }
    if (lightVideo) { lightVideo.style.display = "block"; lightVideo.play(); }
  } else {
    if (lightVideo) { lightVideo.style.display = "none"; lightVideo.pause(); }
    if (darkVideo) { darkVideo.style.display = "block"; darkVideo.play(); }
  }
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatHistory.push(systemPrompt);
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  if (!wrapper) return;
  const shouldHide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Frenzy Chatbot with Auth...");
  await checkSessionOnLoad();

  if (!authOverlay.classList.contains("hidden")) {
    setTimeout(() => maidIdLogin.focus(), 100);
  }
});
