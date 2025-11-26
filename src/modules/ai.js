/**
 * AI Module - Gemini API Integration
 * Handles communication with Google's Gemini AI
 */

class AIClient {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    this.conversationHistory = [];
    this.loadApiKey();
  }

  /**
   * Load API key from environment or localStorage
   */
  loadApiKey() {
    // Try environment variable first (from .env file)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Try localStorage second
    const storedKey = localStorage.getItem('gemini_api_key');

    if (envKey && envKey !== 'your_api_key_here') {
      this.apiKey = envKey;
    } else if (storedKey) {
      this.apiKey = storedKey;
    }
  }

  /**
   * Save API key to localStorage
   */
  saveApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
  }

  /**
   * Check if API key is configured
   */
  hasApiKey() {
    return this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Send a message to Gemini AI
   * @param {string} message - User message
   * @returns {Promise<string>} - AI response
   */
  async sendMessage(message) {
    if (!this.hasApiKey()) {
      throw new Error('API key not configured. Please add your Gemini API key in settings.');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: this.conversationHistory,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from AI');
      }

      const aiResponse = data.candidates[0].content.parts[0].text;

      // Add AI response to history
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
      });

      return aiResponse;
      return aiResponse;
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  }

  /**
   * Send a message with an image to Gemini AI
   * @param {string} message - User prompt
   * @param {string} imageBase64 - Base64 image data
   * @returns {Promise<string>} - AI response
   */
  async sendMessageWithImage(message, imageBase64) {
    if (!this.hasApiKey()) {
      throw new Error('API key not configured. Please add your Gemini API key in settings.');
    }

    // Remove data:image/png;base64, prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    // Include system prompt to guide behavior
    const systemPrompt = this.getSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nUser Request: ${message}`;

    const payload = {
      contents: [{
        parts: [
          { text: fullPrompt },
          {
            inline_data: {
              mime_type: "image/png",
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    };

    try {
      // Use gemini-2.0-flash-exp for multimodal requests
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from AI');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Parse response for special commands (graphs, charts, etc.)
   * @param {string} response - AI response text
   * @returns {Object} - Parsed response with type and data
   */
  parseResponse(response) {
    const result = {
      type: 'text',
      content: response,
      hasGraph: false,
      graphData: null
    };

    // Check for JSON code blocks with graph commands
    const jsonBlockPattern = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
    let match;

    while ((match = jsonBlockPattern.exec(response)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent);

        if (parsed.tool === 'plot_function' || parsed.type === 'function') {
          result.hasGraph = true;
          result.graphData = {
            type: 'function',
            expression: parsed.expression || parsed.function,
            xMin: parsed.xMin || parsed.x_min,
            xMax: parsed.xMax || parsed.x_max,
            yMin: parsed.yMin || parsed.y_min,
            yMax: parsed.yMax || parsed.y_max,
            color: parsed.color
          };

          // Remove the JSON block from content
          result.content = result.content.replace(match[0], '').trim();
          break;
        }
      } catch (e) {
        // Not valid JSON, continue
      }
    }

    // If no JSON block found, try simple patterns
    if (!result.hasGraph) {
      const graphPatterns = [
        /```plot\s+([\s\S]*?)```/i,
        /\[PLOT:\s*([^\]]+)\]/i,
        /PLOT\s*\{([^}]+)\}/i
      ];

      for (const pattern of graphPatterns) {
        const match = response.match(pattern);
        if (match) {
          result.hasGraph = true;
          result.graphData = {
            type: 'function',
            expression: match[1].trim()
          };

          // Remove the plot command from content
          result.content = result.content.replace(match[0], '').trim();
          break;
        }
      }
    }

    return result;
  }

  /**
   * Get system prompt that teaches AI how to use tools
   */
  getSystemPrompt() {
    return `You are an AI assistant that writes on a digital blackboard. Your responses will be rendered in beautiful handwriting.

IMPORTANT: Be concise and minimal. Only provide exactly what the user asks for.

When the user asks you to plot a mathematical function, respond with ONLY the JSON tool call - no extra text:

\`\`\`json
{
  "tool": "plot_function",
  "expression": "x^2",
  "xMin": -10,
  "xMax": 10
}
\`\`\`

Do NOT add explanatory text before or after the JSON when plotting.

Supported mathematical expressions:
- Polynomials: x^2, x^3 - 3*x^2 + 2*x
- Trigonometric: sin(x), cos(x), tan(x)
- Exponential: exp(x), exp(-x^2/10)
- Math functions: sqrt(x), abs(x), log(x)
- Compound: sin(x) + cos(x), 2*sin(x) - cos(2*x)
- Rational: 1/x, 1/(x^2 + 1)

For other questions, be direct and concise - write as if teaching on a blackboard.`;
  }
}

export default AIClient;
