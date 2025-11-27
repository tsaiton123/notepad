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
        this.modeToggleBtn = document.getElementById('calcModeToggle');

        this.currentInput = '0';
        this.previousInput = '';
        this.operation = null;
        this.shouldResetScreen = false;

        // Scientific state
        this.isScientific = false;
        this.isRadians = true;
        this.memory = 0;
        this.isSecond = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle visibility
        const toggleBtn = document.getElementById('calculatorBtn');
        const closeBtn = document.getElementById('closeCalculator');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggle());
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        // Mode toggle
        if (this.modeToggleBtn) {
            this.modeToggleBtn.addEventListener('click', () => this.toggleMode());
        }

        // Keypad (delegation)
        const body = this.panel.querySelector('.calc-body');
        if (body) {
            body.addEventListener('click', (e) => {
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

    toggleMode() {
        this.isScientific = !this.isScientific;
        this.panel.classList.toggle('scientific', this.isScientific);
        this.modeToggleBtn.classList.toggle('active', this.isScientific);
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
        const current = parseFloat(this.currentInput);

        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'percent':
                this.currentInput = (current / 100).toString();
                this.updateDisplay();
                break;
            case 'negate':
                this.currentInput = (current * -1).toString();
                this.updateDisplay();
                break;

            // Basic Ops
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
            case 'power':
            case 'yroot':
                this.setOperation(action);
                break;

            case 'equals':
                this.evaluate();
                break;

            // Scientific Functions (Immediate)
            case 'square':
                this.currentInput = (current * current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'cube':
                this.currentInput = (current * current * current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'inverse':
                this.currentInput = (1 / current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'sqrt':
                this.currentInput = Math.sqrt(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'cbrt':
                this.currentInput = Math.cbrt(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'ln':
                this.currentInput = Math.log(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'log10':
                this.currentInput = Math.log10(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'epower':
                this.currentInput = Math.exp(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case '10power':
                this.currentInput = Math.pow(10, current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'factorial':
                this.currentInput = this.factorial(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;

            // Trig
            case 'sin':
                this.currentInput = Math.sin(this.toRad(current)).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'cos':
                this.currentInput = Math.cos(this.toRad(current)).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'tan':
                this.currentInput = Math.tan(this.toRad(current)).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'sinh':
                this.currentInput = Math.sinh(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'cosh':
                this.currentInput = Math.cosh(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'tanh':
                this.currentInput = Math.tanh(current).toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;

            // Constants
            case 'pi':
                this.currentInput = Math.PI.toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'e':
                this.currentInput = Math.E.toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;
            case 'rand':
                this.currentInput = Math.random().toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;

            // Memory
            case 'mc':
                this.memory = 0;
                break;
            case 'm+':
                this.memory += current;
                break;
            case 'm-':
                this.memory -= current;
                break;
            case 'mr':
                this.currentInput = this.memory.toString();
                this.shouldResetScreen = true;
                this.updateDisplay();
                break;

            // State
            case 'rad':
                this.isRadians = !this.isRadians;
                // Update button text if possible, or just toggle state
                const btn = this.panel.querySelector('[data-action="rad"]');
                if (btn) btn.textContent = this.isRadians ? 'Rad' : 'Deg';
                break;
            case '2nd':
                this.isSecond = !this.isSecond;
                const btn2 = this.panel.querySelector('[data-action="2nd"]');
                if (btn2) btn2.classList.toggle('active', this.isSecond);
                break;
        }
    }

    toRad(deg) {
        return this.isRadians ? deg : deg * (Math.PI / 180);
    }

    factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
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
            case 'add': result = prev + current; break;
            case 'subtract': result = prev - current; break;
            case 'multiply': result = prev * current; break;
            case 'divide':
                if (current === 0) { alert("Cannot divide by zero"); return; }
                result = prev / current;
                break;
            case 'power': result = Math.pow(prev, current); break;
            case 'yroot': result = Math.pow(prev, 1 / current); break;
        }

        // Limit precision
        result = parseFloat(result.toPrecision(12));

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
                divide: '÷',
                power: '^',
                yroot: 'y√'
            };
            this.displayHistory.textContent = `${this.previousInput} ${opSymbols[this.operation] || ''}`;
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
            fontSize: this.renderer.fontSize * 1.5,
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
