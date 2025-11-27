/**
 * Canvas Controls Module
 * Handles pan and zoom interactions for the infinite canvas
 */

import { MoveCommand, DeleteCommand, CreateCommand } from '../core/CommandManager.js';

class CanvasControls {
    constructor(canvas, renderer, commandManager = null) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.commandManager = commandManager;

        // Tool mode
        this.currentTool = 'select'; // 'select' or 'draw'

        // Pan state
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.spacePressed = false;

        // Element dragging state
        this.isDraggingElement = false;
        this.draggedElements = []; // Support multi-element drag
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.elementStartPositions = []; // Store original positions

        // Marquee selection state
        this.isMarqueeSelecting = false;
        this.marqueeStart = { x: 0, y: 0 };
        this.marqueeEnd = { x: 0, y: 0 };

        this.mouseX = 0;
        this.mouseY = 0;

        // Drawing state
        this.isDrawing = false;
        this.currentStroke = null;
        this.drawingColor = '#ffffff';
        this.drawingWidth = 2;

        // Touch state
        this.touchStartDistance = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        this.setupEventListeners();
    }

    /**
     * Set the current tool mode
     */
    setTool(tool) {
        this.currentTool = tool;
        console.log('Tool changed to:', tool);

        // Update cursor
        if (tool === 'draw') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else if (tool === 'pan') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }

    /**
     * Setup all event listeners for canvas interaction
     */
    setupEventListeners() {
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Keyboard events for space key
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // System Copy/Paste
        window.addEventListener('copy', (e) => this.handleCopy(e));
        window.addEventListener('paste', (e) => this.handlePaste(e));

        // Mouse events for panning
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Handle mouse wheel for zooming
     */
    handleWheel(e) {
        e.preventDefault();

        const delta = -e.deltaY * 0.001;
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        this.renderer.zoomAt(mouseX, mouseY, delta);
    }

    /**
     * Handle key down - Comprehensive keyboard shortcuts
     */
    handleKeyDown(e) {
        // Don't activate if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

        // Space for pan mode
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            this.spacePressed = true;
            this.canvas.style.cursor = 'grab';
            return;
        }

        // Delete selected elements
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.deleteSelected();
            return;
        }

        // Escape to deselect
        if (e.key === 'Escape') {
            e.preventDefault();
            this.renderer.elementManager.clearSelection();
            this.renderer.redrawCanvas();
            return;
        }

        // Keyboard shortcuts with Ctrl/Cmd
        if (ctrlKey) {
            // Ctrl+D - Duplicate
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                const duplicated = this.renderer.elementManager.duplicateSelected();
                if (duplicated.length > 0) {
                    this.renderer.redrawCanvas();
                    console.log('Duplicated', duplicated.length, 'elements');
                }
                return;
            }

            // Ctrl+A - Select all
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                this.renderer.elementManager.selectAll();
                this.renderer.redrawCanvas();
                return;
            }

            // Ctrl+Z - Undo
            if (e.key === 'z' || e.key === 'Z') {
                if (e.shiftKey) {
                    // Ctrl+Shift+Z - Redo
                    e.preventDefault();
                    if (this.commandManager) {
                        const success = this.commandManager.redo();
                        if (success) {
                            this.renderer.redrawCanvas();
                            console.log('Redo');
                        }
                    }
                } else {
                    // Ctrl+Z - Undo
                    e.preventDefault();
                    if (this.commandManager) {
                        const success = this.commandManager.undo();
                        if (success) {
                            this.renderer.redrawCanvas();
                            console.log('Undo');
                        }
                    }
                }
                return;
            }

            // Ctrl+] - Bring forward
            if (e.key === ']') {
                e.preventDefault();
                const selected = this.renderer.elementManager.getSelectedElements();
                if (e.shiftKey) {
                    // Ctrl+Shift+] - Bring to front
                    selected.forEach(el => this.renderer.elementManager.bringToFront(el));
                    console.log('Brought to front');
                } else {
                    // Ctrl+] - Bring forward
                    selected.forEach(el => this.renderer.elementManager.bringForward(el));
                    console.log('Brought forward');
                }
                if (selected.length > 0) {
                    this.renderer.redrawCanvas();
                }
                return;
            }

            // Ctrl+[ - Send backward
            if (e.key === '[') {
                e.preventDefault();
                const selected = this.renderer.elementManager.getSelectedElements();
                if (e.shiftKey) {
                    // Ctrl+Shift+[ - Send to back
                    selected.forEach(el => this.renderer.elementManager.sendToBack(el));
                    console.log('Sent to back');
                } else {
                    // Ctrl+[ - Send backward
                    selected.forEach(el => this.renderer.elementManager.sendBackward(el));
                    console.log('Sent backward');
                }
                if (selected.length > 0) {
                    this.renderer.redrawCanvas();
                }
                return;
            }
        }
    }

    /**
     * Delete selected elements
     */
    deleteSelected() {
        const selected = this.renderer.elementManager.getSelectedElements();
        if (selected.length > 0 && this.commandManager) {
            // Create delete command before deleting
            const deleteCommand = new DeleteCommand(this.renderer.elementManager, selected);
            this.commandManager.executeCommand(deleteCommand);
            console.log('Delete command created for', selected.length, 'elements');
            this.renderer.redrawCanvas();
        }
    }

    /**
     * Handle key up - Release space key
     */
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.spacePressed = false;
            this.canvas.style.cursor = this.isPanning ? 'grabbing' : 'default';
            if (!this.isPanning) {
                this.canvas.style.cursor = 'default';
            }
        }
    }

    /**
     * Handle mouse down - Start panning, element drag, or marquee selection
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Convert screen to canvas coordinates
        const canvasCoords = this.renderer.screenToCanvas(screenX, screenY);

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

        // Pan with space+left-click or middle mouse button OR pan tool
        if ((this.spacePressed && e.button === 0) || e.button === 1 || (this.currentTool === 'pan' && e.button === 0)) {
            this.isPanning = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // Check if in draw mode
        if (e.button === 0 && !this.spacePressed && this.currentTool === 'draw') {
            // Start drawing a stroke
            this.isDrawing = true;
            this.currentStroke = {
                points: [{
                    x: canvasCoords.x,
                    y: canvasCoords.y
                }],
                color: this.drawingColor,
                width: this.drawingWidth
            };
            e.preventDefault();
            return;
        }

        // Check if text tool
        if (e.button === 0 && !this.spacePressed && this.currentTool === 'text') {
            this.handleTextClick(canvasCoords.x, canvasCoords.y);
            e.preventDefault();
            return;
        }

        // Check if clicking on an element (left mouse button, no space, select mode)
        if (e.button === 0 && !this.spacePressed && this.currentTool === 'select') {
            const element = this.renderer.elementManager.getElementAt(canvasCoords.x, canvasCoords.y);

            if (element) {
                // Clicking on an element

                if (ctrlKey) {
                    // Ctrl+Click: Toggle selection
                    this.renderer.elementManager.toggleSelection(element);
                    this.renderer.redrawCanvas();
                } else {
                    // Regular click: Select this element only (unless already selected for dragging)
                    if (!this.renderer.elementManager.isSelected(element)) {
                        this.renderer.elementManager.selectElement(element, false);
                        this.renderer.redrawCanvas();
                    }

                    // Start dragging all selected elements
                    this.isDraggingElement = true;
                    this.draggedElements = this.renderer.elementManager.getSelectedElements();
                    this.dragStartX = canvasCoords.x;
                    this.dragStartY = canvasCoords.y;

                    // Store original positions for all selected elements
                    this.elementStartPositions = this.draggedElements.map(el => ({
                        id: el.id,
                        x: el.x,
                        y: el.y
                    }));

                    this.canvas.style.cursor = 'move';
                }
                e.preventDefault();
            } else {
                // Clicked on empty space
                if (!ctrlKey) {
                    // Deselect all if not holding Ctrl
                    this.renderer.elementManager.clearSelection();
                    this.renderer.redrawCanvas();
                }

                // Start marquee selection
                this.isMarqueeSelecting = true;
                this.marqueeStartX = canvasCoords.x;
                this.marqueeStartY = canvasCoords.y;
                this.marqueeCurrentX = canvasCoords.x;
                this.marqueeCurrentY = canvasCoords.y;
            }
        }
    }

    /**
     * Handle mouse move - Pan, drag elements, or update marquee
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;

        if (this.isPanning) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;

            this.renderer.pan(dx, dy);

            this.lastX = e.clientX;
            this.lastY = e.clientY;
        } else if (this.isDraggingElement && this.draggedElements.length > 0) {
            // Dragging multiple elements
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            const canvasCoords = this.renderer.screenToCanvas(screenX, screenY);

            // Calculate delta in canvas space
            const deltaX = canvasCoords.x - this.dragStartX;
            const deltaY = canvasCoords.y - this.dragStartY;

            // Update all selected elements positions
            this.draggedElements.forEach((el, i) => {
                const startPos = this.elementStartPositions[i];
                el.x = startPos.x + deltaX;
                el.y = startPos.y + deltaY;
            });

            // Redraw\n            this.renderer.redrawCanvas();
        } else if (this.isDrawing && this.currentStroke) {
            // Continue drawing stroke
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            const canvasCoords = this.renderer.screenToCanvas(screenX, screenY);

            // Add point to current stroke
            this.currentStroke.points.push({
                x: canvasCoords.x,
                y: canvasCoords.y
            });

            // Render preview
            this.renderer.redrawCanvas();
            this.renderer.renderStrokePreview(this.currentStroke);
        } else if (this.isMarqueeSelecting) {
            // Update marquee selection rectangle
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            const canvasCoords = this.renderer.screenToCanvas(screenX, screenY);
            this.marqueeCurrentX = canvasCoords.x;
            this.marqueeCurrentY = canvasCoords.y;

            // Calculate marquee bounds
            const x = Math.min(this.marqueeStartX, this.marqueeCurrentX);
            const y = Math.min(this.marqueeStartY, this.marqueeCurrentY);
            const width = Math.abs(this.marqueeCurrentX - this.marqueeStartX);
            const height = Math.abs(this.marqueeCurrentY - this.marqueeStartY);

            // Redraw with marquee
            this.renderer.redrawCanvas();
            this.renderer.renderMarquee(x, y, width, height);
        }
    }

    /**
     * Handle mouse up - Stop panning, dragging, or complete marquee selection
     */
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            if (this.currentTool === 'pan') {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = this.spacePressed ? 'grab' : 'default';
            }
        }

        if (this.isDraggingElement) {
            // Create undo command for the move if there was actual movement
            if (this.draggedElements.length > 0 && this.elementStartPositions.length > 0 && this.commandManager) {
                // Check if elements actually moved (distance > 5px)
                let hasMoved = false;
                for (let i = 0; i < this.draggedElements.length; i++) {
                    const el = this.draggedElements[i];
                    const start = this.elementStartPositions[i];
                    const distance = Math.sqrt(
                        Math.pow(el.x - start.x, 2) + Math.pow(el.y - start.y, 2)
                    );
                    if (distance > 5) {
                        hasMoved = true;
                        break;
                    }
                }

                if (hasMoved) {
                    const newPositions = this.draggedElements.map(el => ({ x: el.x, y: el.y }));
                    const moveCommand = new MoveCommand(
                        this.draggedElements,
                        this.elementStartPositions,
                        newPositions
                    );
                    this.commandManager.executeCommand(moveCommand);
                    console.log('Move command created');
                }
            }

            this.isDraggingElement = false;
            this.draggedElements = [];
            this.elementStartPositions = [];
            this.canvas.style.cursor = this.currentTool === 'draw' ? 'crosshair' : 'default';
            // Redraw to show elements in their new positions
            this.renderer.redrawCanvas();
        }

        if (this.isDrawing && this.currentStroke) {
            // Finalize the stroke
            if (this.currentStroke.points.length > 1) {
                // Calculate bounding box
                const xs = this.currentStroke.points.map(p => p.x);
                const ys = this.currentStroke.points.map(p => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                // Create stroke element
                const element = this.renderer.elementManager.addElement('stroke', {
                    points: this.currentStroke.points.map(p => ({
                        x: p.x - minX,
                        y: p.y - minY
                    })),
                    color: this.currentStroke.color,
                    width: this.currentStroke.width
                }, minX, minY);

                element.width = maxX - minX;
                element.height = maxY - minY;

                // Create undo command for the drawing
                if (this.commandManager) {
                    const createCommand = new CreateCommand(this.renderer.elementManager, element);
                    this.commandManager.executeCommand(createCommand);
                    console.log('Create command for stroke created');
                }
            }

            this.isDrawing = false;
            this.currentStroke = null;
            this.renderer.redrawCanvas();
        }

        if (this.isMarqueeSelecting) {
            // Finalize marquee selection
            const x = Math.min(this.marqueeStartX, this.marqueeCurrentX);
            const y = Math.min(this.marqueeStartY, this.marqueeCurrentY);
            const width = Math.abs(this.marqueeCurrentX - this.marqueeStartX);
            const height = Math.abs(this.marqueeCurrentY - this.marqueeStartY);

            // Select elements within marquee bounds
            if (width > 2 && height > 2) { // Only if marquee is substantial
                this.renderer.elementManager.selectInBounds(x, y, width, height);
            }

            this.isMarqueeSelecting = false;
            this.renderer.redrawCanvas();
        }
    }

    /**
     * Handle touch start - Initialize touch interaction
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - pan
            this.isPanning = true;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            this.isPanning = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);

            // Store center point for zoom
            this.lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            this.lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }

        e.preventDefault();
    }

    /**
     * Handle touch move - Pan or zoom
     */
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isPanning) {
            // Single touch pan
            const dx = e.touches[0].clientX - this.lastTouchX;
            const dy = e.touches[0].clientY - this.lastTouchY;

            this.renderer.pan(dx, dy);

            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.touchStartDistance > 0) {
                const delta = (distance - this.touchStartDistance) * 0.01;

                // Get canvas-relative coordinates
                const rect = this.canvas.getBoundingClientRect();
                const centerX = this.lastTouchX - rect.left;
                const centerY = this.lastTouchY - rect.top;

                this.renderer.zoomAt(centerX, centerY, delta);
            }

            this.touchStartDistance = distance;
        }

        e.preventDefault();
    }

    /**
     * Handle touch end - Clean up touch state
     */
    handleTouchEnd(e) {
        this.isPanning = false;
        this.touchStartDistance = 0;
    }

    /**
     * Cleanup - Remove event listeners
     */
    destroy() {
        this.canvas.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    /**
     * Handle text tool click - Create text input
     */
    handleTextClick(x, y) {
        // Create temporary textarea
        const textarea = document.createElement('textarea');
        textarea.style.position = 'absolute';

        // Convert canvas coords to screen coords for positioning
        const screenCoords = this.renderer.canvasToScreen(x, y);
        const rect = this.canvas.getBoundingClientRect();

        textarea.style.left = (rect.left + screenCoords.x) + 'px';
        textarea.style.top = (rect.top + screenCoords.y) + 'px';
        textarea.style.background = 'transparent';
        textarea.style.border = '1px dashed rgba(255,255,255,0.5)';
        textarea.style.color = '#ffffff';
        textarea.style.font = `${this.renderer.fontSize * this.renderer.zoom}px ${this.renderer.fontFamily}`;
        textarea.style.zIndex = '1000';
        textarea.style.minWidth = '100px';
        textarea.style.minHeight = '1.5em';
        textarea.style.outline = 'none';
        textarea.style.padding = '0';
        textarea.style.margin = '0';
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';

        document.body.appendChild(textarea);
        textarea.focus();

        // Auto-resize
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.style.width = 'auto';
            textarea.style.width = (textarea.scrollWidth + 10) + 'px';
        });

        // Handle finish
        const finish = () => {
            const text = textarea.value.trim();
            if (text) {
                // Create text element
                const lines = text.split('\n');
                const element = this.renderer.elementManager.addElement('text', {
                    text: text,
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

                // Create undo command
                if (this.commandManager) {
                    const createCommand = new CreateCommand(this.renderer.elementManager, element);
                    this.commandManager.executeCommand(createCommand);
                }

                this.renderer.redrawCanvas();
            }
            if (document.body.contains(textarea)) {
                document.body.removeChild(textarea);
            }
            this.setTool('select'); // Switch back to select

            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('toolChanged', { detail: { tool: 'select' } }));
        };

        textarea.addEventListener('blur', finish);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
            if (e.key === 'Escape') {
                if (document.body.contains(textarea)) {
                    document.body.removeChild(textarea);
                }
                this.setTool('select');
                window.dispatchEvent(new CustomEvent('toolChanged', { detail: { tool: 'select' } }));
            }
        });
    }

    /**
     * Insert an image from file
     */
    insertImage(file, x, y) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Scale down if too big
                let width = img.width;
                let height = img.height;
                const maxSize = 500;

                if (width > maxSize || height > maxSize) {
                    const ratio = width / height;
                    if (width > height) {
                        width = maxSize;
                        height = maxSize / ratio;
                    } else {
                        height = maxSize;
                        width = maxSize * ratio;
                    }
                }

                const element = this.renderer.elementManager.addElement('image', {
                    src: e.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height
                }, x, y);

                element.width = width;
                element.height = height;

                if (this.commandManager) {
                    const createCommand = new CreateCommand(this.renderer.elementManager, element);
                    this.commandManager.executeCommand(createCommand);
                }

                this.renderer.redrawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    handleCopy(e) {
        if (this.renderer.elementManager.hasSelection()) {
            // e.preventDefault(); // Don't prevent default if we want to allow copying text from inputs? 
            // But we are on canvas.
            e.preventDefault();
            const json = this.renderer.elementManager.copySelected();
            if (json) {
                e.clipboardData.setData('text/plain', json);
            }
        }
    }

    handlePaste(e) {
        // Only handle if not in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;

        // Determine paste position
        const rect = this.canvas.getBoundingClientRect();
        let x, y;

        if (this.mouseX >= rect.left && this.mouseX <= rect.right &&
            this.mouseY >= rect.top && this.mouseY <= rect.bottom) {
            const screenX = this.mouseX - rect.left;
            const screenY = this.mouseY - rect.top;
            const canvasCoords = this.renderer.screenToCanvas(screenX, screenY);
            x = canvasCoords.x;
            y = canvasCoords.y;
        } else {
            // Center
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const canvasCoords = this.renderer.screenToCanvas(centerX, centerY);
            x = canvasCoords.x;
            y = canvasCoords.y;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                this.insertImage(blob, x, y);
                return;
            } else if (item.kind === 'string' && item.type === 'text/plain') {
                item.getAsString((text) => {
                    // Try to parse as JSON first (internal paste)
                    const pastedElements = this.renderer.elementManager.pasteFromJSON(text, x, y);
                    if (pastedElements.length > 0) {
                        this.renderer.redrawCanvas();
                    } else {
                        // Treat as plain text
                        this.insertText(text, x, y);
                    }
                });
                return;
            }
        }
    }

    insertText(text, x, y) {
        const lines = text.split('\n');
        const element = this.renderer.elementManager.addElement('text', {
            text: text,
            lines: lines,
            fontSize: this.renderer.fontSize,
            fontFamily: this.renderer.fontFamily,
            color: '#ffffff',
            lineHeight: this.renderer.lineHeight,
            padding: 0
        }, x, y);

        this.renderer.ctx.font = `${this.renderer.fontSize}px ${this.renderer.fontFamily}`;
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = this.renderer.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        element.width = maxWidth;
        element.height = lines.length * this.renderer.lineHeight;

        if (this.commandManager) {
            const createCommand = new CreateCommand(this.renderer.elementManager, element);
            this.commandManager.executeCommand(createCommand);
        }

        this.renderer.redrawCanvas();
    }
}

export default CanvasControls;
