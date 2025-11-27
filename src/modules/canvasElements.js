/**
 * Canvas Elements Module
 * Manages storage and retrieval of canvas elements for infinite canvas
 */

class CanvasElement {
    constructor(type, data, x, y) {
        this.id = this.generateId();
        this.type = type; // 'text', 'graph', 'shape', etc.
        this.data = data;
        this.x = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.zIndex = 0; // NEW: Layer order (higher = on top)
        this.createdAt = Date.now();
    }

    generateId() {
        return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class CanvasElementManager {
    constructor() {
        this.elements = [];
        this.selectedElements = []; // Changed from single to multi-select
        this.nextZIndex = 0;
        this.clipboard = []; // For copy/paste
    }

    /**
     * Add a new element
     */
    addElement(type, data, x, y) {
        const element = new CanvasElement(type, data, x, y);
        element.zIndex = this.nextZIndex++;
        this.elements.push(element);
        return element;
    }

    /**
     * Remove an element by ID
     */
    removeElement(id) {
        this.elements = this.elements.filter(el => el.id !== id);
        // Remove from selection if selected
        this.selectedElements = this.selectedElements.filter(el => el.id !== id);
    }

    /**
     * Get all elements
     */
    getAllElements() {
        // Return elements sorted by z-index (lowest first, so highest renders last/on top)
        return [...this.elements].sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Get elements visible in viewport (optimization for later)
     */
    getElementsInView(viewX, viewY, viewWidth, viewHeight) {
        // For now, return all elements
        // Later, we can optimize to only return visible elements
        return this.elements;
    }

    /**
     * Clear all elements
     */
    clear() {
        this.elements = [];
        this.selectedElements = [];
        this.clipboard = [];
        this.nextZIndex = 0;
    }

    /**
     * Check if element intersects with view bounds
     */
    isInView(element, viewX, viewY, viewWidth, viewHeight) {
        const elRight = element.x + element.width;
        const elBottom = element.y + element.height;
        const viewRight = viewX + viewWidth;
        const viewBottom = viewY + viewHeight;

        return !(elRight < viewX ||
            element.x > viewRight ||
            elBottom < viewY ||
            element.y > viewBottom);
    }

    /**
     * Find element at given canvas coordinates (top element wins)
     */
    getElementAt(canvasX, canvasY) {
        // Sort by z-index and check from top (highest z-index) first
        const sorted = [...this.elements].sort((a, b) => b.zIndex - a.zIndex);

        for (const el of sorted) {
            if (this.isPointInElement(el, canvasX, canvasY)) {
                return el;
            }
        }
        return null;
    }

    /**
     * Check if a point is inside an element's bounds
     */
    isPointInElement(element, x, y) {
        return x >= element.x &&
            x <= element.x + element.width &&
            y >= element.y &&
            y <= element.y + element.height;
    }

    /**
     * Multi-Select Methods
     */

    selectElement(element, addToSelection = false) {
        if (!addToSelection) {
            this.selectedElements = [element];
        } else {
            if (!this.isSelected(element)) {
                this.selectedElements.push(element);
            }
        }
        this.updateSelectionStatus();
    }

    addToSelection(element) {
        if (!this.isSelected(element)) {
            this.selectedElements.push(element);
            this.updateSelectionStatus();
        }
    }

    removeFromSelection(element) {
        this.selectedElements = this.selectedElements.filter(el => el.id !== element.id);
        this.updateSelectionStatus();
    }

    toggleSelection(element) {
        if (this.isSelected(element)) {
            this.removeFromSelection(element);
        } else {
            this.addToSelection(element);
        }
    }

    clearSelection() {
        this.selectedElements = [];
        this.updateSelectionStatus();
    }

    selectAll() {
        this.selectedElements = [...this.elements];
        this.updateSelectionStatus();
    }

    /**
     * Update selection status in UI
     */
    updateSelectionStatus() {
        const statusSelection = document.getElementById('statusSelection');
        if (statusSelection) {
            const count = this.selectedElements.length;
            if (count === 0) {
                statusSelection.textContent = 'No selection';
            } else if (count === 1) {
                statusSelection.textContent = '1 item selected';
            } else {
                statusSelection.textContent = `${count} items selected`;
            }
        }
    }

    getSelectedElements() {
        return this.selectedElements;
    }

    isSelected(element) {
        return this.selectedElements.some(el => el.id === element.id);
    }

    hasSelection() {
        return this.selectedElements.length > 0;
    }

    // Backwards compatibility
    getSelectedElement() {
        return this.selectedElements[0] || null;
    }

    deselectElement() {
        this.clearSelection();
    }

    /**
     * Update element position
     */
    updateElementPosition(element, newX, newY) {
        element.x = newX;
        element.y = newY;
    }

    /**
     * Copy/Paste Methods
     */

    copySelected() {
        if (this.selectedElements.length === 0) return null;

        // Deep copy selected elements data
        this.clipboard = this.selectedElements.map(el => ({
            type: el.type,
            data: { ...el.data },
            width: el.width,
            height: el.height,
            x: el.x,
            y: el.y
        }));

        return JSON.stringify(this.clipboard);
    }

    paste(offsetX = 20, offsetY = 20) {
        if (this.clipboard.length === 0) return [];

        const newElements = [];

        this.clipboard.forEach(elData => {
            // Find original element to get position
            // Use stored x/y if available (from new copySelected), else fallback
            const x = (elData.x || 0) + offsetX;
            const y = (elData.y || 0) + offsetY;

            const newEl = this.addElement(elData.type, elData.data, x, y);
            newEl.width = elData.width;
            newEl.height = elData.height;
            newElements.push(newEl);
        });

        // Select pasted elements
        this.selectedElements = newElements;
        return newElements;
    }

    pasteFromJSON(json, targetX, targetY) {
        try {
            const clipboardData = JSON.parse(json);
            if (!Array.isArray(clipboardData)) return [];

            // Calculate bounding box of clipboard items
            let minX = Infinity;
            let minY = Infinity;
            clipboardData.forEach(el => {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
            });

            const newElements = [];
            clipboardData.forEach(elData => {
                // Calculate relative position
                const dx = elData.x - minX;
                const dy = elData.y - minY;

                const x = targetX + dx;
                const y = targetY + dy;

                const newEl = this.addElement(elData.type, elData.data, x, y);
                newEl.width = elData.width;
                newEl.height = elData.height;
                newElements.push(newEl);
            });

            this.selectedElements = newElements;
            return newElements;
        } catch (e) {
            console.error('Paste error', e);
            return [];
        }
    }

    duplicateSelected() {
        this.copySelected();
        return this.paste(20, 20);
    }

    deleteSelected() {
        const deleted = [...this.selectedElements];
        deleted.forEach(el => this.removeElement(el.id));
        this.selectedElements = [];
        return deleted;
    }

    /**
     * Layer/Z-Index Methods
     */

    bringToFront(element) {
        element.zIndex = this.nextZIndex++;
    }

    sendToBack(element) {
        // Find minimum z-index
        const minZ = Math.min(...this.elements.map(el => el.zIndex));
        element.zIndex = minZ - 1;
    }

    bringForward(element) {
        element.zIndex += 1;
    }

    sendBackward(element) {
        element.zIndex -= 1;
    }

    /**
     * Selection by bounds (for marquee)
     */
    selectInBounds(x, y, width, height) {
        const selected = this.elements.filter(el => {
            // Check if element intersects with selection bounds
            return !(el.x > x + width ||
                el.x + el.width < x ||
                el.y > y + height ||
                el.y + el.height < y);
        });

        this.selectedElements = selected;
        return selected;
    }
}

export { CanvasElement, CanvasElementManager };
export default CanvasElementManager;
