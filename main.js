/**
 * AI Blackboard - Main Application
 * A beautiful AI-powered digital notepad with handwriting-style rendering
 */

import AIClient from './src/modules/ai.js';
import BlackboardRenderer from './src/modules/renderer.js';
import ContextToolbar from './src/modules/contextToolbar.js';
import PDFImporter from './src/modules/pdfImporter.js';
import CanvasControls from './src/modules/canvasControls.js';
import Calculator from './src/modules/calculator.js';
import { CommandManager } from './src/core/CommandManager.js';
import StorageManager from './src/managers/StorageManager.js';
import { getDemoResponse, simulateDelay } from './src/utils/demoMode.js';
import './style.css';
import { setupAuthModal } from './src/components/AuthModal.js';
import { getUser, signOut, onAuthStateChange } from './src/services/auth.js';

class AIBlackboard {
    constructor() {
        this.ai = new AIClient();
        this.renderer = null;
        this.canvasControls = null;
        this.contextToolbar = null;
        this.calculator = null;
        this.commandManager = null;
        this.storageManager = null;
        this.pdfImporter = null;
        this.isProcessing = false;

        window.app = this; // For debugging and verification

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup all components
     */
    setup() {
        // Initialize renderer
        const canvas = document.getElementById('blackboard');
        this.renderer = new BlackboardRenderer(canvas);

        // Initialize managers
        this.commandManager = new CommandManager();
        this.storageManager = new StorageManager(this.renderer.elementManager);

        // Initialize canvas controls with command manager
        this.canvasControls = new CanvasControls(canvas, this.renderer, this.commandManager);

        // Initialize calculator
        this.calculator = new Calculator(this.renderer, this.commandManager);

        // Initialize Context Toolbar
        this.contextToolbar = new ContextToolbar(this.renderer, this.ai, this.commandManager);

        // Initialize PDF Importer
        this.pdfImporter = new PDFImporter(this.renderer, this.commandManager);

        // Listen for interactions to update toolbar
        this.canvasControls.canvas.addEventListener('mouseup', () => {
            setTimeout(() => this.contextToolbar.update(), 10);
        });

        window.addEventListener('keyup', () => {
            setTimeout(() => this.contextToolbar.update(), 10);
        });

        // Setup event handlers
        this.setupEventHandlers();

        // Load saved canvas if exists
        if (this.storageManager.hasSavedCanvas()) {
            console.log('Loading saved canvas...');
            this.storageManager.loadCanvas();
            this.renderer.redrawCanvas();
        }

        // Start auto-save
        this.storageManager.startAutoSave();

        // Check if API key is configured
        if (!this.ai.hasApiKey()) {
            this.showApiKeyWarning();
        }
    }

    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        // Settings panel
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');

        if (settingsBtn && settingsPanel && closeSettings) {
            settingsBtn.addEventListener('click', () => {
                settingsPanel.classList.add('open');
            });

            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('open');
            });
        }


        // Tool mode switching with status update
        const selectToolBtn = document.getElementById('selectTool');
        const handToolBtn = document.getElementById('handTool');
        const penToolBtn = document.getElementById('penTool');
        const textToolBtn = document.getElementById('textTool');
        const imageToolBtn = document.getElementById('imageTool');
        const pdfToolBtn = document.getElementById('pdfTool');
        const imageInput = document.getElementById('imageInput');
        const statusMode = document.getElementById('statusMode');

        const updateToolUI = (activeTool) => {
            selectToolBtn.classList.toggle('active', activeTool === 'select');
            handToolBtn.classList.toggle('active', activeTool === 'pan');
            penToolBtn.classList.toggle('active', activeTool === 'draw');
            textToolBtn.classList.toggle('active', activeTool === 'text');

            // Update ARIA
            selectToolBtn.setAttribute('aria-pressed', activeTool === 'select');
            handToolBtn.setAttribute('aria-pressed', activeTool === 'pan');
            penToolBtn.setAttribute('aria-pressed', activeTool === 'draw');
            textToolBtn.setAttribute('aria-pressed', activeTool === 'text');
        };

        selectToolBtn.addEventListener('click', () => {
            this.canvasControls.setTool('select');
            updateToolUI('select');
            statusMode.textContent = 'Select Mode';
        });

        handToolBtn.addEventListener('click', () => {
            this.canvasControls.setTool('pan');
            updateToolUI('pan');
            statusMode.textContent = 'Pan Mode';
        });

        penToolBtn.addEventListener('click', () => {
            this.canvasControls.setTool('draw');
            updateToolUI('draw');
            statusMode.textContent = 'Draw Mode';
        });

        textToolBtn.addEventListener('click', () => {
            this.canvasControls.setTool('text');
            updateToolUI('text');
            statusMode.textContent = 'Text Mode';
        });

        imageToolBtn.addEventListener('click', () => {
            imageInput.click();
        });

        if (pdfToolBtn) {
            pdfToolBtn.addEventListener('click', () => {
                this.pdfImporter.open();
            });
        }

        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                // Insert at center of screen
                const rect = this.renderer.canvas.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const canvasCoords = this.renderer.screenToCanvas(centerX, centerY);

                this.canvasControls.insertImage(e.target.files[0], canvasCoords.x, canvasCoords.y);

                // Reset input
                imageInput.value = '';
            }
        });

        // Listen for tool changes from controls (e.g. auto-switch after text insert)
        window.addEventListener('toolChanged', (e) => {
            if (e.detail.tool === 'select') {
                selectToolBtn.click();
            }
        });

        // Save API key
        const saveApiKeyBtn = document.getElementById('saveApiKey');
        const apiKeyInput = document.getElementById('apiKeyInput');

        saveApiKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                this.ai.saveApiKey(key);
                this.showNotification('API key saved successfully!', 'success');
                apiKeyInput.value = '';
            }
        });

        // Handwriting style
        const handwritingStyle = document.getElementById('handwritingStyle');
        handwritingStyle.addEventListener('change', (e) => {
            const fontMap = {
                'caveat': 'Caveat',
                'indie': 'Indie Flower',
                'shadows': 'Shadows Into Light'
            };
            this.renderer.fontFamily = fontMap[e.target.value] || 'Caveat';
        });

        // Text size
        const textSize = document.getElementById('textSize');
        const textSizeValue = document.getElementById('textSizeValue');
        textSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.renderer.fontSize = size;
            this.renderer.lineHeight = size * 1.6;
            textSizeValue.textContent = `${size}px`;
        });

        // Clear blackboard
        const clearBtn = document.getElementById('clearBoard');
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the blackboard?')) {
                if (confirm('Clear the blackboard?')) {
                    this.renderer.clear();
                    this.ai.clearHistory();
                }
            }
        });

        // Toolbar buttons
        document.getElementById('undoBtn').addEventListener('click', () => {
            const success = this.canvasControls.commandManager.undo();
            if (success) {
                this.renderer.redrawCanvas();
                console.log('Undo executed');
            }
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            const success = this.canvasControls.commandManager.redo();
            if (success) {
                this.renderer.redrawCanvas();
                console.log('Redo executed');
            }
        });

        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.renderer.zoomAt(
                this.canvas.width / 2,
                this.canvas.height / 2,
                0.1
            );
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.renderer.zoomAt(
                this.canvas.width / 2,
                this.canvas.height / 2,
                -0.1
            );
        });
    }

    /**
     * Handle user message
     */
    async handleUserMessage(message) {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.chat.setInputEnabled(false);
        this.showLoading(true);

        // Add user message to chat
        this.chat.addUserMessage(message);

        try {
            let response;

            // Use demo mode if no API key is configured
            if (!this.ai.hasApiKey()) {
                await simulateDelay();
                response = getDemoResponse(message);
            } else {
                // Get AI response from Gemini
                response = await this.ai.sendMessage(message);
            }

            // Add AI response to chat
            this.chat.addAIMessage(response);

            // Parse response for special content
            const parsed = this.ai.parseResponse(response);

            // Render on blackboard
            await this.renderResponse(parsed);

        } catch (error) {
            console.error('Error:', error);
            this.chat.addErrorMessage(error.message);
        } finally {
            this.isProcessing = false;
            this.chat.setInputEnabled(true);
            this.showLoading(false);
        }
    }

    /**
     * Render AI response on blackboard
     */
    async renderResponse(parsed) {
        // Render text
        await this.renderer.renderText(parsed.content);

        // Render graph if present
        if (parsed.hasGraph && parsed.graphData) {
            await this.renderer.renderGraph(parsed.graphData);
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if (show) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    }

    /**
     * Show API key warning
     */
    showApiKeyWarning() {
        const messagesContainer = document.getElementById('chatMessages');
        const warning = document.createElement('div');
        warning.className = 'welcome-message';
        warning.style.borderColor = 'var(--accent-warning)';
        warning.innerHTML = `
      <p>💡 <strong>Demo Mode Active</strong></p>
      <p>You're currently in demo mode with simulated AI responses. For full AI capabilities, add your Gemini API key in settings.</p>
      <p>Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.</p>
      <p><em>You can still explore the blackboard features in demo mode!</em></p>
    `;
        messagesContainer.insertBefore(warning, messagesContainer.firstChild);
    }

    /**
     * Show notification (simple toast-like notification)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-md) var(--spacing-lg);
      box-shadow: var(--shadow-lg);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application
// const app = new AIBlackboard();

const startApp = (user) => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'block';

    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.remove();

    if (!window.app) {
        window.app = new AIBlackboard();

        // Add Logout Button
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('logoutBtn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'icon-btn';
            logoutBtn.title = 'Sign Out';
            logoutBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            `;
            logoutBtn.addEventListener('click', async () => {
                await signOut();
            });
            headerActions.appendChild(logoutBtn);
        }
    }
};

const showAuth = () => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'none';

    let authContainer = document.getElementById('auth-container');
    if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; background-color: var(--bg-color);';
        document.body.appendChild(authContainer);
    }

    authContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <h1 style="font-size: 3rem; margin-bottom: 0.5rem;">Blackboard</h1>
            <p style="color: #888;">Please sign in to continue</p>
        </div>
        <div id="auth-modal-mount"></div>
    `;

    setupAuthModal(document.getElementById('auth-modal-mount'));
};

const initApp = async () => {
    const user = await getUser();
    if (user) {
        startApp(user);
    } else {
        showAuth();
    }
};

initApp();

onAuthStateChange((event, session) => {
    if (session?.user) {
        startApp(session.user);
    } else {
        showAuth();
        // Reload to clear app state if we were previously logged in
        if (window.app) {
            window.location.reload();
        }
    }
});

export default AIBlackboard;