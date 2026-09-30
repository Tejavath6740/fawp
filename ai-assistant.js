/* FAWP Global AI Farmer Assistant
   Add this line to every HTML page before </body>:
   <script src="ai-assistant.js"></script>
*/

(() => {
  const API_URL = "https://fawp.onrender.com/api/ai-assistant";
  const STORAGE_KEY = "fawp_ai_chat_history";

  // Prevent duplicate assistant if the script is loaded twice
  if (document.getElementById("fawp-ai-assistant")) return;

  // =========================
  // CSS
  // =========================

  const style = document.createElement("style");

  style.textContent = `
    #fawp-ai-assistant {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 99999;
      font-family: Arial, Helvetica, sans-serif;
    }

    #fawp-ai-button {
      width: 58px;
      height: 58px;
      border: none;
      border-radius: 50%;
      background: #2e7d32;
      color: white;
      font-size: 27px;
      cursor: pointer;
      box-shadow: 0 5px 18px rgba(0,0,0,.25);
      transition: transform 0.2s;
    }

    #fawp-ai-button:hover {
      background: #256628;
      transform: scale(1.04);
    }

    #fawp-ai-panel {
      display: none;
      position: absolute;
      right: 0;
      bottom: 72px;
      width: 350px;
      max-width: calc(100vw - 30px);
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,.25);
      overflow: hidden;
      border: 1px solid #ddd;
    }

    #fawp-ai-panel.open {
      display: flex;
      flex-direction: column;
    }

    #fawp-ai-header {
      background: #2e7d32;
      color: white;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #fawp-ai-header-title {
      font-size: 16px;
      font-weight: bold;
    }

    #fawp-ai-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
    }

    #fawp-ai-clear {
      background: transparent;
      border: none;
      color: #e8f5e9;
      font-size: 11px;
      cursor: pointer;
      margin-right: 8px;
    }

    #fawp-ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: #f7f7f7;
    }

    .fawp-ai-message {
      margin: 8px 0;
      padding: 10px 12px;
      border-radius: 12px;
      max-width: 85%;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.45;
    }

    .fawp-ai-user {
      margin-left: auto;
      background: #dcf8df;
      color: #173b1a;
    }

    .fawp-ai-bot {
      margin-right: auto;
      background: white;
      border: 1px solid #e1e1e1;
      color: #222;
    }

    #fawp-ai-input-area {
      display: flex;
      gap: 8px;
      padding: 10px;
      border-top: 1px solid #ddd;
      background: white;
    }

    #fawp-ai-input {
      flex: 1;
      min-width: 0;
      resize: none;
      height: 42px;
      border: 1px solid #ccc;
      border-radius: 10px;
      padding: 10px;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
    }

    #fawp-ai-input:focus {
      border-color: #2e7d32;
    }

    #fawp-ai-send {
      width: 68px;
      border: none;
      border-radius: 10px;
      background: #2e7d32;
      color: white;
      font-weight: bold;
      cursor: pointer;
    }

    #fawp-ai-send:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .fawp-ai-typing {
      opacity: .7;
      font-style: italic;
    }

    @media (max-width: 480px) {
      #fawp-ai-assistant {
        right: 12px;
        bottom: 12px;
      }

      #fawp-ai-panel {
        width: calc(100vw - 24px);
        height: 70vh;
        bottom: 70px;
      }
    }
  `;

  document.head.appendChild(style);

  // =========================
  // HTML
  // =========================

  const root = document.createElement("div");

  root.id = "fawp-ai-assistant";

  root.innerHTML = `
    <div id="fawp-ai-panel" aria-label="AI Farmer Assistant">

      <div id="fawp-ai-header">

        <div id="fawp-ai-header-title">
          🤖 AI Farmer Assistant
        </div>

        <div>
          <button id="fawp-ai-clear" type="button">
            Clear
          </button>

          <button
            id="fawp-ai-close"
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

      </div>

      <div id="fawp-ai-messages"></div>

      <div id="fawp-ai-input-area">

        <textarea
          id="fawp-ai-input"
          placeholder="Ask about crops, soil, pests, schemes..."
          aria-label="Ask the AI Farmer Assistant"
        ></textarea>

        <button
          id="fawp-ai-send"
          type="button"
        >
          Send
        </button>

      </div>

    </div>

    <button
      id="fawp-ai-button"
      type="button"
      aria-label="Open AI Farmer Assistant"
      title="AI Farmer Assistant"
    >
      🤖
    </button>
  `;

  document.body.appendChild(root);

  // =========================
  // Get Elements
  // =========================

  const button =
    document.getElementById("fawp-ai-button");

  const panel =
    document.getElementById("fawp-ai-panel");

  const closeButton =
    document.getElementById("fawp-ai-close");

  const clearButton =
    document.getElementById("fawp-ai-clear");

  const messages =
    document.getElementById("fawp-ai-messages");

  const input =
    document.getElementById("fawp-ai-input");

  const sendButton =
    document.getElementById("fawp-ai-send");

  // =========================
  // Chat History
  // =========================

  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(history)) {
      history = [];
    }

  } catch {
    history = [];
  }

  function saveHistory() {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(-50))
      );

    } catch {
      // Ignore storage errors
    }

  }

  // =========================
  // Add Message
  // =========================

  function addMessage(
    text,
    type,
    save = true
  ) {

    const message =
      document.createElement("div");

    message.className =
      `fawp-ai-message fawp-ai-${type}`;

    message.textContent = text;

    messages.appendChild(message);

    messages.scrollTop =
      messages.scrollHeight;

    if (save) {

      history.push({
        text: text,
        type: type
      });

      saveHistory();

    }
  }

  // =========================
  // Welcome Message
  // =========================

  function showWelcomeIfNeeded() {

    if (history.length === 0) {

      addMessage(
        "Namaste! 👋 I am your AI Farmer Assistant. Ask me about crops, soil, fertilizers, irrigation, pests, diseases, or government schemes.",
        "bot"
      );

    }

  }

  // =========================
  // Render Old Messages
  // =========================

  function renderHistory() {

    messages.innerHTML = "";

    history.forEach(item => {

      addMessage(
        item.text,
        item.type,
        false
      );

    });

    showWelcomeIfNeeded();

  }

  // =========================
  // Open Assistant
  // =========================

  function openAssistant() {

    panel.classList.add("open");

    input.focus();

  }

  // =========================
  // Close Assistant
  // =========================

  function closeAssistant() {

    panel.classList.remove("open");

  }

  // =========================
  // Send Message
  // =========================

  async function sendMessage() {

    const message =
      input.value.trim();

    if (
      !message ||
      sendButton.disabled
    ) {
      return;
    }

    // Show user message
    addMessage(
      message,
      "user"
    );

    input.value = "";

    sendButton.disabled = true;
    input.disabled = true;

    // Typing indicator
    const typing =
      document.createElement("div");

    typing.className =
      "fawp-ai-message fawp-ai-bot fawp-ai-typing";

    typing.textContent =
      "Thinking...";

    messages.appendChild(typing);

    messages.scrollTop =
      messages.scrollHeight;

    try {

      const response =
        await fetch(API_URL, {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            message: message
          })

        });

      let data = {};

      try {

        data =
          await response.json();

      } catch {

        data = {};

      }

      typing.remove();

      if (!response.ok) {

        throw new Error(
          data.error ||
          "The server could not process your question."
        );

      }

      const answer =
        data.answer ||
        "Sorry, I did not receive an answer.";

      addMessage(
        answer,
        "bot"
      );

    } catch (error) {

      typing.remove();

      addMessage(
        "Sorry, I could not connect to the AI assistant right now. Please try again in a moment.",
        "bot"
      );

      console.error(
        "FAWP AI Assistant error:",
        error
      );

    } finally {

      sendButton.disabled = false;
      input.disabled = false;

      input.focus();

    }

  }

  // =========================
  // Button Events
  // =========================

  button.addEventListener(
    "click",
    () => {

      if (
        panel.classList.contains("open")
      ) {

        closeAssistant();

      } else {

        openAssistant();

      }

    }
  );

  // Close button
  closeButton.addEventListener(
    "click",
    closeAssistant
  );

  // =========================
  // Clear Chat
  // =========================

  clearButton.addEventListener(
    "click",
    () => {

      history = [];

      saveHistory();

      renderHistory();

      input.focus();

    }
  );

  // =========================
  // Send Button
  // =========================

  sendButton.addEventListener(
    "click",
    sendMessage
  );

  // =========================
  // Enter Key
  // =========================

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }

    }
  );

  // =========================
  // Start Assistant
  // =========================

  renderHistory();

})();