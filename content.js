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
  const blankPages = window.BlankPagesModule(shadow, toolbar);
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
  
  shadow.addEventListener('wm-toggle-pages', () => {
    if (blankPages.container.style.display === 'none') {
      blankPages.show();
      setActiveSurface('blankPage_0', blankPages.getActiveEngine()); // Default to active blank page
    } else {
      blankPages.hide();
      setActiveSurface('overlay', overlayEngine);
    }
  });
  
  shadow.addEventListener('wm-toggle-panel', () => {
    sidePanel.toggle();
  });

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
    if (blankPages) {
      for(let i=0; i<5; i++) {
        const eng = blankPages.getEngine(i);
        if (eng) eng.setToolState(state);
      }
    }
    if (sidePanel) {
      const eng = sidePanel.getEngine();
      if (eng) eng.setToolState(state);
    }
  });
  
  // 9. Active surface tracking via pointerdown on canvases
  overlayCanvas.addEventListener('pointerdown', () => {
    setActiveSurface('overlay', overlayEngine);
  });
  
  // 10. Keyboard shortcuts (on document, not shadow)
  document.addEventListener('keydown', (e) => {
    // Don't intercept if user is typing in an input/textarea
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    
    // Ctrl+Z → Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      activeEngine.undo();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z → Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      activeEngine.redo();
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
      blankPages.hide();
      sidePanel.hide();
      
      overlayCanvas.style.pointerEvents = 'none';
      overlayCanvas.style.cursor = 'default';
      
      const overlayToggle = shadow.querySelector('.wm-toggle-btn[data-toggle="overlay"]');
      if (overlayToggle) overlayToggle.classList.remove('active');
      return;
    }
    // Alt+1 through Alt+5 → Switch blank pages
    if (e.altKey && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      blankPages.switchPage(index);
      blankPages.show();
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
    }
  });
  
  // 12. Handle text tool requests
  shadow.addEventListener('wm-text-request', (e) => {
    const { x, y, docX, docY, surfaceId } = e.detail;
    // Create a text input positioned at the click location
    const input = document.createElement('textarea');
    input.className = 'wm-text-input';
    input.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      z-index: 2147483645;
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
    shadow.appendChild(input);
    
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
        // Restore blank pages
        for (let i = 0; i < 5; i++) {
          const key = `blankPage_${i}`;
          if (state.data[key]?.strokes?.length) {
             const engine = blankPages.getEngine(i);
             if (engine) {
               engine.strokes = state.data[key].strokes;
               // It will redraw on its own when shown, or we can force it
               engine.redrawAll();
             }
          }
        }
        // Restore side panel
        if (state.data.sidePanel?.strokes?.length) {
           const se = sidePanel.getEngine();
           if (se) {
             se.strokes = state.data.sidePanel.strokes;
             se.redrawAll();
           }
        }
      }
    } catch (e) {
      console.log('Web Marker: initial state load skipped', e);
    }
  })();
})();
