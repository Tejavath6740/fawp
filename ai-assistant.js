(() => {
    const API_URL = "https://fawp.onrender.com/api/ai-assistant";
    const STORAGE_KEY = "fawp_ai_chat_history";

    function loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(history.slice(-50))
            );
        } catch {
            // Ignore localStorage errors.
        }
    }

    function createAssistant() {
        if (document.getElementById("fawp-ai-button")) return;

        const style = document.createElement("style");

        style.textContent = `
            #fawp-ai-button {
                position: fixed;
                right: 22px;
                bottom: 22px;
                width: 58px;
                height: 58px;
                border: none;
                border-radius: 50%;
                background: #198754;
                color: white;
                font-size: 28px;
                cursor: pointer;
                z-index: 99999;
                box-shadow: 0 5px 18px rgba(0,0,0,.25);
            }

            #fawp-ai-panel {
                position: fixed;
                right: 22px;
                bottom: 92px;
                width: 360px;
                max-width: calc(100vw - 30px);
                height: 500px;
                max-height: calc(100vh - 120px);
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 30px rgba(0,0,0,.25);
                z-index: 99998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: Arial, sans-serif;
                border: 1px solid #ddd;
            }

            #fawp-ai-header {
                background: #198754;
                color: white;
                padding: 13px 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            #fawp-ai-title {
                font-weight: 700;
                font-size: 16px;
            }

            #fawp-ai-actions {
                display: flex;
                gap: 6px;
            }

            #fawp-ai-actions button {
                border: none;
                background: rgba(255,255,255,.18);
                color: white;
                border-radius: 6px;
                padding: 5px 8px;
                cursor: pointer;
            }

            #fawp-ai-messages {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                background: #f7f7f7;
            }

            .fawp-ai-message {
                margin-bottom: 10px;
                padding: 9px 11px;
                border-radius: 10px;
                line-height: 1.45;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 14px;
            }

            .fawp-ai-user {
                background: #dff4e8;
                margin-left: 35px;
            }

            .fawp-ai-bot {
                background: white;
                border: 1px solid #e2e2e2;
                margin-right: 20px;
            }

            #fawp-ai-input-area {
                padding: 10px;
                border-top: 1px solid #ddd;
                background: white;
            }

            #fawp-ai-input-row {
                display: flex;
                gap: 8px;
            }

            #fawp-ai-input {
                flex: 1;
                resize: none;
                min-height: 42px;
                max-height: 110px;
                border: 1px solid #ccc;
                border-radius: 9px;
                padding: 9px;
                font-family: inherit;
                outline: none;
            }

            #fawp-ai-input:focus {
                border-color: #198754;
            }

            #fawp-ai-send {
                border: none;
                border-radius: 9px;
                padding: 0 14px;
                background: #198754;
                color: white;
                cursor: pointer;
                font-weight: 700;
            }

            #fawp-ai-send:disabled {
                opacity: .6;
                cursor: not-allowed;
            }

            .fawp-ai-status {
                font-size: 12px;
                color: #666;
                padding-top: 5px;
            }

            @media (max-width: 600px) {
                #fawp-ai-button {
                    right: 14px;
                    bottom: 14px;
                }

                #fawp-ai-panel {
                    right: 10px;
                    bottom: 82px;
                    width: calc(100vw - 20px);
                    height: 70vh;
                }
            }
        `;

        document.head.appendChild(style);

        const button = document.createElement("button");

        button.id = "fawp-ai-button";
        button.type = "button";
        button.title = "AI Farmer Assistant";
        button.textContent = "🤖";

        const panel = document.createElement("div");

        panel.id = "fawp-ai-panel";

        panel.innerHTML = `
            <div id="fawp-ai-header">
                <div id="fawp-ai-title">
                    🤖 AI Farmer Assistant
                </div>

                <div id="fawp-ai-actions">
                    <button type="button" id="fawp-ai-clear">
                        Clear
                    </button>

                    <button type="button" id="fawp-ai-close">
                        ×
                    </button>
                </div>
            </div>

            <div id="fawp-ai-messages"></div>

            <div id="fawp-ai-input-area">
                <div id="fawp-ai-input-row">

                    <textarea
                        id="fawp-ai-input"
                        placeholder="Ask about crops, soil, fertilizers, irrigation, pests, diseases, or schemes..."
                        aria-label="Ask the AI Farmer Assistant"
                    ></textarea>

                    <button type="button" id="fawp-ai-send">
                        Send
                    </button>

                </div>

                <div class="fawp-ai-status" id="fawp-ai-status">
                    Press Enter to send. Shift+Enter for a new line.
                </div>
            </div>
        `;

        document.body.appendChild(button);
        document.body.appendChild(panel);

        const messagesEl =
            document.getElementById("fawp-ai-messages");

        const inputEl =
            document.getElementById("fawp-ai-input");

        const sendEl =
            document.getElementById("fawp-ai-send");

        const statusEl =
            document.getElementById("fawp-ai-status");

        const clearEl =
            document.getElementById("fawp-ai-clear");

        const closeEl =
            document.getElementById("fawp-ai-close");

        let history = loadHistory();

        function addMessage(text, role, save = true) {

            const div = document.createElement("div");

            div.className =
                "fawp-ai-message " +
                (role === "user"
                    ? "fawp-ai-user"
                    : "fawp-ai-bot");

            div.textContent = text;

            messagesEl.appendChild(div);

            messagesEl.scrollTop =
                messagesEl.scrollHeight;

            if (save) {

                history.push({
                    role: role,
                    text: text
                });

                saveHistory(history);
            }
        }

        function renderHistory() {

            messagesEl.innerHTML = "";

            if (!history.length) {

                addMessage(
                    "Namaste! 👋 I am your AI Farmer Assistant. Ask me about crops, soil, fertilizers, irrigation, pests, diseases, or government schemes.",
                    "bot"
                );

                return;
            }

            history.forEach(message => {

                addMessage(
                    message.text,
                    message.role,
                    false
                );

            });
        }

        async function sendMessage() {

            const question =
                inputEl.value.trim();

            if (!question || sendEl.disabled) {
                return;
            }

            addMessage(question, "user");

            inputEl.value = "";

            sendEl.disabled = true;

            statusEl.textContent = "Thinking...";

            try {

                const response = await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            message: question
                        })
                    }
                );

                let data = {};

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    data = await response.json();

                } else {

                    const text =
                        await response.text();

                    data = {
                        error: text
                    };
                }

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        `Server error: HTTP ${response.status}`
                    );
                }

                const answer =
                    data.answer ||
                    data.response ||
                    data.message ||
                    "I received your question, but no answer was returned.";

                addMessage(
                    answer,
                    "bot"
                );

                statusEl.textContent =
                    "Ready";

            } catch (error) {

                console.error(
                    "[FAWP AI ASSISTANT ERROR]",
                    error
                );

                addMessage(
                    "AI Error: " +
                    (
                        error.message ||
                        "Unknown error"
                    ),
                    "bot"
                );

                statusEl.textContent =
                    "AI request failed. Check the Render logs for the backend error.";

            } finally {

                sendEl.disabled = false;

                inputEl.focus();
            }
        }

        button.addEventListener(
            "click",
            () => {

                const isOpen =
                    panel.style.display === "flex";

                panel.style.display =
                    isOpen ? "none" : "flex";

                if (!isOpen) {
                    inputEl.focus();
                }
            }
        );

        closeEl.addEventListener(
            "click",
            () => {
                panel.style.display = "none";
            }
        );

        clearEl.addEventListener(
            "click",
            () => {

                history = [];

                saveHistory(history);

                renderHistory();
            }
        );

        sendEl.addEventListener(
            "click",
            sendMessage
        );

        inputEl.addEventListener(
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

        renderHistory();
    }

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            createAssistant
        );

    } else {

        createAssistant();
    }

})();
