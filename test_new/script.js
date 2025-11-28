import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const overlayLayer = document.getElementById('overlayLayer');
const outputContent = document.getElementById('outputContent');
const convertBtn = document.getElementById('convertBtn');

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let scale = 1.5;
let segments = []; // Store identified segments {type, x, y, w, h, data}

async function loadPdf() {
    try {
        const loadingTask = pdfjsLib.getDocument('test.pdf');
        pdfDoc = await loadingTask.promise;
        renderPage(pageNum);
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

async function renderPage(num) {
    pageRendering = true;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Match overlay size to canvas
    overlayLayer.style.width = `${viewport.width}px`;
    overlayLayer.style.height = `${viewport.height}px`;

    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    await page.render(renderContext).promise;
    pageRendering = false;

    // After rendering, analyze content
    analyzeContent(page, viewport);
}

async function analyzeContent(page, viewport) {
    segments = [];
    overlayLayer.innerHTML = '';

    // 1. Text Content
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
        if (!item.str.trim()) continue; // Skip empty whitespace

        // Transform [x, y, w, h] is not directly given. 
        // item.transform = [scaleX, skewY, skewX, scaleY, x, y]
        // x = tx, y = ty

        const tx = item.transform[4];
        const ty = item.transform[5];

        // item.height is often 0, so we estimate from transform
        // transform[0] is scaleX, transform[3] is scaleY (usually font size)
        // Note: PDF coordinate system has Y growing UP.
        // ty is the baseline.
        // The text extends from roughly [ty - descent, ty + ascent]
        // But simplified: [ty, ty + fontSize] (if we ignore descent for a moment and assume ty is bottom)
        // Actually, in PDF, (tx, ty) is the bottom-left of the glyph origin.
        // So the text is ABOVE ty.
        // Height is roughly scaleY.

        const fontSize = Math.sqrt(item.transform[3] * item.transform[3]);
        const w = item.width;
        const h = fontSize;

        // Construct rect in PDF coordinates (Y up)
        // Bottom-left: (tx, ty)
        // Top-right: (tx + w, ty + h)
        // Note: This ignores descent (text going below baseline), but is a good start.
        const rect = [tx, ty, tx + w, ty + h];

        // Convert to viewport (Y down)
        const viewRect = viewport.convertToViewportRectangle(rect);

        // viewRect is [x1, y1, x2, y2]
        // Normalize
        const x = Math.min(viewRect[0], viewRect[2]);
        const y = Math.min(viewRect[1], viewRect[3]);
        const width = Math.abs(viewRect[2] - viewRect[0]);
        const height = Math.abs(viewRect[3] - viewRect[1]);

        addSegment('text', x, y, width, height, { text: item.str });
    }

    // 2. Images and Graphics (Operators)
    const opList = await page.getOperatorList();
    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;

    // We need to track state to know where we are drawing
    // This is complex because we need to replay the transforms.
    // A shortcut is to look for `paintImageXObject` and try to get the current transform.
    // But we don't have the transform state easily unless we replay.

    // ALTERNATIVE: Use the `commonObjs` and `objs` to find images, but positioning is hard.

    // Let's try a heuristic: 
    // If we can't easily get image coordinates without a full canvas replay implementation (which is what pdf.js does internally),
    // we might be stuck. 
    // HOWEVER, pdf.js has a `SVGGraphics` backend. Maybe we can use that to get elements?
    // Or we can just scan for `re` (rectangle) or `m` (move) `l` (line) ops for graphics.

    // For this prototype, let's try to detect "Graphics" by looking for path operators.
    // If we see a lot of path ops in a region, we mark it.

    // Since implementing a full operator parser is hard, let's try a visual segmentation approach?
    // No, that requires CV.

    // Let's go back to the operator list. We can track the transformation matrix.
    // This is a simplified tracker.
    let ctm = [1, 0, 0, 1, 0, 0]; // Current Transformation Matrix
    const transformStack = [];

    for (let i = 0; i < fnArray.length; i++) {
        const fn = fnArray[i];
        const args = argsArray[i];

        if (fn === pdfjsLib.OPS.save) {
            transformStack.push([...ctm]);
        } else if (fn === pdfjsLib.OPS.restore) {
            if (transformStack.length > 0) ctm = transformStack.pop();
        } else if (fn === pdfjsLib.OPS.transform) {
            // args: [a, b, c, d, e, f]
            // Multiply ctm * args
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
            // Image is drawn in the unit square (0,0) to (1,1) transformed by CTM.
            // So we just need to transform (0,0) and (1,1) (and corners) by CTM to get the box.

            // PDF coords
            const corners = [
                [0, 0], [1, 0], [1, 1], [0, 1]
            ];

            const transformedCorners = corners.map(p => {
                const x = p[0];
                const y = p[1];
                return [
                    ctm[0] * x + ctm[2] * y + ctm[4],
                    ctm[1] * x + ctm[3] * y + ctm[5]
                ];
            });

            // Convert to viewport
            const viewCorners = transformedCorners.map(p => {
                // p is [x, y] in PDF space
                // We need to construct a point-like object for convertToViewportPoint
                // But wait, convertToViewportRectangle takes [x1, y1, x2, y2].
                // Let's just use convertToViewportPoint for each corner.
                const res = viewport.convertToViewportPoint(p[0], p[1]);
                return res; // [x, y]
            });

            // Find bounding box in viewport
            const xs = viewCorners.map(p => p[0]);
            const ys = viewCorners.map(p => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            addSegment('image', minX, minY, maxX - minX, maxY - minY, { imageId: args[0] });
        }
        // For paths (graphics/formulas), it's harder because they are sequences of ops.
        // We could look for `fill` or `stroke` ops and use the current path bounds?
        // pdf.js doesn't expose "current path bounds" easily.
        // We would need to track `constructPath` ops.
    }

    // Merge overlapping text segments to clean up
    mergeTextSegments();
}

function addSegment(type, x, y, w, h, data) {
    // Basic validation
    if (w <= 0 || h <= 0) return;

    const segment = { type, x, y, w, h, data, selected: false, id: Math.random().toString(36).substr(2, 9) };
    segments.push(segment);
    renderSegmentBox(segment);
}

function renderSegmentBox(segment) {
    const div = document.createElement('div');
    div.className = `segment-box type-${segment.type}`;
    div.style.left = `${segment.x}px`;
    div.style.top = `${segment.y}px`;
    div.style.width = `${segment.w}px`;
    div.style.height = `${segment.h}px`;
    div.dataset.id = segment.id;

    div.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSelection(segment, div);
    });

    overlayLayer.appendChild(div);
}

function toggleSelection(segment, div) {
    segment.selected = !segment.selected;
    if (segment.selected) {
        div.classList.add('selected');
    } else {
        div.classList.remove('selected');
    }
}

function mergeTextSegments() {
    // Simple merger: if two text boxes overlap or are very close horizontally and vertically, merge them.
    // This is O(N^2) but N is small for a page.

    // Filter only text
    let textSegs = segments.filter(s => s.type === 'text');
    const otherSegs = segments.filter(s => s.type !== 'text');

    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < textSegs.length; i++) {
            for (let j = i + 1; j < textSegs.length; j++) {
                const a = textSegs[i];
                const b = textSegs[j];

                if (!a || !b) continue;

                // Check proximity
                const isCloseX = (a.x < b.x + b.w + 10) && (a.x + a.w + 10 > b.x); // Horizontal overlap or close
                const isCloseY = (a.y < b.y + b.h + 5) && (a.y + a.h + 5 > b.y);   // Vertical overlap or close (line height)

                if (isCloseX && isCloseY) {
                    // Merge b into a
                    const newX = Math.min(a.x, b.x);
                    const newY = Math.min(a.y, b.y);
                    const newW = Math.max(a.x + a.w, b.x + b.w) - newX;
                    const newH = Math.max(a.y + a.h, b.y + b.h) - newY;

                    a.x = newX;
                    a.y = newY;
                    a.w = newW;
                    a.h = newH;
                    a.data.text += ' ' + b.data.text; // Naive text merge

                    textSegs[j] = null; // Mark for removal
                    changed = true;
                }
            }
        }
        textSegs = textSegs.filter(s => s !== null);
    }

    // Re-render
    segments = [...otherSegs, ...textSegs];
    overlayLayer.innerHTML = '';
    segments.forEach(renderSegmentBox);
}

const markTextBtn = document.getElementById('markTextBtn');
const markImageBtn = document.getElementById('markImageBtn');

markTextBtn.addEventListener('click', () => setSelectionType('text'));
markImageBtn.addEventListener('click', () => setSelectionType('graphic'));

function setSelectionType(newType) {
    const selected = segments.filter(s => s.selected);
    selected.forEach(seg => {
        seg.type = newType;
        // Update visual
        const el = overlayLayer.querySelector(`[data-id="${seg.id}"]`);
        if (el) {
            el.className = `segment-box type-${newType} selected`;
        }
    });
}

convertBtn.addEventListener('click', () => {
    outputContent.innerHTML = '';
    const selected = segments.filter(s => s.selected);

    selected.sort((a, b) => a.y - b.y); // Sort by Y position

    selected.forEach(seg => {
        const wrapper = document.createElement('div');
        wrapper.className = 'converted-item';

        if (seg.type === 'text') {
            const p = document.createElement('p');
            p.textContent = seg.data.text;
            wrapper.appendChild(p);
        } else {
            // For images/graphics, we want exact appearance.
            // If it's a "graphic" (formula), we prefer SVG if possible, or high-res canvas.
            // Let's try to use the canvas crop but maybe we can do better?
            // The user wants "exact formal appearance".
            // Canvas is raster. SVG is vector.
            // Let's try to extract SVG for the segment.

            // We need the page's SVG rendering.
            // Since we didn't render SVG globally, let's do it on demand or use the canvas with high quality.
            // For now, let's stick to Canvas but maybe scale it up?
            // Or better: Use the SVGGraphics to get a vector crop.

            // To do SVG crop properly:
            // 1. We need the operator list (we have it in analyzeContent, but didn't save it).
            // 2. We need to render to SVG.

            // Let's modify the flow to support SVG extraction.
            // For this immediate step, let's use the canvas but ensure it's high res.
            // BUT the user specifically asked for "not image". SVG is the answer.

            // Let's try to generate the SVG for this segment.
            createSvgForSegment(seg).then(svg => {
                if (svg) {
                    wrapper.appendChild(svg);
                } else {
                    // Fallback to image
                    const img = document.createElement('img');
                    const sx = Math.floor(seg.x);
                    const sy = Math.floor(seg.y);
                    const sw = Math.ceil(seg.w);
                    const sh = Math.ceil(seg.h);

                    if (sw > 0 && sh > 0) {
                        const imageData = ctx.getImageData(sx, sy, sw, sh);
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = sw;
                        tempCanvas.height = sh;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(imageData, 0, 0);
                        img.src = tempCanvas.toDataURL();
                        wrapper.appendChild(img);
                    }
                }
            });
        }

        outputContent.appendChild(wrapper);
    });
});

async function createSvgForSegment(seg) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const opList = await page.getOperatorList();
        const viewport = page.getViewport({ scale: scale });

        const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
        const svg = await svgGfx.getSVG(opList, viewport);

        // Crop the SVG using viewBox
        // seg.x, seg.y, seg.w, seg.h are in viewport coordinates (CSS pixels)
        // SVG viewBox matches viewport dimensions.

        svg.setAttribute('viewBox', `${seg.x} ${seg.y} ${seg.w} ${seg.h}`);
        svg.setAttribute('width', `${seg.w}`);
        svg.setAttribute('height', `${seg.h}`);

        // We might need to clip it to ensure no overflow
        // But viewBox usually handles the "window".
        // However, SVG elements outside the viewBox might still be visible if overflow is not hidden.
        svg.style.overflow = 'hidden';

        return svg;
    } catch (e) {
        console.error("Error creating SVG:", e);
        return null;
    }
}

// Start
loadPdf();
