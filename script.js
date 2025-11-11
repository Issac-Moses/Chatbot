// script.js - Enhanced with Toggle Sidebar & Smart Delete Button
// Author: Moses - Frenzy Model 1.1 with Authentication & Chat History

// ========================================
// SUPABASE CONFIGURATION
// ========================================
const SUPABASE_URL = "https://bhemodjjglfoqmnqhpxs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZW1vZGpqZ2xmb3FtbnFocHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODI0ODcsImV4cCI6MjA3ODI1ODQ4N30.czQCuoj3Tmv0-5LZ-mvYpE17NSYR2Mp4tm8mPUiLqJ4";

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
// DOM REFERENCES - CHAT HISTORY SIDEBAR
// ========================================
const chatHistorySidebar = document.getElementById("chat-history-sidebar");
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const chatSessionsList = document.getElementById("chat-sessions-list");
const sidebarOverlay = document.createElement("div");

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
const API_KEY = "AIzaSyASua0FXfN5CsISziKcuOKXrgrY4k5tT3w";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${API_KEY}`;

let controller, typingInterval;
let currentUserId = null;
let currentChatSessionId = null;
let isLoadingHistory = false;
let chatSessions = [];

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

// ========================================
// CHAT SESSION MANAGEMENT
// ========================================

// Generate a unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create a new chat session
const createNewChatSession = () => {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    title: "New Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0
  };
  
  chatSessions.unshift(session);
  currentChatSessionId = sessionId;
  
  // Clear current chat
  chatHistory.length = 0;
  chatHistory.push(systemPrompt);
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
  
  // Update sidebar
  renderChatSessions();
  saveChatSessionsToStorage();
  updateDeleteButton();
  
  return sessionId;
};

// Get chat sessions from localStorage
const getChatSessionsFromStorage = () => {
  try {
    const sessions = localStorage.getItem(`chat_sessions_${currentUserId}`);
    return sessions ? JSON.parse(sessions) : [];
  } catch (error) {
    console.error('Error loading chat sessions:', error);
    return [];
  }
};

// Save chat sessions to localStorage
const saveChatSessionsToStorage = () => {
  try {
    localStorage.setItem(`chat_sessions_${currentUserId}`, JSON.stringify(chatSessions));
  } catch (error) {
    console.error('Error saving chat sessions:', error);
  }
};

// Update current session title based on first user message
const updateSessionTitle = (message) => {
  if (!currentChatSessionId) return;
  
  const session = chatSessions.find(s => s.id === currentChatSessionId);
  if (session && session.title === "New Chat") {
    session.title = message.length > 50 ? message.substring(0, 47) + "..." : message;
    session.updatedAt = new Date().toISOString();
    session.messageCount = (session.messageCount || 0) + 1;
    
    renderChatSessions();
    saveChatSessionsToStorage();
  }
};

// Render chat sessions in sidebar
const renderChatSessions = () => {
  if (!chatSessionsList) return;
  
  if (chatSessions.length === 0) {
    chatSessionsList.innerHTML = `
      <div class="no-chats-message">
        <p>No chat history yet</p>
        <p style="font-size: 12px; margin-top: 8px;">Start a new conversation!</p>
      </div>
    `;
    return;
  }
  
  const sortedSessions = [...chatSessions].sort((a, b) => 
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  
  chatSessionsList.innerHTML = sortedSessions.map(session => `
    <div class="chat-session-item ${session.id === currentChatSessionId ? 'active' : ''}" 
         data-session-id="${session.id}">
      <div class="chat-session-content">
        <div class="chat-session-title">${session.title}</div>
        <div class="chat-session-date">${formatDate(session.updatedAt)}</div>
      </div>
      <button class="delete-session-btn" data-session-id="${session.id}" title="Delete this chat">
        <span class="material-symbols-rounded">delete</span>
      </button>
    </div>
  `).join('');
};

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Load chat session
const loadChatSession = async (sessionId) => {
  if (!sessionId || sessionId === currentChatSessionId) return;
  
  currentChatSessionId = sessionId;
  
  // Clear current chat
  chatHistory.length = 0;
  chatHistory.push(systemPrompt);
  chatsContainer.innerHTML = "";
  
  // Load chat history for this session from Supabase
  await loadChatHistory(currentUserId, sessionId);
  
  // Update UI
  renderChatSessions();
  updateDeleteButton();
  document.body.classList.remove("chats-active");
  if (chatsContainer.children.length > 0) {
    document.body.classList.add("chats-active");
  }
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
};

// Delete a specific chat session
const deleteSpecificSession = async (sessionId) => {
  if (!sessionId) return;
  
  // Delete from database
  if (currentUserId) {
    await deleteChatHistory(currentUserId, sessionId);
  }
  
  // Remove from local sessions
  chatSessions = chatSessions.filter(session => session.id !== sessionId);
  saveChatSessionsToStorage();
  
  // If deleted session was current, switch to another or create new
  if (sessionId === currentChatSessionId) {
    chatHistory.length = 0;
    chatHistory.push(systemPrompt);
    chatsContainer.innerHTML = "";
    document.body.classList.remove("chats-active", "bot-responding");
    
    if (chatSessions.length > 0) {
      await loadChatSession(chatSessions[0].id);
    } else {
      createNewChatSession();
    }
  }
  
  renderChatSessions();
  updateDeleteButton();
};

// ========================================
// SIDEBAR MANAGEMENT
// ========================================

// Initialize sidebar overlay
const initializeSidebarOverlay = () => {
  sidebarOverlay.className = 'sidebar-overlay';
  document.body.appendChild(sidebarOverlay);
  sidebarOverlay.addEventListener('click', closeSidebar);
};

// Toggle sidebar
const toggleSidebar = () => {
  const isActive = chatHistorySidebar.classList.contains('active');
  if (isActive) {
    closeSidebar();
  } else {
    openSidebar();
  }
};

// Open sidebar
const openSidebar = () => {
  chatHistorySidebar.classList.add('active');
  if (window.innerWidth <= 768) {
    sidebarOverlay.classList.add('active');
  }
};

// Close sidebar
const closeSidebar = () => {
  chatHistorySidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
};

// ========================================
// DELETE BUTTON MANAGEMENT - FIXED VERSION
// ========================================

// Update delete button appearance and functionality
const updateDeleteButton = () => {
  const deleteBtn = document.getElementById('delete-chats-btn');
  
  // Check if delete button exists
  if (!deleteBtn) {
    console.warn('⚠️ Delete button not found');
    return;
  }
  
  const deleteIcon = deleteBtn.querySelector('.material-symbols-rounded');
  
  // Check if delete icon exists
  if (!deleteIcon) {
    console.warn('⚠️ Delete icon not found');
    return;
  }
  
  const hasActiveChat = document.body.classList.contains("chats-active");
  
  if (hasActiveChat) {
    // In conversation: Show back arrow
    deleteIcon.textContent = 'arrow_back';
    deleteBtn.title = 'Back to main';
    deleteBtn.setAttribute('aria-label', 'Back to main');
  } else {
    // In main window: Show delete icon
    deleteIcon.textContent = 'delete';
    deleteBtn.title = 'Delete all chats';
    deleteBtn.setAttribute('aria-label', 'Delete all chats');
  }
};

// Handle delete button click
const handleDeleteButtonClick = async () => {
  const deleteBtn = document.getElementById('delete-chats-btn');
  if (!deleteBtn) return;
  
  const hasActiveChat = document.body.classList.contains("chats-active");
  
  if (hasActiveChat) {
    // Back button functionality: Return to main window
    chatHistory.length = 0;
    chatHistory.push(systemPrompt);
    chatsContainer.innerHTML = "";
    document.body.classList.remove("chats-active", "bot-responding");
    currentChatSessionId = null;
    renderChatSessions();
    updateDeleteButton();
  } else {
    // Delete all chat history
    if (chatSessions.length === 0) {
      showTemporaryMessage('No chats to delete', 'info-status');
      return;
    }
    
    if (confirm("Are you sure you want to delete all chat history? This cannot be undone.")) {
      console.log('🗑️ Deleting all chat history...');
      
      // Delete from database
      if (currentUserId) {
        await deleteChatHistory(currentUserId);
      }
      
      // Clear local sessions
      chatSessions = [];
      saveChatSessionsToStorage();
      
      // Clear current chat
      chatHistory.length = 0;
      chatHistory.push(systemPrompt);
      chatsContainer.innerHTML = "";
      document.body.classList.remove("chats-active", "bot-responding");
      
      // Create new session
      createNewChatSession();
      
      console.log('✅ All chat history cleared');
      showTemporaryMessage('All chats deleted', 'success-status');
    }
  }
};

// ========================================
// HELPER FUNCTION: Get Current Avatar SVG Path
// ========================================
const getAvatarPath = () => {
  const isLightTheme = document.body.classList.contains("light-theme");
  return isLightTheme ? "frenzy-light.svg" : "frenzy-dark.svg";
};

// ========================================
// HELPER FUNCTION: Update All Avatars in Chat
// ========================================
const updateAllAvatars = () => {
  const avatarPath = getAvatarPath();
  const allAvatars = document.querySelectorAll(".chats-container .avatar");
  allAvatars.forEach(avatar => {
    avatar.src = avatarPath;
  });
};

// ========================================
// CHAT HISTORY DATABASE FUNCTIONS
// ========================================

// Load chat history from Supabase for current user and session
const loadChatHistory = async (userId, sessionId = null) => {
  if (isLoadingHistory) return;
  isLoadingHistory = true;

  try {
    console.log('📥 Loading chat history for user:', userId, 'session:', sessionId);
    
    let query = supabaseClient
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error loading chat history:', error);
      isLoadingHistory = false;
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} messages from history`);
      
      chatsContainer.innerHTML = "";
      chatHistory.length = 0;
      chatHistory.push(systemPrompt);

      data.forEach(record => {
        const messageRole = record.message_role;
        const messageText = record.message_text;
        const messageFile = record.message_file;

        if (messageRole === 'user') {
          const userParts = [{ text: messageText }];
          if (messageFile && messageFile.data) {
            userParts.push({
              inline_data: {
                data: messageFile.data,
                mime_type: messageFile.mime_type
              }
            });
          }
          chatHistory.push({ role: "user", parts: userParts });

          const userMsgHTML = `
            <p class="message-text"></p>
            ${
              messageFile && messageFile.data
                ? messageFile.isImage
                  ? `<img src="data:${messageFile.mime_type};base64,${messageFile.data}" class="img-attachment" />`
                  : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${messageFile.fileName}</p>`
                : ""
            }
          `;
          const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
          userMsgDiv.querySelector(".message-text").textContent = messageText;
          chatsContainer.appendChild(userMsgDiv);

        } else if (messageRole === 'model') {
          chatHistory.push({ role: "model", parts: [{ text: messageText }] });

          const avatarPath = getAvatarPath();
          const botMsgHTML = `<img class="avatar" src="${avatarPath}" /> <p class="message-text"></p>`;
          const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");
          botMsgDiv.querySelector(".message-text").textContent = messageText;
          chatsContainer.appendChild(botMsgDiv);
        }
      });

      document.body.classList.add("chats-active");
      updateDeleteButton();
      scrollToBottom();
    } else {
      console.log('ℹ️ No previous chat history found');
    }
  } catch (err) {
    console.error('❌ Unexpected error loading chat history:', err);
  } finally {
    isLoadingHistory = false;
  }
};

// Save a message to Supabase with session ID
const saveChatMessage = async (userId, role, text, file = null, sessionId = null) => {
  if (!userId) {
    console.warn('⚠️ No userId provided, skipping save');
    return;
  }

  try {
    console.log(`💾 Saving ${role} message to database`);
    
    const { error } = await supabaseClient
      .from('chat_history')
      .insert({
        user_id: userId,
        message_role: role,
        message_text: text,
        message_file: file,
        session_id: sessionId || currentChatSessionId
      });

    if (error) {
      console.error('❌ Error saving chat message:', error);
    } else {
      console.log('✅ Message saved successfully');
    }
  } catch (err) {
    console.error('❌ Unexpected error saving message:', err);
  }
};

// Delete all chat history for current user and session
const deleteChatHistory = async (userId, sessionId = null) => {
  if (!userId) {
    console.warn('⚠️ No userId provided, skipping delete');
    return;
  }

  try {
    console.log('🗑️ Deleting chat history for user:', userId, 'session:', sessionId);
    
    let query = supabaseClient
      .from('chat_history')
      .delete()
      .eq('user_id', userId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { error } = await query;

    if (error) {
      console.error('❌ Error deleting chat history:', error);
    } else {
      console.log('✅ Chat history deleted successfully');
    }
  } catch (err) {
    console.error('❌ Unexpected error deleting chat history:', err);
  }
};

// ========================================
// AUTH UI HELPERS
// ========================================
function showAuthOverlay() {
  authOverlay.classList.remove("hidden");
  appContainer.classList.add("hidden");
  if (chatHistorySidebar) chatHistorySidebar.classList.add("hidden");
}

function hideAuthOverlay() {
  authOverlay.classList.add("hidden");
  appContainer.classList.remove("hidden");
  if (chatHistorySidebar) chatHistorySidebar.classList.remove("hidden");
}

function showFeedback(text, isError = false) {
  if (!authFeedback) return;
  
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
if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
  tabLoginBtn.addEventListener("click", () => {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    if (authFeedback) authFeedback.textContent = "";
  });

  tabRegisterBtn.addEventListener("click", () => {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    if (authFeedback) authFeedback.textContent = "";
  });
}

// ========================================
// AUTHENTICATION HANDLERS
// ========================================
if (registerForm) {
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
        if (tabLoginBtn) tabLoginBtn.click();
        if (maidIdLogin) maidIdLogin.value = email;
        if (passwordLogin) passwordLogin.value = "";
      }, 2000);

    } catch (err) {
      showFeedback("Unexpected error: " + err.message, true);
    }
  });
}

if (loginForm) {
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
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        console.log('🚪 Logging out user');
        await supabaseClient.auth.signOut();
        showFeedback("Logged out successfully.");
        showAuthOverlay();
        
        // Reset chat
        currentUserId = null;
        currentChatSessionId = null;
        chatSessions = [];
        chatHistory.length = 0;
        chatHistory.push(systemPrompt);
        if (chatsContainer) chatsContainer.innerHTML = "";
        document.body.classList.remove("chats-active", "bot-responding");
        closeSidebar();
        updateDeleteButton();
      } catch (err) {
        console.error("❌ Logout error:", err);
      }
    }
  });
}

// ========================================
// POST-AUTH SETUP
// ========================================
async function onAuthSuccess(user) {
  hideAuthOverlay();
  currentUserId = user.id;
  console.log("✅ Authenticated user:", user?.email);

  // Initialize sidebar
  initializeSidebarOverlay();
  
  // Load chat sessions
  chatSessions = getChatSessionsFromStorage();
  
  // Create initial session if none exists
  if (chatSessions.length === 0) {
    createNewChatSession();
  } else {
    const mostRecentSession = [...chatSessions].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];
    currentChatSessionId = mostRecentSession.id;
  }

  // Initialize chat UI
  initializeTheme();
  addNetworkStatusIndicator();
  addStatusMessageStyles();
  updateDeleteButton();

  // Load user's chat history for current session
  if (currentChatSessionId) {
    await loadChatHistory(currentUserId, currentChatSessionId);
  }

  // Render chat sessions
  renderChatSessions();

  // Subscribe to auth state changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("🔄 Auth state changed:", event);
    if (event === 'SIGNED_OUT') {
      showAuthOverlay();
      currentUserId = null;
      currentChatSessionId = null;
      chatSessions = [];
      chatHistory.length = 0;
      chatHistory.push(systemPrompt);
      if (chatsContainer) chatsContainer.innerHTML = "";
      document.body.classList.remove("chats-active");
      closeSidebar();
      updateDeleteButton();
    }
  });
}

// ========================================
// SESSION CHECK ON LOAD
// ========================================
async function checkSessionOnLoad() {
  try {
    console.log('🔍 Checking for existing session...');
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("❌ Session error:", error);
      showAuthOverlay();
      return;
    }

    const session = data?.session;

    if (session && session.user) {
      console.log('✅ Session found, logging in...');
      await onAuthSuccess(session.user);
    } else {
      console.log('ℹ️ No session found, showing login');
      showAuthOverlay();
    }
  } catch (err) {
    console.error("❌ Error checking session:", err);
    showAuthOverlay();
  }
}

// ========================================
// NETWORK CHECK FUNCTION
// ========================================
const isOnline = () => navigator.onLine;

// ========================================
// THEME FUNCTIONS
// ========================================
const initializeTheme = () => {
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
  }

  const darkVideo = document.getElementById("dark-video");
  const lightVideo = document.getElementById("light-video");

  if (isLightTheme) {
    if (darkVideo) { darkVideo.style.display = "none"; darkVideo.pause(); }
    if (lightVideo) { lightVideo.style.display = "block"; lightVideo.play(); }
  } else {
    if (lightVideo) { lightVideo.style.display = "none"; lightVideo.pause(); }
    if (darkVideo) { darkVideo.style.display = "block"; darkVideo.play(); }
  }
  
  updateAllAvatars();
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
      statusIndicator.title = 'Offline - No Connection';
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
  showTemporaryMessage('Connection lost. Please check your internet.', 'offline-status');
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

const scrollToBottom = () => {
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
};

const typingEffect = (text, textElement, botMsgDiv) => {
  if (!textElement) return;
  
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
      if (botMsgDiv) botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      updateDeleteButton();
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

  // Save user message to database with session ID
  if (currentUserId) {
    const fileData = userData.file && userData.file.data ? {
      fileName: userData.file.fileName,
      data: userData.file.data,
      mime_type: userData.file.mime_type,
      isImage: userData.file.isImage
    } : null;
    
    await saveChatMessage(currentUserId, 'user', userData.message, fileData, currentChatSessionId);
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ API Response Error:", data);
      throw new Error(data.error?.message || `API error: ${response.status}`);
    }

    // Extract response text with better error handling
    let responseText = "";
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        responseText = candidate.content.parts[0].text || "";
      }
    }

    // If no response text, throw error
    if (!responseText) {
      console.error("❌ Empty response from API:", data);
      throw new Error("Empty response from API");
    }

    // Clean response text
    responseText = responseText
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();

    console.log("✅ Bot response:", responseText.substring(0, 100) + "...");

    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    
    // Save bot response to database with session ID
    if (currentUserId) {
      await saveChatMessage(currentUserId, 'model', responseText, null, currentChatSessionId);
    }
  } catch (error) {
    console.error("❌ API error:", error);
    const errorMessage = "Sorry, I encountered an error. Please check your connection and try again.";
    typingEffect(errorMessage, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: errorMessage }] });
    
    // Save error message to database with session ID
    if (currentUserId) {
      await saveChatMessage(currentUserId, 'model', errorMessage, null, currentChatSessionId);
    }
  } finally {
    userData.file = {};
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding"))
    return;
  
  // Create new session if none exists
  if (!currentChatSessionId || chatSessions.length === 0) {
    createNewChatSession();
  }
  
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  if (fileUploadWrapper) {
    fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  }
  updateDeleteButton();

  // Update session title with first message
  if (chatSessions.find(s => s.id === currentChatSessionId)?.title === "New Chat") {
    updateSessionTitle(userMessage);
  }

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
  if (chatsContainer) chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const avatarPath = getAvatarPath();
    const botMsgHTML = `<img class="avatar" src="${avatarPath}" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(
      botMsgHTML,
      "bot-message",
      "loading"
    );
    if (chatsContainer) chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();

    const customReply = getCustomReply(userData.message);
    if (customReply) {
      clearInterval(typingInterval);
      typingEffect(customReply, botMsgDiv.querySelector(".message-text"), botMsgDiv);
      chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
      chatHistory.push({ role: "model", parts: [{ text: customReply }] });
      
      // Save custom reply messages to database with session ID
      if (currentUserId) {
        saveChatMessage(currentUserId, 'user', userData.message, null, currentChatSessionId).then(() => {
          saveChatMessage(currentUserId, 'model', customReply, null, currentChatSessionId);
        });
      }
      
      document.body.classList.remove("bot-responding");
      if (botMsgDiv) botMsgDiv.classList.remove("loading");
      updateDeleteButton();
    } else {
      generateResponse(botMsgDiv);
    }
  }, 600);
};

// ========================================
// EVENT LISTENERS
// ========================================

// Sidebar event listeners
if (menuToggleBtn) {
  menuToggleBtn.addEventListener("click", toggleSidebar);
}

if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener("click", toggleSidebar);
}

if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    createNewChatSession();
    closeSidebar();
  });
}

// Event delegation for chat session items and delete buttons
if (chatSessionsList) {
  chatSessionsList.addEventListener("click", (e) => {
    // Handle delete button click
    const deleteBtn = e.target.closest(".delete-session-btn");
    if (deleteBtn) {
      e.stopPropagation();
      const sessionId = deleteBtn.dataset.sessionId;
      if (confirm("Delete this chat session?")) {
        deleteSpecificSession(sessionId);
      }
      return;
    }
    
    // Handle session item click
    const sessionItem = e.target.closest(".chat-session-item");
    if (sessionItem) {
      const sessionId = sessionItem.dataset.sessionId;
      loadChatSession(sessionId);
    }
  });
}

// Close sidebar when clicking on overlay
sidebarOverlay.addEventListener("click", closeSidebar);

// Responsive sidebar behavior
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebarOverlay.classList.remove("active");
  }
});

// Delete button with smart functionality
const deleteBtn = document.getElementById('delete-chats-btn');
if (deleteBtn) {
  deleteBtn.addEventListener("click", handleDeleteButtonClick);
}

// Monitor chat state changes to update delete button
const observer = new MutationObserver(() => {
  updateDeleteButton();
});

observer.observe(document.body, {
  attributes: true,
  attributeFilter: ['class']
});

// File input and other existing event listeners
if (fileInput) {
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
      if (fileUploadWrapper) {
        fileUploadWrapper.classList.add(
          "active",
          isImage ? "img-attached" : "file-attached"
        );
      }
      userData.file = {
        fileName: file.name,
        data: base64String,
        mime_type: file.type,
        isImage,
      };
    };
  });
}

const cancelFileBtn = document.querySelector("#cancel-file-btn");
if (cancelFileBtn) {
  cancelFileBtn.addEventListener("click", () => {
    userData.file = {};
    if (fileUploadWrapper) {
      fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
    }
  });
}

const stopResponseBtn = document.querySelector("#stop-response-btn");
if (stopResponseBtn) {
  stopResponseBtn.addEventListener("click", () => {
    controller?.abort();
    userData.file = {};
    clearInterval(typingInterval);
    const botMsg = chatsContainer.querySelector(".bot-message.loading");
    if (botMsg) botMsg.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    updateDeleteButton();
  });
}

if (themeToggleBtn) {
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
    
    updateAllAvatars();
  });
}

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    if (promptInput) {
      promptInput.value = suggestion.querySelector(".text").textContent;
      promptForm.dispatchEvent(new Event("submit"));
    }
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

// FIXED: Prompt form submit event - Enable Enter key
if (promptForm) {
  promptForm.addEventListener("submit", handleFormSubmit);
}

// Enable Enter key on prompt input
if (promptInput) {
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      promptForm.dispatchEvent(new Event("submit"));
    }
  });
}

const addFileBtn = promptForm.querySelector("#add-file-btn");
if (addFileBtn) {
  addFileBtn.addEventListener("click", () => fileInput.click());
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing Frenzy Chatbot with Auth & Chat History Sidebar...");
  await checkSessionOnLoad();

  if (authOverlay && !authOverlay.classList.contains("hidden")) {
    setTimeout(() => {
      if (maidIdLogin) maidIdLogin.focus();
    }, 100);
  }
});
