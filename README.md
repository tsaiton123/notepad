# AI Blackboard 📝

A beautiful AI-powered digital notepad that presents chatbot responses in handwriting-style text with graph generation capabilities, inspired by GoodNotes and mainstream notepad applications.

![AI Blackboard Interface](initial_interface_1763595729011.png)

## ✨ Features

- **AI Chat Integration**: Powered by Google's Gemini AI
- **Handwriting-Style Rendering**: Beautiful animated text that simulates handwriting
- **Graph Generation**: Plot mathematical functions and create charts
- **Premium Dark Theme**: Stunning glassmorphism design with smooth animations
- **Interactive Canvas**: Blackboard interface with zoom and navigation
- **Responsive Design**: Works beautifully on all screen sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A Gemini API key (get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd blackboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API key:**
   
   **Option 1: Environment Variable (Recommended)**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

   **Option 2: Settings UI**
   
   You can also add your API key directly in the application:
   - Click the settings icon (⚙️) in the top-right corner
   - Paste your API key in the input field
   - Click "Save Key"

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🎨 Usage

### Chatting with AI

1. Type your question or request in the chat input area
2. Press Enter or click "Send"
3. Watch as the AI response appears on the blackboard in beautiful handwriting

### Plotting Graphs

The AI generates mathematical function plots with professional-grade visualizations. Responses are **minimal** - you get just the plot without extra text.

Ask the AI to plot functions:
- "Plot y = sin(x)"
- "Graph y = x^2"
- "Plot y = exp(-x^2/10)"
- "Draw y = 1/(x^2 + 1)"

The plot will render directly on the blackboard with:
- Grid lines for easy reading
- X and Y coordinate axes
- Numeric labels on both axes
- Auto-scaled ranges
- Smooth animated drawing
- **No extra explanatory text** - just the essential visual element

Supported expressions:
- **Polynomials**: `x^2`, `x^3 - 3*x^2 + 2*x`
- **Trigonometric**: `sin(x)`, `cos(x)`, `sin(x) + cos(x)`
- **Exponential**: `exp(x)`, `exp(-x^2/10)`
- **Rational**: `1/x`, `1/(x^2 + 1)`
- **Math functions**: `sqrt(x)`, `abs(x)`, `log(x)`


### Customization

Open the settings panel (⚙️) to customize:
- **Handwriting Style**: Choose from different handwriting fonts
- **Text Size**: Adjust the size of the handwritten text
- **API Key**: Update your Gemini API key

### Controls

- **🗑️ Clear**: Clear the blackboard and start fresh
- **↶ / ↷**: Undo and redo (coming soon)
- **🔍+ / 🔍−**: Zoom in and out
- **⟲**: Reset zoom and view

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript with Vite
- **Styling**: Custom CSS with glassmorphism design
- **AI**: Google Gemini API
- **Rendering**: HTML5 Canvas
- **Fonts**: Google Fonts (Caveat for handwriting)

## 📁 Project Structure

```
blackboard/
├── index.html              # Main HTML file
├── style.css              # Comprehensive design system
├── main.js                # Main application logic
├── src/
│   └── modules/
│       ├── ai.js          # Gemini API integration
│       ├── renderer.js    # Canvas rendering with animations
│       └── chatInterface.js # Chat UI management
├── package.json
└── .env.example           # API key template
```

## 🎯 Features In Detail

### Handwriting Animation

The blackboard uses a custom rendering engine that:
- Animates text character by character
- Simulates natural handwriting variations
- Supports multiple handwriting fonts
- Automatically wraps text to fit the canvas

### Mathematical Plotting

The graph renderer can:
- Parse mathematical expressions
- Plot functions like sin, cos, tan, polynomials
- Draw coordinate axes and grids
- Animate the drawing process

### AI Integration

- Conversational context maintained
- Supports streaming responses
- Automatically parses graph commands
- Error handling and retry logic

## 🔒 Privacy & Security

- Your API key is stored locally in your browser
- No data is sent to any server except Google's Gemini API
- Clear your blackboard anytime to remove data

## 🚧 Coming Soon

- Undo/Redo functionality
- Save and export blackboards
- Multiple pages/tabs
- Freehand drawing tools
- Data visualization (bar charts, pie charts)
- Export as PDF

## 📝 License

This project is open source and available for personal and educational use.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 💡 Tips

- Ask the AI to explain complex topics step-by-step
- Use the blackboard for taking notes during lessons
- Plot multiple functions to compare them
- Experiment with different handwriting styles
- Clear the board regularly to keep your workspace clean

---

**Enjoy your AI-powered blackboard! 🎉**
