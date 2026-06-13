(function() {
  // Prevent double-injection
  if (document.getElementById('web-marker-root')) return;
  
  // 1. Create host element
  const root = document.createElement('div');
  root.id = 'web-marker-root';
  root.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; display: none;';
  document.body.appendChild(root);
  
  // 2. Attach Shadow DOM
  const shadow = root.attachShadow({ mode: 'closed' });
  
  // 3. Load styles
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('styles.css');
  shadow.appendChild(link);
  
  // 4. Create overlay canvas
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.className = 'wm-overlay-canvas';
  overlayCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483640;pointer-events:none;';
  shadow.appendChild(overlayCanvas);
  
  // 5. Create CanvasEngine for overlay
  const overlayEngine = new window.CanvasEngine(overlayCanvas, 'overlay', { scrollAware: true });
  
  // 6. Active surface tracking
  let activeEngine = overlayEngine;
  let activeSurfaceName = 'overlay';
  let drawingEnabled = false;
  
  function setActiveSurface(name, engine) {
    activeSurfaceName = name;
    activeEngine = engine;
  }
  
  // 7. Initialize modules
  const toolbar = window.ToolbarModule(shadow, () => activeEngine, setActiveSurface);
  const sidePanel = window.SidePanelModule(shadow, toolbar);
  
  // 8. Wire up toggle events
  shadow.addEventListener('wm-toggle-overlay', () => {
    drawingEnabled = !drawingEnabled;
    overlayCanvas.style.pointerEvents = drawingEnabled ? 'auto' : 'none';
    overlayCanvas.style.cursor = drawingEnabled ? 'crosshair' : 'default';
    if (drawingEnabled) {
      setActiveSurface('overlay', overlayEngine);
    }
  });
  
  shadow.addEventListener('wm-toggle-panel', () => {
    sidePanel.toggle();
  });

  // Auto-expand space at bottom when drawing enabled
  window.addEventListener('scroll', () => {
    if (drawingEnabled) {
      const scrollPos = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollPos >= docHeight - 50) {
        let spacer = document.getElementById('wm-scroll-spacer');
        if (!spacer) {
          spacer = document.createElement('div');
          spacer.id = 'wm-scroll-spacer';
          spacer.style.cssText = 'height: 100vh; width: 100%; display: block; clear: both; background: transparent; pointer-events: none; margin: 0; padding: 0;';
          document.body.appendChild(spacer);
        } else {
          spacer.style.height = `${parseInt(spacer.style.height || '100') + 100}vh`;
        }
      }
    }
  }, { passive: true });

  // Track surface changes from submodules
  shadow.addEventListener('wm-surface-changed', (e) => {
    const { name, engine } = e.detail;
    setActiveSurface(name, engine);
    // sync tool state to the newly active engine
    if (toolbar && toolbar.getToolState) {
      engine.setToolState(toolbar.getToolState());
    }
  });
  
  shadow.addEventListener('wm-tool-changed', (e) => {
    const state = e.detail;
    if (overlayEngine) overlayEngine.setToolState(state);
    if (sidePanel) {
      const eng = sidePanel.getEngine();
      if (eng) eng.setToolState(state);
    }
  });

  shadow.addEventListener('wm-panel-opened', () => {
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_OPENED' }).catch(() => {});
  });

  shadow.addEventListener('wm-panel-closed', () => {
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_CLOSED' }).catch(() => {});
  });
  
  // 9. Active surface tracking via pointerdown on canvases
  overlayCanvas.addEventListener('pointerdown', () => {
    setActiveSurface('overlay', overlayEngine);
  });
  
  // 10. Keyboard shortcuts (on document, not shadow)
  let mouseX = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
  });

  document.addEventListener('keydown', (e) => {
    // Don't intercept if user is typing in an input/textarea
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    
    // Determine target engine based on mouse hover
    let targetEngine = activeEngine;
    if (sidePanel.isVisible()) {
      const panelRect = sidePanel.panel.getBoundingClientRect();
      if (mouseX >= panelRect.left) {
        targetEngine = sidePanel.getEngine();
      } else {
        targetEngine = overlayEngine;
      }
    } else {
      targetEngine = overlayEngine;
    }

    // Ctrl+Z → Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      targetEngine.undo();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z → Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      targetEngine.redo();
      return;
    }
    // Ctrl+Shift+X → Toggle side panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'x')) {
      e.preventDefault();
      sidePanel.toggle();
      return;
    }
    // Escape → Deactivate drawing
    if (e.key === 'Escape') {
      drawingEnabled = false;
      root.style.display = 'none';
      toolbar.hide();
      sidePanel.hide();
      
      overlayCanvas.style.pointerEvents = 'none';
      overlayCanvas.style.cursor = 'default';
      
      const overlayToggle = shadow.querySelector('.wm-toggle-btn[data-toggle="overlay"]');
      if (overlayToggle) overlayToggle.classList.remove('active');
      return;
    }

  });
  
  // 11. Listen for messages from background/popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_DRAWING') {
      drawingEnabled = !drawingEnabled;
      const isVisible = root.style.display !== 'none';
      if (!isVisible) {
        root.style.display = '';
        toolbar.show();
        overlayEngine.resize();
      } else if (!drawingEnabled) {
        // Hide everything if we are disabling drawing completely via the extension icon
        root.style.display = 'none';
        toolbar.hide();
      }
      
      overlayCanvas.style.pointerEvents = drawingEnabled ? 'auto' : 'none';
      overlayCanvas.style.cursor = drawingEnabled ? 'crosshair' : 'default';
      
      const overlayToggle = shadow.querySelector('.wm-toggle-btn[data-toggle="overlay"]');
      if (overlayToggle) overlayToggle.classList.toggle('active', drawingEnabled);
    } else if (msg.type === 'SURFACE_UPDATED') {
      const { surfaceId, strokes } = msg.payload;
      if (surfaceId === 'sidePanel' && sidePanel) {
        const engine = sidePanel.getEngine();
        if (engine) {
          engine.strokes = strokes;
          engine.redrawAll();
        }
      }
    }
  });
  
  // 12. Handle text tool requests
  shadow.addEventListener('wm-text-request', (e) => {
    const { x, y, docX, docY, surfaceId } = e.detail;
    
    // Create a text input positioned at the click location
    const input = document.createElement('textarea');
    input.className = 'wm-text-input';
    
    const updatePosition = () => {
      // For scroll-aware surfaces, we adjust for scroll. For others, x/y are fixed.
      if (surfaceId === 'overlay') {
        input.style.left = `${docX - window.scrollX}px`;
        input.style.top = `${docY - window.scrollY}px`;
      } else {
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
      }
    };
    
    input.style.cssText = `
      position: fixed;
      z-index: var(--wm-z-text);
      min-width: 100px;
      min-height: 30px;
      background: transparent;
      border: 1px dashed ${activeEngine.toolState.color};
      color: ${activeEngine.toolState.color};
      font-size: ${activeEngine.toolState.size * 4}px;
      font-family: inherit;
      outline: none;
      resize: both;
    `;
    updatePosition();
    shadow.appendChild(input);
    
    if (surfaceId === 'overlay') {
      window.addEventListener('scroll', updatePosition, { passive: true });
    }
    
    // Focus after a tiny delay to ensure it's rendered
    setTimeout(() => input.focus(), 10);
    
    // On blur or Ctrl+Enter, commit text as a stroke
    const commitText = async () => {
      const text = input.value.trim();
      if (text) {
        const stroke = {
          id: crypto.randomUUID(),
          tool: 'text',
          color: activeEngine.toolState.color,
          size: activeEngine.toolState.size * 4,
          opacity: activeEngine.toolState.opacity,
          points: [{ x: docX, y: docY }],
          text: text,
          timestamp: Date.now()
        };
        const response = await chrome.runtime.sendMessage({
          type: 'ADD_STROKE',
          payload: { surfaceId: surfaceId, stroke }
        });
        if (response?.success) {
          activeEngine.strokes = response.data.strokes;
          activeEngine.redrawAll();
        }
      }
      if (surfaceId === 'overlay') {
        window.removeEventListener('scroll', updatePosition);
      }
      input.remove();
    };
    
    input.addEventListener('blur', commitText);
    input.addEventListener('keydown', (ke) => {
      // Allow newlines with Enter, commit with Ctrl+Enter
      if (ke.key === 'Enter' && (ke.ctrlKey || ke.metaKey)) {
        ke.preventDefault();
        commitText();
      }
      if (ke.key === 'Escape') {
        if (surfaceId === 'overlay') {
          window.removeEventListener('scroll', updatePosition);
        }
        input.remove();
      }
      // Stop propagation so we don't trigger global shortcuts while typing
      ke.stopPropagation();
    });
  });
  
  // 14. Restore state from background
  (async () => {
    try {
      const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (state?.success && state.data) {
        // Restore strokes for overlay
        if (state.data.overlay?.strokes?.length) {
          overlayEngine.strokes = state.data.overlay.strokes;
          overlayEngine.redrawAll();
        }
        // Restore global side panel
        if (state.data.sidePanel?.strokes?.length) {
           const engine = sidePanel.getEngine();
           if (engine) {
             engine.strokes = state.data.sidePanel.strokes;
             engine.redrawAll();
           }
        }
      }
    } catch (e) {
      console.log('Web Marker: initial state load skipped', e);
    }
  })();
})();
