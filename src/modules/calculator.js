/**
 * Calculator Module
 * Handles floating calculator logic and interaction
 */

import { CreateCommand } from '../core/CommandManager.js';

class Calculator {
    constructor(renderer, commandManager) {
        this.renderer = renderer;
        this.commandManager = commandManager;

        this.panel = document.getElementById('calculatorPanel');
        this.displayInput = document.getElementById('calcInput');
        this.displayHistory = document.getElementById('calcHistory');

        this.currentInput = '0';
        this.previousInput = '';
        this.operation = null;
        this.shouldResetScreen = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle button
        const toggleBtn = document.getElementById('calculatorBtn');
        const closeBtn = document.getElementById('closeCalculator');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggle());
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Keypad
        const keypad = this.panel.querySelector('.calc-keypad');
        if (keypad) {
            keypad.addEventListener('click', (e) => {
                if (e.target.matches('button')) {
                    const btn = e.target;
                    if (btn.dataset.val) {
                        this.appendNumber(btn.dataset.val);
                    } else if (btn.dataset.action) {
                        this.handleAction(btn.dataset.action);
                    }
                }
            });
        }

        // Insert button
        const insertBtn = document.getElementById('insertCalcResult');
        if (insertBtn) insertBtn.addEventListener('click', () => this.insertResult());
    }

    toggle() {
        this.panel.classList.toggle('open');
    }

    close() {
        this.panel.classList.remove('open');
    }

    appendNumber(number) {
        if (this.currentInput === '0' || this.shouldResetScreen) {
            this.currentInput = number;
            this.shouldResetScreen = false;
        } else {
            this.currentInput += number;
        }
        this.updateDisplay();
    }

    handleAction(action) {
        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'percent':
                this.currentInput = (parseFloat(this.currentInput) / 100).toString();
                this.updateDisplay();
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                this.setOperation(action);
                break;
            case 'equals':
                this.evaluate();
                break;
        }
    }

    clear() {
        this.currentInput = '0';
        this.previousInput = '';
        this.operation = null;
        this.updateDisplay();
    }

    backspace() {
        if (this.currentInput.length === 1) {
            this.currentInput = '0';
        } else {
            this.currentInput = this.currentInput.slice(0, -1);
        }
        this.updateDisplay();
    }

    setOperation(op) {
        if (this.operation !== null) this.evaluate();
        this.previousInput = this.currentInput;
        this.operation = op;
        this.shouldResetScreen = true;
        this.updateDisplay();
    }

    evaluate() {
        if (this.operation === null || this.shouldResetScreen) return;

        const prev = parseFloat(this.previousInput);
        const current = parseFloat(this.currentInput);

        if (isNaN(prev) || isNaN(current)) return;

        let result;
        switch (this.operation) {
            case 'add':
                result = prev + current;
                break;
            case 'subtract':
                result = prev - current;
                break;
            case 'multiply':
                result = prev * current;
                break;
            case 'divide':
                if (current === 0) {
                    alert("Cannot divide by zero");
                    return;
                }
                result = prev / current;
                break;
        }

        this.currentInput = result.toString();
        this.operation = null;
        this.previousInput = '';
        this.shouldResetScreen = true;
        this.updateDisplay();
    }

    updateDisplay() {
        this.displayInput.textContent = this.currentInput;

        if (this.operation != null) {
            const opSymbols = {
                add: '+',
                subtract: '−',
                multiply: '×',
                divide: '÷'
            };
            this.displayHistory.textContent = `${this.previousInput} ${opSymbols[this.operation]}`;
        } else {
            this.displayHistory.textContent = '';
        }
    }

    insertResult() {
        // Get center of screen
        const rect = this.renderer.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const canvasCoords = this.renderer.screenToCanvas(centerX, centerY);

        // Create text element
        const text = this.currentInput;
        const lines = [text];

        const element = this.renderer.elementManager.addElement('text', {
            text: text,
            lines: lines,
            fontSize: this.renderer.fontSize * 1.5, // Slightly larger
            fontFamily: this.renderer.fontFamily,
            color: '#ffffff',
            lineHeight: this.renderer.lineHeight * 1.5,
            padding: 0
        }, canvasCoords.x, canvasCoords.y);

        // Calculate dimensions
        this.renderer.ctx.font = `${element.data.fontSize}px ${element.data.fontFamily}`;
        const metrics = this.renderer.ctx.measureText(text);
        element.width = metrics.width;
        element.height = element.data.lineHeight;

        // Undo command
        if (this.commandManager) {
            const createCommand = new CreateCommand(this.renderer.elementManager, element);
            this.commandManager.executeCommand(createCommand);
        }

        this.renderer.redrawCanvas();
        this.close();
    }
}

export default Calculator;
