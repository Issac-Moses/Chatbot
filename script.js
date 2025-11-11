// chatbot.js — full working code with offline AI model integration
// Author: Updated for Moses Sir — uses a first user message as system instruction
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyADfZP1FoX24QpmS2Y_m5c1V0KY5A3qB4U";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

let controller, typingInterval;

// Use a "user" role as the initial system instruction because this endpoint only accepts "user" and "model"
const systemPrompt = {
  role: "user",
  parts: [
    {
      text:
        "SYSTEM: You are Frenzy, a helpful, friendly, and concise AI chatbot created and fine-tuned by Issac Moses D. " +
        'Always identify yourself as "Frenzy" when asked about your name or identity. ' +
        "When asked who built you, clearly state that you were built by Issac Moses D. " +
        "Maintain a polite, professional tone and prioritize being helpful, accurate, and concise." +
	"Don't mention in any conversation that you are made/created by Google."
    },
  ],
};

// Start chatHistory with the "system" instruction stored as a user role
const chatHistory = [systemPrompt];

const userData = { message: "", file: {} };

// Network status detection
const isOnline = () => navigator.onLine;

// Global offline model instance
let offlineModel;

// Initialize offline model when available
const initializeOfflineModel = () => {
  if (typeof OfflineAIModel !== 'undefined') {
    offlineModel = new OfflineAIModel();
    console.log('Offline AI Model initialized successfully!');
    
    // Show offline capability indicator
    showTemporaryMessage('✅ Offline AI model loaded successfully!', 'online-status');
    return true;
  }
  return false;
};

// Enhanced useOfflineMode function
const useOfflineMode = (textElement, botMsgDiv) => {
  if (!offlineModel && !initializeOfflineModel()) {
    // Fallback if model isn't loaded
    const fallbackResponse = "I'm setting up my offline capabilities. Please check your internet connection to download the AI model, then I'll work completely offline!";
    typingEffect(fallbackResponse, textElement, botMsgDiv);
    chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
    chatHistory.push({ role: "model", parts: [{ text: fallbackResponse }] });
    document.body.classList.remove("bot-responding");
    botMsgDiv.classList.remove("loading");
    userData.file = {};
    return;
  }
  
  // Use the offline AI model
  const responseText = offlineModel.generateResponse(userData.message);
  typingEffect(responseText, textElement, botMsgDiv);
  
  // Update chat history
  chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
  chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  
  document.body.classList.remove("bot-responding");
  botMsgDiv.classList.remove("loading");
  userData.file = {};
};

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

// Add network status indicator
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

// Update network status indicator
const updateNetworkStatus = () => {
  const statusIndicator = document.getElementById('network-status');
  if (statusIndicator) {
    if (isOnline()) {
      statusIndicator.style.backgroundColor = '#f8f8f8ff';
      statusIndicator.title = 'Online - Using Gemini API';
    } else {
      statusIndicator.style.backgroundColor = '#ff0808ff';
      statusIndicator.title = 'Offline - Using Local Model';
    }
  }
};

// Show temporary status messages
const showTemporaryMessage = (message, className) => {
  const existingMessage = document.querySelector('.status-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const statusMessage = document.createElement('div');
  statusMessage.className = `status-message ${className}`;
  statusMessage.textContent = message;
  statusMessage.style.cssText = `
    position: fixed;
    top: 30px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.8rem;
    z-index: 1000;
    max-width: 200px;
    animation: fadeOut 3s forwards;
  `;
  
  document.body.appendChild(statusMessage);
  
  // Remove after animation completes
  setTimeout(() => {
    if (statusMessage.parentNode) {
      statusMessage.parentNode.removeChild(statusMessage);
    }
  }, 3000);
};

// Add CSS for status messages
const addStatusMessageStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    .status-message.online-status {
      background: rgba(0, 14, 1, 0.8) !important;
    }
    
    .status-message.offline-status {
      background: rgba(255, 255, 255, 0.8) !important;
    }
  `;
  document.head.appendChild(style);
};

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  addNetworkStatusIndicator();
  addStatusMessageStyles();
  initializeOfflineModel(); // Initialize offline model
  setTimeout(updateNetworkStatus, 100);
});

// Listen for online/offline events
window.addEventListener('online', () => {
  updateNetworkStatus();
  showTemporaryMessage('Back online! Using Gemini API.', 'online-status');
});

window.addEventListener('offline', () => {
  updateNetworkStatus();
  showTemporaryMessage('You\'re offline. Using local model with limited responses.', 'offline-status');
});

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
  if (lower.includes("your owner")) return "I don't have an owner in the traditional sense. I am a large language model, created by Google AI. I am a computer program, not a pet or a possession. My development involved a large team of engineers, researchers, and other specialists of Issac Moses.";
  if (lower.includes("who built you")) return "Hello! I'm Frenzy 1.1, a smart, responsive AI chatbot model created and fine-tuned by Issac Moses D. My core purpose is to assist users by understanding complex queries and delivering accurate responses.";
  if (lower.includes("what's your background and who developed you?") || lower.includes("whats your background and who developed you")) return "Greetings! I am Frenzy 1.1, developed by Issac Moses D. I am optimized to deliver accurate, actionable responses and assist with a wide range of queries.";
  if (lower.includes("are you better than chatgpt")) return "I'm Frenzy — I aim to be helpful and accurate for your needs.";
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

  // Check if we're online and use Gemini API
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
      // If online API fails, fall back to offline mode
      console.error("Online API error, falling back to offline mode:", error);
      useOfflineMode(textElement, botMsgDiv);
    } finally {
      userData.file = {};
    }
  } else {
    // Use offline mode directly
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
      // keep chatHistory consistent (record user and model)
      chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
      chatHistory.push({ role: "model", parts: [{ text: customReply }] });
      document.body.classList.remove("bot-responding");
      botMsgDiv.classList.remove("loading");
    } else {
      generateResponse(botMsgDiv);
    }
  }, 600);
};

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
  // Reset chat history to only the system-as-user prompt so identity persists
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

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check if content is cached (offline ready)
        caches.has('static-cache-v1').then(function(hasCache) {
          if (hasCache) {
            console.log('Offline AI model is cached and ready!');
            // Show offline ready indicator
            const indicator = document.createElement('div');
            indicator.style.cssText = `
              position: fixed;
              top: 10px;
              left: 10px;
              background: #4CAF50;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 12px;
              z-index: 1000;
            `;
            indicator.textContent = '🟢 Offline Ready';
            document.body.appendChild(indicator);
            
            // Remove after 3 seconds
            setTimeout(() => indicator.remove(), 3000);
          }
        });
      })
      .catch(function(error) {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
