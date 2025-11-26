/**
 * Demo Mode - Simulated AI responses for testing
 */

const demoResponses = {
    greetings: [
        "Hello! I'm your AI blackboard assistant. I can help you with explanations, math problems, and even plot graphs!",
        "Hi there! Ask me anything - from complex concepts to simple calculations. I'll write it all out for you in beautiful handwriting.",
    ],

    quadratic: [
        `Let me explain the quadratic formula!

The quadratic formula solves equations of the form ax² + bx + c = 0:

x = (-b ± √(b² - 4ac)) / 2a

For your example x² + 5x + 6 = 0:
  a = 1, b = 5, c = 6

x = (-5 ± √(25 - 24)) / 2
x = (-5 ± 1) / 2

Solutions: x = -2 or x = -3

We can verify: (-2)² + 5(-2) + 6 = 4 - 10 + 6 = 0 ✓`,
    ],

    math: [
        "Let me solve this for you step by step:\n\nFirst, we simplify the expression...\nThen, we apply the formula...\nFinally, we get the answer!",
    ],

    plotting: [
        `I'll plot the sine function for you!

\`\`\`json
{
  "tool": "plot_function",
  "expression": "sin(x)",
  "xMin": -10,
  "xMax": 10
}
\`\`\`

This is a sine wave that oscillates between -1 and 1. It's one of the fundamental trigonometric functions.`,

        `Here's the parabola you requested:

\`\`\`json
{
  "tool": "plot_function",
  "expression": "x^2",
  "xMin": -5,
  "xMax": 5
}
\`\`\`

This is a parabola opening upward. The vertex is at the origin (0,0), and it increases as x moves away from zero in either direction.`,

        `Let me plot the cosine function:

\`\`\`json
{
  "tool": "plot_function",
  "expression": "cos(x)",
  "xMin": -10,
  "xMax": 10
}
\`\`\`

The cosine function is similar to sine but shifted by π/2 radians. It also oscillates between -1 and 1.`,

        `Plotting the compound trigonometric function:

\`\`\`json
{
  "tool": "plot_function",
  "expression": "sin(x) + cos(x)",
  "xMin": -10,
  "xMax": 10
}
\`\`\`

This combines both sine and cosine waves. The result has amplitude √2 and is shifted by π/4 from the original sine wave.`,

        `Here's the cubic polynomial:

\`\`\`json
{
  "tool": "plot_function",
  "expression": "x^3 - 3*x^2 + 2*x - 1",
  "xMin": -2,
  "xMax": 4
}
\`\`\`

This cubic function has interesting inflection points and shows how higher-degree polynomials create more complex curves.`,
    ],

    explanation: [
        "Let me explain this concept:\n\nThe key idea is understanding how different components work together. When we break it down step by step:\n\n1. First principle: Foundation of the concept\n2. Second principle: Building upon the basics\n3. Final principle: Putting it all together\n\nThis creates a complete understanding!",
    ],

    default: [
        "That's an interesting question! Let me write this out for you on the blackboard...\n\nThe main point is that we need to consider multiple factors when approaching this topic. Each aspect contributes to the overall understanding.",
        "Great question! Here's what you need to know:\n\nThe fundamental concept is based on several key principles that work together to create a cohesive whole.",
    ]
};

/**
 * Get a demo response based on the user's message
 */
export function getDemoResponse(userMessage) {
    const message = userMessage.toLowerCase();

    // Check for greetings
    if (message.match(/\b(hi|hello|hey|greetings)\b/)) {
        return randomChoice(demoResponses.greetings);
    }

    // Check for quadratic formula
    if (message.match(/\b(quadratic|x²|x\^2).*\b(formula|equation|solve)\b/)) {
        return randomChoice(demoResponses.quadratic);
    }

    // Check for plotting requests - extract expression dynamically
    const plotMatch = message.match(/\b(plot|graph|draw)\b\s*(?:y\s*=\s*)?(.+)/i);
    if (plotMatch) {
        const expression = plotMatch[2].trim();

        // Generate minimal plotting response - just the tool call
        return `\`\`\`json
{
  "tool": "plot_function",
  "expression": "${expression}",
  "xMin": -10,
  "xMax": 10
}
\`\`\``;
    }

    // Check for math
    if (message.match(/\b(solve|calculate|math|equation|formula)\b/)) {
        return randomChoice(demoResponses.math);
    }

    // Check for explanations
    if (message.match(/\b(explain|what is|how does|why)\b/)) {
        return randomChoice(demoResponses.explanation);
    }

    // Default response
    return randomChoice(demoResponses.default);
}

/**
 * Get a random item from an array
 */
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Simulate AI delay
 */
export function simulateDelay() {
    return new Promise(resolve => {
        const delay = 1000 + Math.random() * 1000; // 1-2 seconds
        setTimeout(resolve, delay);
    });
}
