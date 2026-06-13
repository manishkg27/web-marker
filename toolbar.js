window.ToolbarModule = function(shadowRoot, getActiveEngine, setActiveSurface) {
  // SVG Icons
  const icons = {
    pen: `<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
    highlighter: `<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4-4-4 4-4zM2 22v-4l9-9 4 4-9 9H2z"></path></svg>`,
    eraser: `<svg viewBox="0 0 24 24"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"></path></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"></line><polyline points="10 5 19 5 19 14"></polyline></svg>`,
    text: `<svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
    undo: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    redo: `<svg viewBox="0 0 24 24"><path d="M21 9l-9-7-9 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path><polyline points="15 22 15 12 9 12 9 22"></polyline></svg>`,
    clear: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    export: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    overlay: `<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    pages: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    panel: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>`,
    space: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"></path></svg>`
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
              <div class="wm-color-swatches">
                <button class="wm-swatch active" data-color="#ff3366" style="background:#ff3366"></button>
                <button class="wm-swatch" data-color="#3366ff" style="background:#3366ff"></button>
                <button class="wm-swatch" data-color="#33cc66" style="background:#33cc66"></button>
                <button class="wm-swatch" data-color="#ffcc00" style="background:#ffcc00"></button>
                <button class="wm-swatch" data-color="#1a1a2e" style="background:#1a1a2e"></button>
                <button class="wm-swatch" data-color="#ffffff" style="background:#ffffff; border: 1px solid #ccc;"></button>
              </div>
              <div class="wm-custom-color-row">
                <label>Custom</label>
                <input type="color" class="wm-color-custom" value="#ff3366" title="Custom color">
              </div>
            </div>
          </div>
          <button class="wm-action-btn" data-action="undo" title="Undo">${icons.undo}</button>
          <button class="wm-action-btn" data-action="redo" title="Redo">${icons.redo}</button>

          <button class="wm-tool-btn active" data-tool="pen" title="Pen">${icons.pen}</button>
          <button class="wm-tool-btn" data-tool="highlighter" title="Highlighter">${icons.highlighter}</button>
          <button class="wm-tool-btn" data-tool="eraser" title="Eraser">${icons.eraser}</button>
          
          <button class="wm-tool-btn" data-tool="arrow" title="Arrow">${icons.arrow}</button>
          <button class="wm-tool-btn" data-tool="text" title="Text">${icons.text}</button>
          <button class="wm-action-btn" data-action="clear" title="Clear">${icons.clear}</button>
          
          <button class="wm-action-btn" data-action="export" title="Export">${icons.export}</button>
          <button class="wm-toggle-btn active" data-toggle="overlay" title="Overlay">${icons.overlay}</button>
          <button class="wm-toggle-btn" data-toggle="pages" title="Pages">${icons.pages}</button>
          
          <button class="wm-action-btn" data-action="add-space" title="Add Scroll Space">${icons.space}</button>
          <button class="wm-toggle-btn" data-toggle="panel" title="Panel" style="grid-column: span 2; justify-self: stretch; width: 100%;">${icons.panel}</button>
        </div>

        <div class="wm-slider-row" style="grid-column: span 3">
          <input type="range" class="wm-slider" min="1" max="20" value="3" data-prop="size">
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
  
  let toolState = { activeTool: 'pen', color: '#ff3366', size: 3, opacity: 1 };
  
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

  const updateUIFromState = () => {
    // Tool
    shadowRoot.querySelectorAll('.wm-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolState.activeTool);
    });
    
    // Color
    shadowRoot.querySelectorAll('.wm-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === toolState.color);
    });
    if (colorBtn) {
      colorBtn.style.background = toolState.color;
    }
    const customColor = shadowRoot.querySelector('.wm-color-custom');
    if (customColor) customColor.value = toolState.color;
    
    // Sliders
    const sizeSlider = shadowRoot.querySelector('.wm-slider[data-prop="size"]');
    if (sizeSlider) sizeSlider.value = toolState.size;
  };

  containerElement.addEventListener('click', (e) => {
    // Close popover if clicking outside
    if (!e.target.closest('.wm-color-picker-wrapper')) {
      colorPopover.classList.add('hidden');
    }

    if (e.target.closest('#wm-color-btn')) {
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
      toolState.color = swatch.dataset.color;
      updateUIFromState();
      syncToolState();
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
      else if (action === 'add-space') {
        shadowRoot.dispatchEvent(new CustomEvent('wm-add-space'));
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

  const customColorInput = shadowRoot.querySelector('.wm-color-custom');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      toolState.color = e.target.value;
      updateUIFromState();
      syncToolState();
    });
  }

  shadowRoot.querySelectorAll('.wm-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const prop = e.target.dataset.prop;
      if (prop === 'size') {
        toolState.size = parseInt(e.target.value);
      } else if (prop === 'opacity') {
        toolState.opacity = parseInt(e.target.value) / 100;
      }
      syncToolState();
    });
  });

  // --- Dragging & Toggling Logic ---
  const handle = shadowRoot.querySelector('.wm-toolbar-handle');
  let isDragging = false;
  let hasDragged = false;
  let dragOffset = { x: 0, y: 0 };

  containerElement.addEventListener('mousedown', (e) => {
    // Drag handle check
    if (!e.target.closest('.wm-toolbar-handle')) return;
    
    isDragging = true;
    hasDragged = false;
    const rect = containerElement.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    hasDragged = true;
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Clamp to viewport
    const rect = containerElement.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
    
    containerElement.style.left = `${newX}px`;
    containerElement.style.top = `${newY}px`;
    containerElement.style.bottom = 'auto';
    containerElement.style.right = 'auto';
    containerElement.style.transform = 'none'; // Overrides initial translateX(-50%)
  });

  document.addEventListener('mouseup', () => {
    if (isDragging && !hasDragged) {
      // Treat as click: toggle toolbar
      toolbarDiv.classList.toggle('hidden');
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
