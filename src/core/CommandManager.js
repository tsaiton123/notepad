/**
 * Command Pattern for Undo/Redo System
 * Base Command class and specific command implementations
 */

// Base Command class
class Command {
    constructor() {
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }

    redo() {
        this.execute();
    }
}

// Move command - for dragging elements
class MoveCommand extends Command {
    constructor(elements, oldPositions, newPositions) {
        super();
        this.elements = elements;
        this.oldPositions = oldPositions;
        this.newPositions = newPositions;
    }

    execute() {
        this.elements.forEach((el, i) => {
            el.x = this.newPositions[i].x;
            el.y = this.newPositions[i].y;
        });
    }

    undo() {
        this.elements.forEach((el, i) => {
            el.x = this.oldPositions[i].x;
            el.y = this.oldPositions[i].y;
        });
    }
}

// Delete command - for removing elements
class DeleteCommand extends Command {
    constructor(elementManager, elements) {
        super();
        this.elementManager = elementManager;
        this.elements = elements;
        this.elementData = elements.map(el => ({ ...el, data: { ...el.data } }));
    }

    execute() {
        this.elements.forEach(el => {
            this.elementManager.removeElement(el.id);
        });
    }

    undo() {
        // Restore deleted elements
        this.elementData.forEach(data => {
            const element = this.elementManager.addElement(
                data.type,
                data.data,
                data.x,
                data.y
            );
            element.id = data.id;
            element.width = data.width;
            element.height = data.height;
            element.zIndex = data.zIndex;
        });
    }
}

// Create command - for adding new elements
class CreateCommand extends Command {
    constructor(elementManager, element) {
        super();
        this.elementManager = elementManager;
        this.element = element;
    }

    execute() {
        // Element already created, just ensure it's in the list
        if (!this.elementManager.elements.includes(this.element)) {
            this.elementManager.elements.push(this.element);
        }
    }

    undo() {
        this.elementManager.removeElement(this.element.id);
    }
}

// Layer order command - for z-index changes
class LayerOrderCommand extends Command {
    constructor(elements, oldZIndices, newZIndices) {
        super();
        this.elements = elements;
        this.oldZIndices = oldZIndices;
        this.newZIndices = newZIndices;
    }

    execute() {
        this.elements.forEach((el, i) => {
            el.zIndex = this.newZIndices[i];
        });
    }

    undo() {
        this.elements.forEach((el, i) => {
            el.zIndex = this.oldZIndices[i];
        });
    }
}

// CommandManager - manages undo/redo stacks
class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoLevels = 50;
    }

    /**
     * Execute a command and add to undo stack
     */
    executeCommand(command) {
        command.execute();
        this.undoStack.push(command);

        // Clear redo stack when new command is executed
        this.redoStack = [];

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoLevels) {
            this.undoStack.shift();
        }
    }

    /**
     * Undo the last command
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return false;
        }

        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        return true;
    }

    /**
     * Redo the last undone command
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return false;
        }

        const command = this.redoStack.pop();
        command.redo();
        this.undoStack.push(command);
        return true;
    }

    /**
     * Check if can undo
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if can redo
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Get undo stack size
     */
    getUndoCount() {
        return this.undoStack.length;
    }

    /**
     * Get redo stack size
     */
    getRedoCount() {
        return this.redoStack.length;
    }
}

export {
    Command,
    MoveCommand,
    DeleteCommand,
    CreateCommand,
    LayerOrderCommand,
    CommandManager
};
