# Web Marker Chrome Extension

Web Marker is a powerful and lightweight Chrome extension that turns any webpage into a fully functional whiteboard and note-taking canvas. Whether you want to highlight important text, draw diagrams over an article, or just take some quick notes on the side, Web Marker has you covered.

## Features

### 🖌️ Drawing & Annotation Tools
- **Pen**: Smooth, pressure-simulated drawing tool for notes and doodles.
- **Highlighter**: Semi-transparent marker that multiplies over text for easy reading.
- **Laser Pointer**: Ephemeral pointer tool that perfectly tracks your movements and automatically vanishes after 2.5 seconds of inactivity. Great for presentations or reading!
- **Arrow**: Quickly draw directional arrows.
- **Text Tool**: Click anywhere to type multiline text directly onto the page.
- **Eraser**: Precision stroke-level erasing with accurate sizing detection.

### 🎨 Customization & Memory
- **Color Picker**: Choose from vibrant presets or use the custom color selector.
- **Adjustable Size & Opacity**: Sliders to control the thickness and transparency of your tools.
- **Per-Tool Memory**: The extension independently remembers your configuration (color, size, opacity) for *every single tool*. Switch from a massive yellow highlighter to a tiny blue pen, and the extension will seamlessly restore your exact settings for both.

### 📜 Surfaces
- **Overlay Mode**: Draw directly on top of the live website. Your drawings stick to their positions even as you scroll!
- **Blank Pages**: Need a clean slate? Switch to one of the **5 independent blank pages** with dark-mode backgrounds.
- **Side Panel**: A beautiful, glass-morphic side panel for taking quick notes while reading. 
  - **Resizable**: Drag the left edge to make it wider or narrower.
  - **Pinnable**: Click the 📌 icon to lock it open. It will automatically push the website's content to the left so it doesn't cover anything you're reading.

### ✨ Advanced Capabilities
- **Zero-Latency Drawing**: Features an optimistic rendering engine that instantly draws strokes directly to your screen with absolute zero background delay.
- **Stylus Optimized**: Features advanced stylus support (using Pointer Events) including jitter-free toolbar tapping and smart auto-collapsing UI when drawing.
- **Add Scroll Space**: Reached the bottom of an article but still need room to draw? Click the **Add Scroll Space** button (down arrow icon) to inject massive amounts of blank space at the bottom of any website!
- **Undo / Redo / Clear**: Full history tracking (up to 30 states to prevent memory leaks).
- **Export to PNG**: Instantly download your drawings as a transparent PNG.
- **Persistent State**: Built with Manifest V3 Service Workers and `chrome.storage.local`. Your drawings and tool configurations will persist across all tabs and browser restarts!

## Keyboard Shortcuts
- `Ctrl + Shift + P` / `Cmd + Shift + P` : Select Pen Tool
- `Ctrl + Shift + E` / `Cmd + Shift + E` : Select Eraser Tool
- `Ctrl + Shift + D` / `Cmd + Shift + D` : Select Laser Pointer Tool
- `Ctrl + Shift + Y` / `Cmd + Shift + Y` : Clear Active Canvas
- `Ctrl + Z` / `Cmd + Z` : Undo
- `Ctrl + Y` / `Cmd + Shift + Z` : Redo
- `Ctrl + Shift + X` / `Cmd + Shift + X` : Toggle Side Panel
- `Alt + 1` to `Alt + 5` : Quick switch to Blank Pages
- `Escape` : Disable drawing mode and hide toolbar

## Installation
1. Open Google Chrome and navigate to `chrome://extensions/`
2. Turn on **Developer mode** (top right corner).
3. Click **Load unpacked**.
4. Select the directory containing this project.
5. Click the extension icon in your toolbar to start drawing on any page!

## Tech Stack
- Vanilla JavaScript (ES6)
- HTML5 Canvas API
- Chrome Extensions API (Manifest V3)
- Shadow DOM (Ensures extension styles never conflict with host website CSS)
