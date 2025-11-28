import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { CreateCommand } from '../core/CommandManager.js';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

class PDFImporter {
    constructor(renderer, commandManager) {
        this.renderer = renderer;
        this.commandManager = commandManager;
        this.pdfDoc = null;
        this.pageNum = 1;
        this.scale = 1.5;
        this.segments = [];
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.overlayLayer = null;
    }

    /**
     * Open the PDF import modal
     */
    open() {
        this.createModal();
        // Trigger file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
            if (e.target.files[0]) {
                this.loadPdf(e.target.files[0]);
            } else {
                this.close();
            }
        };
        input.click();
    }

    /**
     * Create the modal UI
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'pdf-modal';
        this.modal.innerHTML = `
            <div class="pdf-modal-content">
                <div class="pdf-header">
                    <h3>Import PDF</h3>
                    <div class="pdf-controls">
                        <button class="btn-secondary" id="pdfPrevBtn">Previous</button>
                        <span id="pdfPageNum">Page 1</span>
                        <button class="btn-secondary" id="pdfNextBtn">Next</button>
                        <div class="divider"></div>
                        <button class="btn-secondary" id="pdfMarkTextBtn">Mark Text</button>
                        <button class="btn-secondary" id="pdfMarkFormulaBtn">Mark Formula</button>
                        <button class="btn-secondary" id="pdfMergeBtn">Merge</button>
                        <div class="divider"></div>
                        <button class="btn-primary" id="pdfImportBtn">Import Selected</button>
                        <button class="close-btn" id="pdfCloseBtn">×</button>
                    </div>
                </div>
                <div class="pdf-body">
                    <div class="pdf-container" id="pdfContainer">
                        <div class="canvas-wrapper" id="pdfCanvasWrapper">
                            <canvas id="pdfPreviewCanvas"></canvas>
                            <div id="pdfOverlayLayer"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Bind elements
        this.canvas = this.modal.querySelector('#pdfPreviewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayLayer = this.modal.querySelector('#pdfOverlayLayer');

        // Marquee state
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.marqueeEl = null;

        // Bind events
        this.modal.querySelector('#pdfCloseBtn').onclick = () => this.close();
        this.modal.querySelector('#pdfImportBtn').onclick = () => this.importSelected();

        this.modal.querySelector('#pdfPrevBtn').onclick = () => this.changePage(-1);
        this.modal.querySelector('#pdfNextBtn').onclick = () => this.changePage(1);

        this.modal.querySelector('#pdfMarkTextBtn').onclick = () => this.setSelectionType('text');
        this.modal.querySelector('#pdfMarkFormulaBtn').onclick = () => this.setSelectionType('graphic');
        this.modal.querySelector('#pdfMergeBtn').onclick = () => this.mergeSelected();
        // Merge button removed from header, moved to floating toolbar

        // Marquee events
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);

        this.overlayLayer.addEventListener('mousedown', this.boundHandleMouseDown);
        this.overlayLayer.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUp);

        // Floating toolbar
        this.toolbarEl = null;
    }

    updateToolbar() {
        const selected = this.segments.filter(s => s.selected);

        if (selected.length === 0) {
            if (this.toolbarEl) {
                this.toolbarEl.remove();
                this.toolbarEl = null;
            }
            return;
        }

        // Calculate position (top-right of selection bounding box)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(s => {
            minX = Math.min(minX, s.x);
            minY = Math.min(minY, s.y);
            maxX = Math.max(maxX, s.x + s.w);
            maxY = Math.max(maxY, s.y + s.h);
        });

        if (!this.toolbarEl) {
            this.toolbarEl = document.createElement('div');
            this.toolbarEl.className = 'pdf-floating-toolbar';
            this.toolbarEl.innerHTML = `
                <button class="pdf-toolbar-btn" title="Merge Selected" id="pdfFloatMerge">
                    <svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6zM2 2v20h20V2H2zm18 18H4V4h16v16z"/></svg>
                </button>
                <button class="pdf-toolbar-btn delete" title="Delete Selection" id="pdfFloatDelete">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            `;
            this.overlayLayer.appendChild(this.toolbarEl);

            this.toolbarEl.querySelector('#pdfFloatMerge').onclick = (e) => {
                e.stopPropagation();
                this.mergeSelected();
            };
            this.toolbarEl.querySelector('#pdfFloatDelete').onclick = (e) => {
                e.stopPropagation();
                this.deleteSelected();
            };
        }

        // Position above the selection
        this.toolbarEl.style.left = `${minX}px`;
        this.toolbarEl.style.top = `${minY - 40}px`; // 40px above
    }

    deleteSelected() {
        const selected = this.segments.filter(s => s.selected);
        selected.forEach(s => {
            const el = this.overlayLayer.querySelector(`[data-id="${s.id}"]`);
            if (el) el.remove();
        });
        this.segments = this.segments.filter(s => !s.selected);
        this.updateToolbar();
    }

    handleMouseDown(e) {
        if (e.target.classList.contains('segment-box')) return; // Let segment click handler work

        this.isSelecting = true;
        const rect = this.overlayLayer.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;

        // Create marquee element
        this.marqueeEl = document.createElement('div');
        this.marqueeEl.className = 'pdf-marquee';
        this.marqueeEl.style.left = `${this.startX}px`;
        this.marqueeEl.style.top = `${this.startY}px`;
        this.marqueeEl.style.width = '0px';
        this.marqueeEl.style.height = '0px';
        this.overlayLayer.appendChild(this.marqueeEl);
    }

    handleMouseMove(e) {
        if (!this.isSelecting || !this.marqueeEl) return;

        const rect = this.overlayLayer.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const x = Math.min(this.startX, currentX);
        const y = Math.min(this.startY, currentY);
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);

        this.marqueeEl.style.left = `${x}px`;
        this.marqueeEl.style.top = `${y}px`;
        this.marqueeEl.style.width = `${width}px`;
        this.marqueeEl.style.height = `${height}px`;
    }

    handleMouseUp(e) {
        if (!this.isSelecting) return;

        if (this.marqueeEl) {
            // Calculate intersection
            const rect = this.overlayLayer.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            const mx = Math.min(this.startX, currentX);
            const my = Math.min(this.startY, currentY);
            const mw = Math.abs(currentX - this.startX);
            const mh = Math.abs(currentY - this.startY);

            if (mw > 2 && mh > 2) {
                this.selectInBounds(mx, my, mw, mh, e.shiftKey);
            }

            this.marqueeEl.remove();
            this.marqueeEl = null;
        }

        this.isSelecting = false;
    }

    selectInBounds(mx, my, mw, mh, keepSelection) {
        if (!keepSelection) {
            // Deselect all first if not holding shift (optional, but standard behavior)
            // But user asked to "select all segments in box", implying adding to selection or just selecting them.
            // Let's assume standard behavior: clear unless shift is held? 
            // Or maybe just additive since it's a multi-step process. 
            // Let's make it additive for now as it's safer for "I want to select this area AND that area".
            // Actually, standard is: click empty -> clear, drag -> select.
            // If I click empty, handleMouseDown starts marquee.
            // Let's clear selection if not shift key.
            if (!keepSelection) {
                this.segments.forEach(s => {
                    s.selected = false;
                    const el = this.overlayLayer.querySelector(`[data-id="${s.id}"]`);
                    if (el) el.classList.remove('selected');
                });
            }
        }

        this.segments.forEach(s => {
            // Check intersection
            // Segment: s.x, s.y, s.w, s.h
            // Marquee: mx, my, mw, mh

            if (s.x < mx + mw &&
                s.x + s.w > mx &&
                s.y < my + mh &&
                s.y + s.h > my) {

                s.selected = true;
                const el = this.overlayLayer.querySelector(`[data-id="${s.id}"]`);
                if (el) el.classList.add('selected');
            }
        });
        this.updateToolbar();
    }

    close() {
        if (this.modal) {
            // Cleanup listeners
            this.overlayLayer.removeEventListener('mousedown', this.boundHandleMouseDown);
            this.overlayLayer.removeEventListener('mousemove', this.boundHandleMouseMove);
            document.removeEventListener('mouseup', this.boundHandleMouseUp);

            this.modal.remove();
            this.modal = null;
            this.pdfDoc = null;
            this.segments = [];
        }
    }

    async loadPdf(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            this.pdfDoc = await loadingTask.promise;
            this.pageNum = 1;
            this.renderPage(this.pageNum);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Failed to load PDF');
            this.close();
        }
    }

    async changePage(delta) {
        if (!this.pdfDoc) return;
        const newPage = this.pageNum + delta;
        if (newPage >= 1 && newPage <= this.pdfDoc.numPages) {
            this.pageNum = newPage;
            await this.renderPage(this.pageNum);
            this.updatePageLabel();
        }
    }

    updatePageLabel() {
        const label = this.modal.querySelector('#pdfPageNum');
        if (label && this.pdfDoc) {
            label.textContent = `Page ${this.pageNum} of ${this.pdfDoc.numPages}`;
        }
    }

    async renderPage(num) {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: this.scale });

        this.canvas.height = viewport.height;
        this.canvas.width = viewport.width;

        this.overlayLayer.style.width = `${viewport.width}px`;
        this.overlayLayer.style.height = `${viewport.height}px`;

        const renderContext = {
            canvasContext: this.ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Analyze content
        this.analyzeContent(page, viewport);
    }

    async analyzeContent(page, viewport) {
        this.segments = [];
        this.overlayLayer.innerHTML = '';

        // 1. Text Content
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
            if (!item.str.trim()) continue;

            // Transform [scaleX, skewY, skewX, scaleY, x, y]
            const tx = item.transform[4];
            const ty = item.transform[5];

            // Estimate font size from transform (scaleY)
            const fontSize = Math.sqrt(item.transform[3] * item.transform[3]);
            const w = item.width;
            const h = fontSize;

            // Construct rect in PDF coordinates (Y up)
            // Bottom-left: (tx, ty)
            const rect = [tx, ty, tx + w, ty + h];

            // Convert to viewport (Y down)
            const viewRect = viewport.convertToViewportRectangle(rect);

            // Normalize
            const x = Math.min(viewRect[0], viewRect[2]);
            const y = Math.min(viewRect[1], viewRect[3]);
            const width = Math.abs(viewRect[2] - viewRect[0]);
            const height = Math.abs(viewRect[3] - viewRect[1]);

            this.addSegment('text', x, y, width, height, { text: item.str });
        }

        // 2. Images (Simplified detection via operators)
        const opList = await page.getOperatorList();
        let ctm = [1, 0, 0, 1, 0, 0];
        const transformStack = [];

        for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i];
            const args = opList.argsArray[i];

            if (fn === pdfjsLib.OPS.save) {
                transformStack.push([...ctm]);
            } else if (fn === pdfjsLib.OPS.restore) {
                if (transformStack.length > 0) ctm = transformStack.pop();
            } else if (fn === pdfjsLib.OPS.transform) {
                const [a1, b1, c1, d1, e1, f1] = ctm;
                const [a2, b2, c2, d2, e2, f2] = args;
                ctm = [
                    a1 * a2 + c1 * b2,
                    b1 * a2 + d1 * b2,
                    a1 * c2 + c1 * d2,
                    b1 * c2 + d1 * d2,
                    a1 * e2 + c1 * f2 + e1,
                    b1 * e2 + d1 * f2 + f1
                ];
            } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
                // Image unit square (0,0) to (1,1)
                const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
                const transformedCorners = corners.map(p => {
                    const x = p[0], y = p[1];
                    return [
                        ctm[0] * x + ctm[2] * y + ctm[4],
                        ctm[1] * x + ctm[3] * y + ctm[5]
                    ];
                });

                const viewCorners = transformedCorners.map(p => viewport.convertToViewportPoint(p[0], p[1]));
                const xs = viewCorners.map(p => p[0]);
                const ys = viewCorners.map(p => p[1]);

                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                this.addSegment('image', minX, minY, maxX - minX, maxY - minY, { imageId: args[0] });
            }
        }
    }

    addSegment(type, x, y, w, h, data) {
        if (w <= 0 || h <= 0) return;
        const segment = {
            type, x, y, w, h, data,
            selected: false,
            id: Math.random().toString(36).substr(2, 9)
        };
        this.segments.push(segment);
        this.renderSegmentBox(segment);
    }

    renderSegmentBox(segment) {
        const div = document.createElement('div');
        div.className = `segment-box type-${segment.type}`;
        div.style.left = `${segment.x}px`;
        div.style.top = `${segment.y}px`;
        div.style.width = `${segment.w}px`;
        div.style.height = `${segment.h}px`;
        div.dataset.id = segment.id;

        div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSelection(segment, div);
        });

        this.overlayLayer.appendChild(div);
    }

    toggleSelection(segment, div) {
        segment.selected = !segment.selected;
        if (segment.selected) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
        this.updateToolbar();
    }

    setSelectionType(newType) {
        const selected = this.segments.filter(s => s.selected);
        selected.forEach(seg => {
            seg.type = newType;
            const el = this.overlayLayer.querySelector(`[data-id="${seg.id}"]`);
            if (el) {
                el.className = `segment-box type-${newType} selected`;
            }
        });
    }

    mergeSelected() {
        const selected = this.segments.filter(s => s.selected);
        if (selected.length < 2) return;

        // Calculate union bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(s => {
            minX = Math.min(minX, s.x);
            minY = Math.min(minY, s.y);
            maxX = Math.max(maxX, s.x + s.w);
            maxY = Math.max(maxY, s.y + s.h);
        });

        const width = maxX - minX;
        const height = maxY - minY;

        // Remove old segments
        selected.forEach(s => {
            const el = this.overlayLayer.querySelector(`[data-id="${s.id}"]`);
            if (el) el.remove();
        });
        this.segments = this.segments.filter(s => !s.selected);

        // Add new merged segment
        // Default to 'graphic' as merging usually implies creating a complex object
        this.addSegment('graphic', minX, minY, width, height, { merged: true });

        // Select the new segment
        const newSeg = this.segments[this.segments.length - 1];
        newSeg.selected = true;
        const newEl = this.overlayLayer.querySelector(`[data-id="${newSeg.id}"]`);
        if (newEl) newEl.classList.add('selected');

        this.updateToolbar();
    }

    async importSelected() {
        const selected = this.segments.filter(s => s.selected);
        if (selected.length === 0) return;

        // Calculate bounding box of selection
        let minX = Infinity, minY = Infinity;
        selected.forEach(s => {
            minX = Math.min(minX, s.x);
            minY = Math.min(minY, s.y);
        });

        // Center of current view
        const rect = this.renderer.canvas.getBoundingClientRect();
        let insertX = (rect.width / this.renderer.scale) / 2 - this.renderer.panX;
        let insertY = (rect.height / this.renderer.scale) / 2 - this.renderer.panY;

        // Adjust for zoom
        insertX /= this.renderer.zoom;
        insertY /= this.renderer.zoom;

        // Center the imported content around the insertion point
        // Optional: We could calculate the center of the selection group and align it to insertX, insertY
        // But aligning top-left to center is also fine, or maybe just offset from minX/minY

        for (const seg of selected) {
            // Calculate relative position
            const offsetX = seg.x - minX;
            const offsetY = seg.y - minY;

            const targetX = insertX + offsetX;
            const targetY = insertY + offsetY;

            if (seg.type === 'text') {
                // Import as Text Element
                const element = this.renderer.elementManager.addElement('text', {
                    text: seg.data.text,
                    lines: [seg.data.text],
                    fontSize: this.renderer.fontSize,
                    fontFamily: this.renderer.fontFamily,
                    color: '#ffffff',
                    lineHeight: this.renderer.lineHeight,
                    padding: 0
                }, targetX, targetY);

                // Calculate dimensions
                this.renderer.ctx.font = `${this.renderer.fontSize}px ${this.renderer.fontFamily}`;
                const metrics = this.renderer.ctx.measureText(seg.data.text);
                element.width = metrics.width;
                element.height = this.renderer.lineHeight;

                if (this.commandManager) {
                    this.commandManager.executeCommand(new CreateCommand(this.renderer.elementManager, element));
                }

            } else {
                // Import as Image (SVG or Raster)
                // If it's 'graphic', try SVG
                let src = null;
                let width = seg.w;
                let height = seg.h;

                if (seg.type === 'graphic') {
                    const svg = await this.createSvgForSegment(seg);
                    if (svg) {
                        // Convert SVG to data URL
                        const svgData = new XMLSerializer().serializeToString(svg);
                        src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    }
                }

                // Fallback to raster if SVG failed or it's a normal image
                if (!src) {
                    const sx = Math.floor(seg.x);
                    const sy = Math.floor(seg.y);
                    const sw = Math.ceil(seg.w);
                    const sh = Math.ceil(seg.h);

                    if (sw > 0 && sh > 0) {
                        const imageData = this.ctx.getImageData(sx, sy, sw, sh);
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = sw;
                        tempCanvas.height = sh;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(imageData, 0, 0);
                        src = tempCanvas.toDataURL();
                    }
                }

                if (src) {
                    const element = this.renderer.elementManager.addElement('image', {
                        src: src,
                        originalWidth: width,
                        originalHeight: height
                    }, targetX, targetY);

                    element.width = width;
                    element.height = height;

                    if (this.commandManager) {
                        this.commandManager.executeCommand(new CreateCommand(this.renderer.elementManager, element));
                    }
                }
            }
        }

        this.renderer.redrawCanvas();
        this.close();
    }

    async createSvgForSegment(seg) {
        try {
            const page = await this.pdfDoc.getPage(this.pageNum);
            const opList = await page.getOperatorList();
            const viewport = page.getViewport({ scale: this.scale });

            const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
            const svg = await svgGfx.getSVG(opList, viewport);

            svg.setAttribute('viewBox', `${seg.x} ${seg.y} ${seg.w} ${seg.h}`);
            svg.setAttribute('width', `${seg.w}`);
            svg.setAttribute('height', `${seg.h}`);
            svg.style.overflow = 'hidden';

            return svg;
        } catch (e) {
            console.error("Error creating SVG:", e);
            return null;
        }
    }
}

export default PDFImporter;
