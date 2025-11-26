/**
 * Chat Interface Module
 * Manages chat UI and message display
 */

class ChatInterface {
    constructor(messagesContainer, inputElement, sendButton) {
        this.messagesContainer = messagesContainer;
        this.inputElement = inputElement;
        this.sendButton = sendButton;
        this.messageHistory = [];

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for chat input
     */
    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => {
            this.handleSend();
        });

        // Send message on Enter (Shift+Enter for new line)
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Auto-resize textarea
        this.inputElement.addEventListener('input', () => {
            this.autoResize();
        });
    }

    /**
     * Handle send action
     */
    handleSend() {
        const message = this.inputElement.value.trim();
        if (message && this.onSend) {
            this.onSend(message);
            this.inputElement.value = '';
            this.autoResize();
        }
    }

    /**
     * Set send callback
     */
    onSendMessage(callback) {
        this.onSend = callback;
    }

    /**
     * Add a user message to the chat
     */
    addUserMessage(message) {
        const messageData = {
            type: 'user',
            content: message,
            timestamp: new Date()
        };

        this.messageHistory.push(messageData);
        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    /**
     * Add an AI message to the chat
     */
    addAIMessage(message) {
        const messageData = {
            type: 'ai',
            content: message,
            timestamp: new Date()
        };

        this.messageHistory.push(messageData);
        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    /**
     * Add an error message to the chat
     */
    addErrorMessage(error) {
        const messageData = {
            type: 'error',
            content: `Error: ${error}`,
            timestamp: new Date()
        };

        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    /**
     * Render a message in the chat
     */
    renderMessage(messageData) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${messageData.type}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.textContent = messageData.content;

        messageEl.appendChild(contentEl);

        // Remove welcome message if it exists
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage && this.messageHistory.length > 0) {
            welcomeMessage.remove();
        }

        this.messagesContainer.appendChild(messageEl);
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Auto-resize textarea based on content
     */
    autoResize() {
        this.inputElement.style.height = 'auto';
        this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 150) + 'px';
    }

    /**
     * Set input enabled state
     */
    setInputEnabled(enabled) {
        this.inputElement.disabled = !enabled;
        this.sendButton.disabled = !enabled;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messagesContainer.innerHTML = `
      <div class="welcome-message">
        <p>👋 Welcome! Ask me anything and I'll write it on the blackboard in beautiful handwriting.</p>
        <p>Try asking me to:</p>
        <ul>
          <li>Explain a concept</li>
          <li>Plot a function like "y = sin(x)"</li>
          <li>Create a chart</li>
          <li>Solve a problem</li>
        </ul>
      </div>
    `;
        this.messageHistory = [];
    }

    /**
     * Get message history
     */
    getHistory() {
        return this.messageHistory;
    }
}

export default ChatInterface;
