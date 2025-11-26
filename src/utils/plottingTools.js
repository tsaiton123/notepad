/**
 * Plotting Tools Module
 * Provides mathematical and data visualization tools for the blackboard
 */

class PlottingTools {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.scale = window.devicePixelRatio || 1;
    }

    /**
     * Plot a mathematical function
     * @param {Object} config - Configuration object
     * @param {string} config.expression - Math expression
     * @param {number} config.xMin - Minimum x value (default: -10)
     * @param {number} config.xMax - Maximum x value (default: 10)
     * @param {number} config.yMin - Minimum y value (optional, auto-scale)
     * @param {number} config.yMax - Maximum y value (optional, auto-scale)
     * @param {string} config.color - Line color (default: '#6366f1')
     * @param {number} config.x - Graph X position
     * @param {number} config.y - Graph Y position
     * @param {number} config.width - Graph width
     * @param {number} config.height - Graph height
     */
    async plotFunction(config) {
        const {
            expression,
            xMin = -10,
            xMax = 10,
            yMin = null,
            yMax = null,
            color = '#6366f1',
            x,
            y,
            width,
            height
        } = config;

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Parse the expression
        const fn = this.parseMathExpression(expression);

        // Calculate y range if not provided
        let actualYMin = yMin;
        let actualYMax = yMax;

        if (actualYMin === null || actualYMax === null) {
            const samples = [];
            for (let px = 0; px <= width; px += 10) {
                const mathX = xMin + (px / width) * (xMax - xMin);
                const mathY = fn(mathX);
                if (!isNaN(mathY) && isFinite(mathY)) {
                    samples.push(mathY);
                }
            }

            if (samples.length > 0) {
                const minY = Math.min(...samples);
                const maxY = Math.max(...samples);
                const margin = (maxY - minY) * 0.1 || 1;
                actualYMin = actualYMin !== null ? actualYMin : minY - margin;
                actualYMax = actualYMax !== null ? actualYMax : maxY + margin;
            } else {
                actualYMin = actualYMin !== null ? actualYMin : -10;
                actualYMax = actualYMax !== null ? actualYMax : 10;
            }
        }

        const scaleX = width / (xMax - xMin);
        const scaleY = height / (actualYMax - actualYMin);

        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Draw grid
        this.drawGrid(x, y, width, height, xMin, xMax, actualYMin, actualYMax);

        // Draw axes
        this.drawAxes(x, y, width, height, xMin, xMax, actualYMin, actualYMax, centerX, centerY);

        // Draw labels
        this.drawLabels(x, y, width, height, xMin, xMax, actualYMin, actualYMax);

        // Plot the function
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        let firstPoint = true;
        let wasValid = false;

        for (let px = 0; px <= width; px += 1) {
            const mathX = xMin + (px / width) * (xMax - xMin);
            const mathY = fn(mathX);

            if (!isNaN(mathY) && isFinite(mathY)) {
                const plotX = x + px;
                const plotY = y + height - ((mathY - actualYMin) * scaleY);

                // Only plot if within bounds
                if (plotY >= y && plotY <= y + height) {
                    if (!wasValid || firstPoint) {
                        this.ctx.moveTo(plotX, plotY);
                        firstPoint = false;
                    } else {
                        this.ctx.lineTo(plotX, plotY);
                    }
                    wasValid = true;
                } else {
                    wasValid = false;
                }
            } else {
                wasValid = false;
            }

            // Animate drawing
            if (px % 20 === 0) {
                this.ctx.stroke();
                await this.sleep(5);
                this.ctx.beginPath();
                if (wasValid) {
                    const lastMathX = xMin + (px / width) * (xMax - xMin);
                    const lastMathY = fn(lastMathX);
                    if (!isNaN(lastMathY) && isFinite(lastMathY)) {
                        const lastPlotX = x + px;
                        const lastPlotY = y + height - ((lastMathY - actualYMin) * scaleY);
                        if (lastPlotY >= y && lastPlotY <= y + height) {
                            this.ctx.moveTo(lastPlotX, lastPlotY);
                        }
                    }
                }
            }
        }

        this.ctx.stroke();
    }

    /**
     * Plot a mathematical function synchronously (no animation, for redrawing)
     * @param {Object} config - Same as plotFunction but renders immediately
     */
    plotFunctionSync(config) {
        const {
            expression,
            xMin = -10,
            xMax = 10,
            yMin = null,
            yMax = null,
            color = '#6366f1',
            x,
            y,
            width,
            height
        } = config;

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Parse the expression
        const fn = this.parseMathExpression(expression);

        // Calculate y range if not provided
        let actualYMin = yMin;
        let actualYMax = yMax;

        if (actualYMin === null || actualYMax === null) {
            const samples = [];
            for (let px = 0; px <= width; px += 10) {
                const mathX = xMin + (px / width) * (xMax - xMin);
                const mathY = fn(mathX);
                if (!isNaN(mathY) && isFinite(mathY)) {
                    samples.push(mathY);
                }
            }

            if (samples.length > 0) {
                const minY = Math.min(...samples);
                const maxY = Math.max(...samples);
                const margin = (maxY - minY) * 0.1 || 1;
                actualYMin = actualYMin !== null ? actualYMin : minY - margin;
                actualYMax = actualYMax !== null ? actualYMax : maxY + margin;
            } else {
                actualYMin = actualYMin !== null ? actualYMin : -10;
                actualYMax = actualYMax !== null ? actualYMax : 10;
            }
        }

        const scaleX = width / (xMax - xMin);
        const scaleY = height / (actualYMax - actualYMin);

        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Draw grid
        this.drawGrid(x, y, width, height, xMin, xMax, actualYMin, actualYMax);

        // Draw axes
        this.drawAxes(x, y, width, height, xMin, xMax, actualYMin, actualYMax, centerX, centerY);

        // Draw labels
        this.drawLabels(x, y, width, height, xMin, xMax, actualYMin, actualYMax);

        // Plot the function (no animation)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        let firstPoint = true;
        let wasValid = false;

        for (let px = 0; px <= width; px += 1) {
            const mathX = xMin + (px / width) * (xMax - xMin);
            const mathY = fn(mathX);

            if (!isNaN(mathY) && isFinite(mathY)) {
                const plotX = x + px;
                const plotY = y + height - ((mathY - actualYMin) * scaleY);

                // Only plot if within bounds
                if (plotY >= y && plotY <= y + height) {
                    if (!wasValid || firstPoint) {
                        this.ctx.moveTo(plotX, plotY);
                        firstPoint = false;
                    } else {
                        this.ctx.lineTo(plotX, plotY);
                    }
                    wasValid = true;
                } else {
                    wasValid = false;
                }
            } else {
                wasValid = false;
            }
        }

        this.ctx.stroke();
    }

    /**
     * Draw grid lines
     */
    drawGrid(x, y, width, height, xMin, xMax, yMin, yMax) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // Vertical grid lines
        const xStep = this.calculateGridStep(xMax - xMin);
        for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
            const px = x + ((gx - xMin) / (xMax - xMin)) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(px, y);
            this.ctx.lineTo(px, y + height);
            this.ctx.stroke();
        }

        // Horizontal grid lines
        const yStep = this.calculateGridStep(yMax - yMin);
        for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax; gy += yStep) {
            const py = y + height - ((gy - yMin) / (yMax - yMin)) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(x, py);
            this.ctx.lineTo(x + width, py);
            this.ctx.stroke();
        }
    }

    /**
     * Draw coordinate axes
     */
    drawAxes(x, y, width, height, xMin, xMax, yMin, yMax, centerX, centerY) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;

        // X-axis (if 0 is in range)
        if (yMin <= 0 && yMax >= 0) {
            const axisY = y + height - ((0 - yMin) / (yMax - yMin)) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(x, axisY);
            this.ctx.lineTo(x + width, axisY);
            this.ctx.stroke();
        }

        // Y-axis (if 0 is in range)
        if (xMin <= 0 && xMax >= 0) {
            const axisX = x + ((0 - xMin) / (xMax - xMin)) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(axisX, y);
            this.ctx.lineTo(axisX, y + height);
            this.ctx.stroke();
        }
    }

    /**
     * Draw axis labels
     */
    drawLabels(x, y, width, height, xMin, xMax, yMin, yMax) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // X-axis labels
        const xStep = this.calculateGridStep(xMax - xMin);
        for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
            const px = x + ((gx - xMin) / (xMax - xMin)) * width;
            const axisY = (yMin <= 0 && yMax >= 0)
                ? y + height - ((0 - yMin) / (yMax - yMin)) * height
                : y + height;
            this.ctx.fillText(gx.toFixed(1), px, axisY + 5);
        }

        // Y-axis labels
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        const yStep = this.calculateGridStep(yMax - yMin);
        for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax; gy += yStep) {
            const py = y + height - ((gy - yMin) / (yMax - yMin)) * height;
            const axisX = (xMin <= 0 && xMax >= 0)
                ? x + ((0 - xMin) / (xMax - xMin)) * width
                : x;
            this.ctx.fillText(gy.toFixed(1), axisX - 5, py);
        }
    }

    /**
     * Calculate appropriate grid step
     */
    calculateGridStep(range) {
        const rawStep = range / 10;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const normalized = rawStep / magnitude;

        if (normalized < 2) return magnitude;
        if (normalized < 5) return 2 * magnitude;
        return 5 * magnitude;
    }

    /**
     * Parse math expression into executable function
     */
    parseMathExpression(expr) {
        // Clean up expression
        let cleanExpr = expr
            .replace(/\s+/g, '')
            .replace(/\^/g, '**')
            .replace(/(\d)([a-z])/gi, '$1*$2') // Add implicit multiplication
            .replace(/\)(\d)/g, ')*$1') // )(number -> )*(number
            .replace(/\)([a-z])/gi, ')*$1'); // )(variable -> )*(variable

        // Create safe function
        try {
            return new Function('x', `
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const sqrt = Math.sqrt;
        const abs = Math.abs;
        const log = Math.log;
        const ln = Math.log;
        const exp = Math.exp;
        const pow = Math.pow;
        const PI = Math.PI;
        const E = Math.E;
        const pi = Math.PI;
        const e = Math.E;
        return ${cleanExpr};
      `);
        } catch (e) {
            console.error('Error parsing expression:', expr, e);
            return () => 0;
        }
    }

    /**
     * Sleep utility for animations
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default PlottingTools;
