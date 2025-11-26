/**
 * Storage Manager - Handle canvas persistence
 * Save/load canvas state to localStorage
 */

class StorageManager {
    constructor(elementManager) {
        this.elementManager = elementManager;
        this.storageKey = 'ai-blackboard-canvas';
        this.autoSaveInterval = null;
        this.autoSaveDelay = 30000; // 30 seconds
        this.lastSaveTime = null;
    }

    /**
     * Serialize canvas elements to JSON
     */
    serializeCanvas() {
        const elements = this.elementManager.getAllElements();

        const canvasData = {
            version: '1.0',
            savedAt: Date.now(),
            elementCount: elements.length,
            elements: elements.map(el => ({
                id: el.id,
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                zIndex: el.zIndex,
                data: el.data
            }))
        };

        return JSON.stringify(canvasData);
    }

    /**
     * Deserialize JSON to canvas elements
     */
    deserializeCanvas(json) {
        try {
            const canvasData = JSON.parse(json);

            if (!canvasData.elements || !Array.isArray(canvasData.elements)) {
                throw new Error('Invalid canvas data format');
            }

            return canvasData;
        } catch (error) {
            console.error('Failed to deserialize canvas:', error);
            return null;
        }
    }

    /**
     * Save canvas to localStorage
     */
    saveCanvas() {
        try {
            const json = this.serializeCanvas();
            localStorage.setItem(this.storageKey, json);
            this.lastSaveTime = Date.now();
            console.log('Canvas saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save canvas:', error);
            return false;
        }
    }

    /**
     * Load canvas from localStorage
     */
    loadCanvas() {
        try {
            const json = localStorage.getItem(this.storageKey);

            if (!json) {
                console.log('No saved canvas found');
                return false;
            }

            const canvasData = this.deserializeCanvas(json);

            if (!canvasData) {
                return false;
            }

            // Clear current elements
            this.elementManager.clear();

            // Restore elements
            canvasData.elements.forEach(elData => {
                const element = this.elementManager.addElement(
                    elData.type,
                    elData.data,
                    elData.x,
                    elData.y
                );

                element.id = elData.id;
                element.width = elData.width;
                element.height = elData.height;
                element.zIndex = elData.zIndex || 0;
            });

            console.log(`Canvas loaded: ${canvasData.elementCount} elements`);
            this.lastSaveTime = canvasData.savedAt;
            return true;
        } catch (error) {
            console.error('Failed to load canvas:', error);
            return false;
        }
    }

    /**
     * Check if saved canvas exists
     */
    hasSavedCanvas() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * Clear saved canvas
     */
    clearSavedCanvas() {
        localStorage.removeItem(this.storageKey);
        this.lastSaveTime = null;
        console.log('Saved canvas cleared');
    }

    /**
     * Export canvas as downloadable JSON file
     */
    exportToFile(filename = 'blackboard-canvas.json') {
        const json = this.serializeCanvas();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
        console.log('Canvas exported to file');
    }

    /**
     * Import canvas from JSON file
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const json = e.target.result;
                    const canvasData = this.deserializeCanvas(json);

                    if (!canvasData) {
                        reject(new Error('Invalid file format'));
                        return;
                    }

                    // Clear and restore
                    this.elementManager.clear();

                    canvasData.elements.forEach(elData => {
                        const element = this.elementManager.addElement(
                            elData.type,
                            elData.data,
                            elData.x,
                            elData.y
                        );

                        element.id = elData.id;
                        element.width = elData.width;
                        element.height = elData.height;
                        element.zIndex = elData.zIndex || 0;
                    });

                    console.log('Canvas imported from file');
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveInterval) {
            return; // Already running
        }

        this.autoSaveInterval = setInterval(() => {
            this.saveCanvas();
        }, this.autoSaveDelay);

        console.log(`Auto-save enabled (every ${this.autoSaveDelay / 1000}s)`);
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('Auto-save disabled');
        }
    }

    /**
     * Get last save time
     */
    getLastSaveTime() {
        return this.lastSaveTime;
    }

    /**
     * Get formatted last save time
     */
    getLastSaveTimeFormatted() {
        if (!this.lastSaveTime) {
            return 'Never';
        }

        const now = Date.now();
        const diff = now - this.lastSaveTime;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (seconds > 5) {
            return `${seconds} seconds ago`;
        } else {
            return 'Just now';
        }
    }
}

export default StorageManager;
