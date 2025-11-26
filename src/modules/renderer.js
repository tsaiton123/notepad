/**
 * Blackboard Renderer Module
 * Handles canvas rendering with handwriting-style text animation
 */

import PlottingTools from '../utils/plottingTools.js';
import CanvasElementManager from './canvasElements.js';

class BlackboardRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = window.devicePixelRatio || 1;

        // Pan and zoom state
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;

        // Legacy support
        this.offsetX = 0;
        this.offsetY = 0;

        // Content positioning
        this.currentY = 40;
        this.padding = 40;
        this.lineHeight = 40;
        this.fontSize = 24;
        this.fontFamily = 'Caveat';
        this.textColor = '#fafafa';
        this.isAnimating = false;

        // Element storage for infinite canvas
        this.elementManager = new CanvasElementManager();

        this.plottingTools = new PlottingTools(canvas, this.ctx);

        this.initCanvas();
        this.setupEventListeners();
    }

    /**
     * Initialize canvas with proper dimensions
     */
    initCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.scale;
        this.canvas.height = rect.height * this.scale;
        this.ctx.scale(this.scale, this.scale);
        this.clear();
    }

    /**
     * Setup event listeners for resize
     */
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.initCanvas();
        });
    }

    /**
     * Clear the blackboard
     */
    clear() {
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        this.ctx.fillStyle = '#1a1f2e';
        this.ctx.fillRect(0, 0, width, height);
        this.currentY = this.padding;

        // Clear all stored elements
        this.elementManager.clear();
    }

    /**
     * Set font style
     */
    setFont(size = this.fontSize, family = this.fontFamily) {
        this.fontSize = size;
        this.fontFamily = family;
        this.ctx.font = `${size}px ${family}`;
    }

    /**
     * Render text with handwriting animation
     * @param {string} text - Text to render
     * @param {Function} onComplete - Callback when animation completes
     */
    async renderText(text, onComplete) {
        this.isAnimating = true;
        const startY = this.currentY;
        const lines = this.wrapText(text);

        // Store text element
        const element = this.elementManager.addElement('text', {
            text,
            lines,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            color: this.textColor,
            lineHeight: this.lineHeight,
            padding: this.padding
        }, this.padding, startY);

        // Animate rendering
        for (const line of lines) {
            await this.animateLine(line);
            this.currentY += this.lineHeight;
        }

        // Update element dimensions
        element.height = this.currentY - startY;
        element.width = (this.canvas.width / this.scale) - (this.padding * 2);

        this.isAnimating = false;
        if (onComplete) onComplete();
    }

    /**
     * Wrap text to fit canvas width
     * @param {string} text - Text to wrap
     * @returns {Array<string>} - Array of wrapped lines
     */
    wrapText(text) {
        const maxWidth = (this.canvas.width / this.scale) - (this.padding * 2);
        const paragraphs = text.split('\n');
        const lines = [];

        this.setFont();

        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
                lines.push('');
                continue;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = this.ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine !== '') {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * Animate a single line of text character by character
     * @param {string} line - Line to animate
     */
    async animateLine(line) {
        if (!line) return;

        const chars = line.split('');
        const x = this.padding + this.offsetX;
        const y = this.currentY + this.offsetY;
        let currentX = x;

        this.setFont();
        this.ctx.fillStyle = this.textColor;

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];

            // Add slight random variation to simulate handwriting
            const yVariation = (Math.random() - 0.5) * 2;

            this.ctx.fillText(char, currentX, y + yVariation);

            // Measure character width for next position
            const metrics = this.ctx.measureText(char);
            currentX += metrics.width;

            // Delay for animation effect (faster for spaces)
            const delay = char === ' ' ? 10 : 30;
            await this.sleep(delay);
        }
    }

    /**
     * Render a graph based on parsed data
     * @param {Object} graphData - Graph configuration
     */
    async renderGraph(graphData) {
        this.currentY += 20; // Add some spacing

        const graphHeight = 300;
        const graphWidth = (this.canvas.width / this.scale) - (this.padding * 2);
        const graphX = this.padding;
        const graphY = this.currentY;

        // Store graph element
        const element = this.elementManager.addElement('graph', {
            ...graphData,
            xMin: graphData.xMin || -10,
            xMax: graphData.xMax || 10,
            yMin: graphData.yMin || null,
            yMax: graphData.yMax || null,
            color: graphData.color || '#6366f1',
            width: graphWidth,
            height: graphHeight
        }, graphX, graphY);

        element.width = graphWidth;
        element.height = graphHeight;

        if (graphData.type === 'function') {
            await this.plottingTools.plotFunction({
                expression: graphData.expression,
                xMin: graphData.xMin || -10,
                xMax: graphData.xMax || 10,
                yMin: graphData.yMin || null,
                yMax: graphData.yMax || null,
                color: graphData.color || '#6366f1',
                x: graphX,
                y: graphY,
                width: graphWidth,
                height: graphHeight
            });
        }

        this.currentY += graphHeight + 40;
    }

    /**
     * Parse math expression into executable function
     * @param {string} expr - Expression like "sin(x)", "x^2", "2*x + 1"
     * @returns {Function} - Function that takes x and returns y
     */
    parseMathExpression(expr) {
        // Clean up expression
        let cleanExpr = expr.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/\^/g, '**')
            .replace(/(\d)([a-z])/g, '$1*$2'); // Add implicit multiplication

        // Create safe function
        try {
            return new Function('x', `
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const sqrt = Math.sqrt;
        const abs = Math.abs;
        const log = Math.log;
        const exp = Math.exp;
        const PI = Math.PI;
        const E = Math.E;
        return ${cleanExpr};
      `);
        } catch (e) {
            console.error('Error parsing expression:', expr, e);
            return () => 0;
        }
    }

    /**
     * Reset view to default
     */
    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        // Trigger a re-render if needed
        this.redrawCanvas();
    }

    /**
     * Zoom in/out (legacy method for toolbar buttons)
     */
    setZoom(delta) {
        const centerX = (this.canvas.width / this.scale) / 2;
        const centerY = (this.canvas.height / this.scale) / 2;
        this.zoomAt(centerX, centerY, delta);
    }

    /**
     * Zoom at specific point (for mouse wheel)
     */
    zoomAt(x, y, delta) {
        const oldZoom = this.zoom;

        // Calculate new zoom level
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));

        // Adjust pan to zoom at the cursor position
        const zoomChange = this.zoom / oldZoom;
        this.panX = x - (x - this.panX) * zoomChange;
        this.panY = y - (y - this.panY) * zoomChange;

        // Update UI
        this.updateZoomDisplay();

        // Trigger re-render
        this.redrawCanvas();
    }

    /**
     * Update zoom display in UI
     */
    updateZoomDisplay() {
        const zoomPercent = Math.round(this.zoom * 100);
        const zoomLevelEl = document.getElementById('zoomLevel');
        const statusZoomEl = document.getElementById('statusZoom');

        if (zoomLevelEl) zoomLevelEl.textContent = `${zoomPercent}%`;
        if (statusZoomEl) statusZoomEl.textContent = `${zoomPercent}%`;
    }

    /**
     * Pan the canvas
     */
    pan(dx, dy) {
        this.panX += dx;
        this.panY += dy;

        // Trigger re-render
        this.redrawCanvas();
    }

    /**
     * Apply transform to context
     */
    applyTransform() {
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
    }

    /**
     * Reset transform
     */
    resetTransform() {
        this.ctx.restore();
    }

    /**
     * Convert screen coordinates to canvas coordinates
     */
    screenToCanvas(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    /**
     * Convert canvas coordinates to screen coordinates
     */
    canvasToScreen(canvasX, canvasY) {
        return {
            x: canvasX * this.zoom + this.panX,
            y: canvasY * this.zoom + this.panY
        };
    }

    /**
     * Redraw the entire canvas (for pan/zoom updates)
     */
    redrawCanvas() {
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;

        // Clear without transform
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        this.ctx.fillStyle = '#1a1f2e';
        this.ctx.fillRect(0, 0, width, height);

        // Apply transform for content
        this.applyTransform();

        // Render all stored elements (already sorted by z-index from elementManager)
        const elements = this.elementManager.getAllElements();
        for (const element of elements) {
            this.renderElement(element);
        }

        // Render selection indicators for ALL selected elements
        const selectedElements = this.elementManager.getSelectedElements();
        for (const element of selectedElements) {
            this.renderSelectionBox(element);
        }

        this.resetTransform();
    }

    /**
     * Render selection box around an element
     */
    renderSelectionBox(element) {
        this.ctx.strokeStyle = '#3b82f6'; // Blue
        this.ctx.lineWidth = 2 / this.zoom; // Scale line width inversely with zoom
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]); // Dashed line

        // Draw selection box
        this.ctx.strokeRect(
            element.x - 4,
            element.y - 4,
            element.width + 8,
            element.height + 8
        );

        // Reset line dash
        this.ctx.setLineDash([]);
    }

    /**
     * Render marquee selection rectangle
     */
    renderMarquee(x, y, width, height) {
        this.applyTransform();

        // Semi-transparent fill
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        this.ctx.fillRect(x, y, width, height);

        // Dashed border
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);

        this.resetTransform();
    }

    /**
     * Capture selected elements as a base64 image
     */
    async captureSelectionAsImage(elements) {
        if (!elements || elements.length === 0) return null;

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elements.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
        });

        // Add padding
        const padding = 20;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const width = maxX - minX;
        const height = maxY - minY;

        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill background (blackboard color)
        tempCtx.fillStyle = '#1a1f2e';
        tempCtx.fillRect(0, 0, width, height);

        // Render elements onto temp canvas
        // We need to translate them so minX, minY is at 0,0
        tempCtx.translate(-minX, -minY);

        // We can reuse renderElement but we need to temporarily swap ctx
        const originalCtx = this.ctx;
        this.ctx = tempCtx;

        // Render elements
        for (const el of elements) {
            this.renderElement(el);
        }

        // Restore ctx
        this.ctx = originalCtx;

        return tempCanvas.toDataURL('image/png');
    }

    /**
     * Render a single element (without animation)
     */
    renderElement(element) {
        switch (element.type) {
            case 'text':
                this.renderTextElement(element);
                break;
            case 'graph':
                this.renderGraphElement(element);
                break;
            case 'stroke':
                this.renderStrokeElement(element);
                break;
            case 'image':
                this.renderImageElement(element);
                break;
            default:
                console.warn(`Unknown element type: ${element.type}`);
        }
    }

    /**
     * Render an image element
     */
    renderImageElement(element) {
        const data = element.data;
        if (!element.cachedImage) {
            const img = new Image();
            img.src = data.src;
            img.onload = () => {
                this.redrawCanvas();
            };
            element.cachedImage = img;
        }

        if (element.cachedImage.complete && element.cachedImage.naturalWidth !== 0) {
            this.ctx.drawImage(element.cachedImage, element.x, element.y, element.width, element.height);
        }
    }

    /**
     * Render a text element (non-animated, for redraw)
     */
    renderTextElement(element) {
        const data = element.data;
        this.ctx.font = `${data.fontSize}px ${data.fontFamily}`;
        this.ctx.fillStyle = data.color;

        let currentY = element.y;
        for (const line of data.lines) {
            this.ctx.fillText(line, element.x, currentY);
            currentY += data.lineHeight;
        }
    }

    /**
     * Render a graph element (non-animated, for redraw)
     */
    renderGraphElement(element) {
        const data = element.data;
        if (data.type === 'function') {
            // Render graph synchronously (no animation)
            this.plottingTools.plotFunctionSync({
                expression: data.expression,
                xMin: data.xMin,
                xMax: data.xMax,
                yMin: data.yMin,
                yMax: data.yMax,
                color: data.color,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height
            });
        }
    }

    /**
     * Render a stroke element (pen drawing)
     */
    renderStrokeElement(element) {
        const data = element.data;
        if (!data.points || data.points.length < 2) return;

        this.ctx.strokeStyle = data.color || '#ffffff';
        this.ctx.lineWidth = data.width || 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        const firstPoint = data.points[0];
        this.ctx.moveTo(element.x + firstPoint.x, element.y + firstPoint.y);

        for (let i = 1; i < data.points.length; i++) {
            const point = data.points[i];
            this.ctx.lineTo(element.x + point.x, element.y + point.y);
        }

        this.ctx.stroke();
    }

    /**
     * Render stroke preview while drawing
     */
    renderStrokePreview(stroke) {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;

        this.applyTransform();

        this.ctx.strokeStyle = stroke.color || '#ffffff';
        this.ctx.lineWidth = stroke.width || 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }

        this.ctx.stroke();

        this.resetTransform();
    }


    /**
     * Utility sleep function for animations
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if currently animating
     */
    isCurrentlyAnimating() {
        return this.isAnimating;
    }
}

export default BlackboardRenderer;
