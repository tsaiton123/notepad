/**
 * Context Toolbar Module
 * Handles floating toolbar for selected elements and AI interactions
 */

import { CreateCommand } from '../core/CommandManager.js';

class ContextToolbar {
    constructor(renderer, aiClient, commandManager) {
        this.renderer = renderer;
        this.ai = aiClient;
        this.commandManager = commandManager;

        this.toolbar = null;
        this.popover = null;
        this.activeSelection = [];

        this.init();
    }

    init() {
        this.createToolbar();
        this.setupEventListeners();
    }

    createToolbar() {
        // Toolbar Container
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'context-toolbar';
        this.toolbar.style.display = 'none';

        // AI Assist Button
        const aiBtn = document.createElement('button');
        aiBtn.className = 'context-btn ai-assist';
        aiBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 12h-2v3h-3v2h3v3h2v-3h3v-2h-3zM7 9h2v2H7zm8 0h2v2h-2zm-8 4h2v2H7zm4-4h2v2h-2zm0 4h2v2h-2zM20.5 6c0-1.1-.9-2-2-2H5.5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V6zM19 18H5V6h14v12z"/></svg>';
        aiBtn.title = 'AI Assist';
        aiBtn.onclick = () => this.toggleAIPopover();

        // Delete Button (Convenience)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'context-btn';
        deleteBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = () => this.deleteSelection();

        this.toolbar.appendChild(aiBtn);
        this.toolbar.appendChild(deleteBtn);

        // AI Popover
        this.popover = document.createElement('div');
        this.popover.className = 'ai-popover';

        const input = document.createElement('textarea');
        input.className = 'ai-input';
        input.placeholder = 'Ask AI about this selection...';
        input.rows = 2;
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitAIRequest(input.value);
            }
        };

        const presets = document.createElement('div');
        presets.className = 'ai-presets';
        ['Explain', 'Solve', 'Summarize', 'Convert to Text'].forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'preset-chip';
            chip.textContent = text;
            chip.onclick = () => this.submitAIRequest(text);
            presets.appendChild(chip);
        });

        this.popover.appendChild(input);
        this.popover.appendChild(presets);
        this.toolbar.appendChild(this.popover);

        document.body.appendChild(this.toolbar);
    }

    setupEventListeners() {
        // Hide on canvas click (if not on toolbar)
        document.addEventListener('mousedown', (e) => {
            if (this.toolbar && !this.toolbar.contains(e.target) && e.target.closest('.context-toolbar') === null) {
                // If clicking canvas, selection might change, so we wait for update
            }
        });
    }

    update() {
        const selected = this.renderer.elementManager.getSelectedElements();
        this.activeSelection = selected;

        if (selected.length === 0) {
            this.toolbar.style.display = 'none';
            this.popover.classList.remove('open');
            return;
        }

        // Calculate bounding box of selection
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
        });

        // Convert to screen coords
        const screenPos = this.renderer.canvasToScreen(minX, minY);
        const screenMax = this.renderer.canvasToScreen(maxX, maxY);
        const width = screenMax.x - screenPos.x;

        // Position toolbar above selection
        const rect = this.renderer.canvas.getBoundingClientRect();
        let top = rect.top + screenPos.y - 50;
        let left = rect.left + screenPos.x + (width / 2) - (this.toolbar.offsetWidth / 2);

        // Keep within bounds
        if (top < 10) top = rect.top + screenMax.y + 10;
        if (left < 10) left = 10;

        this.toolbar.style.top = `${top}px`;
        this.toolbar.style.left = `${left}px`;
        this.toolbar.style.display = 'flex';
    }

    toggleAIPopover() {
        this.popover.classList.toggle('open');
        if (this.popover.classList.contains('open')) {
            this.popover.querySelector('textarea').focus();
        }
    }

    deleteSelection() {
        // Dispatch delete key event to be handled by CanvasControls
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete' }));
    }

    async submitAIRequest(prompt) {
        if (!prompt) return;

        const input = this.popover.querySelector('textarea');
        input.disabled = true;
        input.value = 'Thinking...';

        try {
            // 1. Capture selection as image
            const imageBase64 = await this.renderer.captureSelectionAsImage(this.activeSelection);

            // 2. Send to AI
            const response = await this.ai.sendMessageWithImage(prompt, imageBase64);

            // 3. Insert result
            this.insertResponse(response);

            // Reset
            input.value = '';
            this.popover.classList.remove('open');
        } catch (error) {
            console.error(error);
            input.value = 'Error: ' + error.message;
        } finally {
            input.disabled = false;
        }
    }

    insertResponse(text) {
        // Parse response using AI helper
        const parsed = this.ai.parseResponse(text);

        // Calculate position (right of selection)
        const selected = this.activeSelection;
        let maxX = -Infinity;
        let minY = Infinity;

        selected.forEach(el => {
            maxX = Math.max(maxX, el.x + el.width);
            minY = Math.min(minY, el.y);
        });

        const x = maxX + 40;
        const y = minY;

        let element;

        if (parsed.hasGraph) {
            // Create Graph Element
            element = this.renderer.elementManager.addElement('graph', parsed.graphData, x, y);
            element.width = 400;
            element.height = 300;
        } else {
            // Create Text Element
            const lines = parsed.content.split('\n');
            element = this.renderer.elementManager.addElement('text', {
                text: parsed.content,
                lines: lines,
                fontSize: this.renderer.fontSize,
                fontFamily: this.renderer.fontFamily,
                color: '#ffffff',
                lineHeight: this.renderer.lineHeight,
                padding: 0
            }, x, y);

            // Calculate dimensions
            this.renderer.ctx.font = `${this.renderer.fontSize}px ${this.renderer.fontFamily}`;
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = this.renderer.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, metrics.width);
            });
            element.width = maxWidth;
            element.height = lines.length * this.renderer.lineHeight;
        }

        if (this.commandManager) {
            const createCommand = new CreateCommand(this.renderer.elementManager, element);
            this.commandManager.executeCommand(createCommand);
        }

        this.renderer.redrawCanvas();
    }
}

export default ContextToolbar;
