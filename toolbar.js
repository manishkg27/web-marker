window.ToolbarModule = function(shadowRoot, getActiveEngine, setActiveSurface) {
  // SVG Icons
  const icons = {
    pen: `<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
    highlighter: `<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4-4-4 4-4zM2 22v-4l9-9 4 4-9 9H2z"></path></svg>`,
    eraser: `<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"></path></svg>`,
    laser: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#ff0000" opacity="0.3"></circle><circle cx="12" cy="12" r="3" fill="#ff0000"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="10 5 19 5 19 14"></polyline></svg>`,
    text: `<svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
    undo: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    redo: `<svg viewBox="0 0 24 24"><path d="M21 9l-9-7-9 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path><polyline points="15 22 15 12 9 12 9 22"></polyline></svg>`,
    clear: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    export: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    overlay: `<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    pages: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    panel: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>`,
    space: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"></path></svg>`,
    rectangle: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect></svg>`,
    ellipse: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" stroke-width="2"></ellipse></svg>`,
    line: `<svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line></svg>`
  };

  // Replace undo and redo icons with curved arrows
  icons.undo = `<svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;
  icons.redo = `<svg viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>`;

  const html = `
    <div class="wm-toolbar-container" id="wm-toolbar-container">
      <div class="wm-toolbar-handle" title="Drag to move">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </div>
      <div class="wm-toolbar hidden" id="wm-toolbar">
        <div class="wm-toolbar-grid">
          <div class="wm-color-picker-wrapper">
            <button class="wm-color-btn" id="wm-color-btn" style="background:#ff3366"></button>
            <div class="wm-color-popover hidden" id="wm-color-popover">
              <div class="wm-color-header">
                <button class="wm-color-cancel" id="wm-color-cancel">Cancel</button>
                <span class="wm-color-title">Choose a color</span>
                <button class="wm-color-select" id="wm-color-select">Select</button>
              </div>
              <div class="wm-color-swatches" id="wm-color-swatches">
                <!-- Row 1: Lightest -->
                <button class="wm-swatch" data-color="#b3d4ff" style="background-color:#b3d4ff"></button>
                <button class="wm-swatch" data-color="#b3e6cc" style="background-color:#b3e6cc"></button>
                <button class="wm-swatch" data-color="#ffffcc" style="background-color:#ffffcc"></button>
                <button class="wm-swatch" data-color="#ffccb3" style="background-color:#ffccb3"></button>
                <button class="wm-swatch" data-color="#ffb3b3" style="background-color:#ffb3b3"></button>
                <button class="wm-swatch" data-color="#e6b3ff" style="background-color:#e6b3ff"></button>
                <button class="wm-swatch" data-color="#e6ccb3" style="background-color:#e6ccb3"></button>
                <button class="wm-swatch" data-color="#ffffff" style="background-color:#ffffff;"></button>
                
                <!-- Row 2: Light -->
                <button class="wm-swatch" data-color="#66a3ff" style="background-color:#66a3ff"></button>
                <button class="wm-swatch" data-color="#66cc99" style="background-color:#66cc99"></button>
                <button class="wm-swatch" data-color="#ffff66" style="background-color:#ffff66"></button>
                <button class="wm-swatch" data-color="#ff9966" style="background-color:#ff9966"></button>
                <button class="wm-swatch" data-color="#ff6666" style="background-color:#ff6666"></button>
                <button class="wm-swatch" data-color="#cc66ff" style="background-color:#cc66ff"></button>
                <button class="wm-swatch" data-color="#c69c6d" style="background-color:#c69c6d"></button>
                <button class="wm-swatch" data-color="#cccccc" style="background-color:#cccccc"></button>
                
                <!-- Row 3: Medium / Primary -->
                <button class="wm-swatch" data-color="#1a75ff" style="background-color:#1a75ff"></button>
                <button class="wm-swatch" data-color="#1f995c" style="background-color:#1f995c"></button>
                <button class="wm-swatch" data-color="#ffcc00" style="background-color:#ffcc00"></button>
                <button class="wm-swatch" data-color="#ff661a" style="background-color:#ff661a"></button>
                <button class="wm-swatch active" data-color="#ff3366" style="background-color:#ff3366"></button>
                <button class="wm-swatch" data-color="#9900e6" style="background-color:#9900e6"></button>
                <button class="wm-swatch" data-color="#996633" style="background-color:#996633"></button>
                <button class="wm-swatch" data-color="#999999" style="background-color:#999999"></button>
                
                <!-- Row 4: Dark -->
                <button class="wm-swatch" data-color="#005ce6" style="background-color:#005ce6"></button>
                <button class="wm-swatch" data-color="#14663d" style="background-color:#14663d"></button>
                <button class="wm-swatch" data-color="#cc9900" style="background-color:#cc9900"></button>
                <button class="wm-swatch" data-color="#e64d00" style="background-color:#e64d00"></button>
                <button class="wm-swatch" data-color="#cc0000" style="background-color:#cc0000"></button>
                <button class="wm-swatch" data-color="#660099" style="background-color:#660099"></button>
                <button class="wm-swatch" data-color="#66401a" style="background-color:#66401a"></button>
                <button class="wm-swatch" data-color="#666666" style="background-color:#666666"></button>
                
                <!-- Row 5: Darkest -->
                <button class="wm-swatch" data-color="#003d99" style="background-color:#003d99"></button>
                <button class="wm-swatch" data-color="#0a331f" style="background-color:#0a331f"></button>
                <button class="wm-swatch" data-color="#997300" style="background-color:#997300"></button>
                <button class="wm-swatch" data-color="#993300" style="background-color:#993300"></button>
                <button class="wm-swatch" data-color="#800000" style="background-color:#800000"></button>
                <button class="wm-swatch" data-color="#33004d" style="background-color:#33004d"></button>
                <button class="wm-swatch" data-color="#33200d" style="background-color:#33200d"></button>
                <button class="wm-swatch" data-color="#000000" style="background-color:#000000"></button>
              </div>
              <div class="wm-custom-section">
                <div class="wm-custom-label">Custom</div>
                <div class="wm-custom-row">
                  <button class="wm-custom-add" id="wm-custom-add" title="Add Custom Color">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <input type="color" class="wm-color-custom-hidden" id="wm-color-custom" value="#00ff00">
                </div>
              </div>
            </div>
          </div>
          <button class="wm-action-btn" data-action="undo" aria-label="Undo">${icons.undo}</button>
          <button class="wm-action-btn" data-action="redo" aria-label="Redo">${icons.redo}</button>
          <button class="wm-action-btn" data-action="clear" aria-label="Clear">${icons.clear}</button>

          <button class="wm-tool-btn active" data-tool="pen" aria-label="Pen">${icons.pen}</button>
          <button class="wm-tool-btn" data-tool="highlighter" aria-label="Highlighter">${icons.highlighter}</button>
          <button class="wm-tool-btn" data-tool="laser" aria-label="Laser Pointer">${icons.laser}</button>
          <button class="wm-tool-btn" data-tool="eraser" aria-label="Eraser">${icons.eraser}</button>
          
          <button class="wm-tool-btn" data-tool="arrow" aria-label="Arrow">${icons.arrow}</button>
          <button class="wm-tool-btn" data-tool="line" aria-label="Line">${icons.line}</button>
          <button class="wm-tool-btn" data-tool="rectangle" aria-label="Rectangle">${icons.rectangle}</button>
          <button class="wm-tool-btn" data-tool="ellipse" aria-label="Ellipse">${icons.ellipse}</button>
          
          <button class="wm-tool-btn" data-tool="text" aria-label="Text">${icons.text}</button>
          <button class="wm-action-btn" data-action="export" aria-label="Export">${icons.export}</button>
          <button class="wm-toggle-btn active" data-toggle="overlay" aria-label="Overlay">${icons.overlay}</button>
          <button class="wm-toggle-btn" data-toggle="panel" aria-label="Panel">${icons.panel}</button>
        </div>

        <div class="wm-slider-row" style="grid-column: span 3; display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <input type="range" class="wm-slider" id="wm-size-slider" min="1" max="50" value="3" data-prop="size" style="width: 100%;">
          <input type="number" class="wm-size-input" id="wm-size-input" min="1" max="50" value="3" title="Pen Size">
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = html;
  shadowRoot.appendChild(container.firstElementChild);
  
  const containerElement = shadowRoot.getElementById('wm-toolbar-container');
  const toolbarDiv = shadowRoot.getElementById('wm-toolbar');
  const colorBtn = shadowRoot.getElementById('wm-color-btn');
  const colorPopover = shadowRoot.getElementById('wm-color-popover');
  
  let toolState = { activeTool: 'pen', tools: {} };
  let tempColor = null;
  let initialColorOnOpen = null;
  
  const onToggle = {
    overlay: null,
    pages: null,
    panel: null
  };

  const resetCollapseTimer = () => {
    // Timer removed as per new "compact fixed" design
  };

  // --- Tool State Sync ---
  const syncToolState = async () => {
    const engine = getActiveEngine();
    if (engine) engine.setToolState(toolState);
    
    // Broadcast the state change to all surfaces
    shadowRoot.dispatchEvent(new CustomEvent('wm-tool-changed', { detail: toolState }));

    await chrome.runtime.sendMessage({
      type: 'SET_TOOL',
      payload: toolState
    });
  };

  const updateUIFromState = (previewColor) => {
    // Tool
    shadowRoot.querySelectorAll('.wm-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolState.activeTool);
    });
    
    const toolConfig = toolState.tools && toolState.tools[toolState.activeTool] ? toolState.tools[toolState.activeTool] : {};
    const displayColor = previewColor || toolConfig.color || '#ff3366';

    // Color
    shadowRoot.querySelectorAll('.wm-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === displayColor);
    });
    if (colorBtn) {
      colorBtn.style.backgroundColor = displayColor;
    }
    const customColor = shadowRoot.querySelector('#wm-color-custom');
    if (customColor) customColor.value = displayColor;
    
    // Sliders
    const sizeSlider = shadowRoot.querySelector('#wm-size-slider');
    if (sizeSlider) sizeSlider.value = toolConfig.size || 3;
    
    const sizeInput = shadowRoot.querySelector('#wm-size-input');
    if (sizeInput) sizeInput.value = toolConfig.size || 3;
  };

  containerElement.addEventListener('click', (e) => {
    // Check if clicking Cancel
    if (e.target.closest('#wm-color-cancel')) {
      if (toolState.tools && toolState.tools[toolState.activeTool] && initialColorOnOpen) {
        toolState.tools[toolState.activeTool].color = initialColorOnOpen;
      }
      tempColor = null;
      updateUIFromState();
      syncToolState();
      colorPopover.classList.add('hidden');
      return;
    }

    // Check if clicking Select
    if (e.target.closest('#wm-color-select')) {
      if (tempColor) {
        if (!toolState.tools[toolState.activeTool]) toolState.tools[toolState.activeTool] = {};
        toolState.tools[toolState.activeTool].color = tempColor;
      }
      tempColor = null;
      updateUIFromState();
      syncToolState();
      colorPopover.classList.add('hidden');
      return;
    }

    // Close popover if clicking outside
    if (!e.target.closest('.wm-color-picker-wrapper')) {
      if (!colorPopover.classList.contains('hidden')) {
        // If clicking outside, act like "Select"
        if (tempColor) {
          if (!toolState.tools[toolState.activeTool]) toolState.tools[toolState.activeTool] = {};
          toolState.tools[toolState.activeTool].color = tempColor;
        }
        tempColor = null;
        updateUIFromState();
        syncToolState();
      }
      colorPopover.classList.add('hidden');
    }

    if (e.target.closest('#wm-color-btn')) {
      initialColorOnOpen = toolState.tools && toolState.tools[toolState.activeTool] ? toolState.tools[toolState.activeTool].color : '#ff3366';
      tempColor = null;
      colorPopover.classList.toggle('hidden');
      return;
    }
    
    const toolBtn = e.target.closest('.wm-tool-btn');
    if (toolBtn) {
      toolState.activeTool = toolBtn.dataset.tool;
      updateUIFromState();
      syncToolState();
      return;
    }

    const swatch = e.target.closest('.wm-swatch');
    if (swatch) {
      tempColor = swatch.dataset.color;
      updateUIFromState(tempColor);
      return;
    }
    
    const addCustomBtn = e.target.closest('#wm-custom-add');
    if (addCustomBtn) {
      shadowRoot.querySelector('#wm-color-custom').click();
      return;
    }

    const actionBtn = e.target.closest('.wm-action-btn');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const engine = getActiveEngine();
      if (!engine) return;
      
      if (action === 'undo') engine.undo();
      else if (action === 'redo') engine.redo();
      else if (action === 'clear') engine.clear();
      else if (action === 'export') {
        const dataUrl = engine.exportPNG();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `web-marker-export-${Date.now()}.png`;
        a.click();
      }
      return;
    }

    const toggleBtn = e.target.closest('.wm-toggle-btn');
    if (toggleBtn) {
      const toggle = toggleBtn.dataset.toggle;
      toggleBtn.classList.toggle('active');
      if (toggle === 'overlay') shadowRoot.dispatchEvent(new CustomEvent('wm-toggle-overlay'));
      if (toggle === 'pages') shadowRoot.dispatchEvent(new CustomEvent('wm-toggle-pages'));
      if (toggle === 'panel') shadowRoot.dispatchEvent(new CustomEvent('wm-toggle-panel'));
      return;
    }
  });

  const customColorInput = shadowRoot.querySelector('#wm-color-custom');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      tempColor = e.target.value;
      
      // Let's create a custom swatch for it if we want to mimic the image exactly, 
      // but for simplicity we'll just set it to tempColor
      // Update UI preview
      updateUIFromState(tempColor);
      
      // Check if there is a custom swatch area, we can update the first custom swatch background
      const customSection = shadowRoot.querySelector('.wm-custom-row');
      // Look for existing active custom swatch or create one
      let customSwatch = shadowRoot.querySelector('.wm-swatch.custom-active');
      if (!customSwatch) {
        customSwatch = document.createElement('button');
        customSwatch.className = 'wm-swatch custom-active';
        customSection.appendChild(customSwatch);
      }
      customSwatch.dataset.color = tempColor;
      customSwatch.style.backgroundColor = tempColor;
      updateUIFromState(tempColor);
    });
  }

  shadowRoot.querySelectorAll('.wm-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const prop = e.target.dataset.prop;
      if (!toolState.tools[toolState.activeTool]) toolState.tools[toolState.activeTool] = {};
      if (prop === 'size') {
        toolState.tools[toolState.activeTool].size = parseInt(e.target.value);
        updateUIFromState(); // Sync input box
      } else if (prop === 'opacity') {
        toolState.tools[toolState.activeTool].opacity = parseInt(e.target.value) / 100;
      }
      syncToolState();
    });
  });

  const sizeInput = shadowRoot.getElementById('wm-size-input');
  if (sizeInput) {
    sizeInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) return; // Allow empty typing
      if (val < 1) val = 1;
      if (val > 50) val = 50;
      if (!toolState.tools[toolState.activeTool]) toolState.tools[toolState.activeTool] = {};
      toolState.tools[toolState.activeTool].size = val;
      updateUIFromState(); // Sync slider
      syncToolState();
    });
    sizeInput.addEventListener('blur', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (!toolState.tools[toolState.activeTool]) toolState.tools[toolState.activeTool] = {};
      toolState.tools[toolState.activeTool].size = val;
      updateUIFromState();
      syncToolState();
    });
  }

  // --- Dragging & Toggling Logic ---
  const handle = shadowRoot.querySelector('.wm-toolbar-handle');
  let isDragging = false;
  let hasDragged = false;
  let dragOffset = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };
  let autoCloseTimeout = null;

  const startAutoClose = () => {
    if (autoCloseTimeout) clearTimeout(autoCloseTimeout);
    if (!toolbarDiv.classList.contains('hidden')) {
      autoCloseTimeout = setTimeout(() => {
        toolbarDiv.classList.add('hidden');
      }, 3000);
    }
  };

  const cancelAutoClose = () => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = null;
    }
  };

  containerElement.addEventListener('pointerenter', cancelAutoClose);
  containerElement.addEventListener('pointerleave', startAutoClose);

  containerElement.addEventListener('pointerdown', (e) => {
    // Drag handle check
    if (!e.target.closest('.wm-toolbar-handle')) return;
    
    isDragging = true;
    hasDragged = false;
    const rect = containerElement.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    startPos.x = e.clientX;
    startPos.y = e.clientY;
    
    try { handle.setPointerCapture(e.pointerId); } catch(err){}
  });

  document.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    if (!hasDragged) {
      const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
      if (dist > 4) hasDragged = true;
    }

    if (hasDragged) {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      const rect = containerElement.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      
      containerElement.style.left = `${newX}px`;
      containerElement.style.top = `${newY}px`;
      containerElement.style.bottom = 'auto';
      containerElement.style.right = 'auto';
      containerElement.style.transform = 'none';
    }
  });

  document.addEventListener('pointerup', (e) => {
    if (isDragging) {
      if (!hasDragged) {
        // Treat as click: toggle toolbar
        toolbarDiv.classList.toggle('hidden');
        if (toolbarDiv.classList.contains('hidden')) {
          cancelAutoClose();
        }
      }
      try { handle.releasePointerCapture(e.pointerId); } catch(err){}
    }
    isDragging = false;
  });

  // --- Init ---
  (async () => {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TOOL' });
    if (response?.success && response.data) {
      toolState = response.data;
      updateUIFromState();
      syncToolState();
    }
  })();

  return {
    show: () => { containerElement.style.display = 'flex'; },
    hide: () => { containerElement.style.display = 'none'; },
    setActiveTool: (tool) => {
      toolState.activeTool = tool;
      updateUIFromState();
      syncToolState();
    },
    updateToolState: (state) => {
      Object.assign(toolState, state);
      updateUIFromState();
      syncToolState();
    },
    getToolState: () => toolState,
    element: toolbarDiv,
    onToggle
  };
};
