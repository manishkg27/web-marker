window.SidePanelModule = function(shadowRoot, toolbar) {
  const html = `
    <div class="wm-side-panel-ghost" id="wm-side-panel-ghost"></div>
    <div class="wm-side-panel" id="wm-side-panel">
      <div class="wm-panel-resizer" id="wm-panel-resizer"></div>
      <div class="wm-side-panel-header">
        <span class="wm-side-panel-title">Notes</span>
        <div class="wm-side-panel-controls">
          <button class="wm-export-btn" id="wm-side-export-btn" title="Export PNG" style="border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--wm-text-dim);">💾</button>
          <button class="wm-undo-btn" id="wm-side-undo-btn" title="Undo" style="border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--wm-text-dim);">↩️</button>
          <button class="wm-redo-btn" id="wm-side-redo-btn" title="Redo" style="border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--wm-text-dim);">↪️</button>
          <button class="wm-clear-btn" id="wm-side-clear-btn" title="Clear Panel" style="border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--wm-text-dim);">🗑️</button>
          <button class="wm-close-btn" id="wm-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="wm-side-pages" id="wm-side-pages">
        <canvas class="wm-side-canvas active" id="wm-side-canvas"></canvas>
      </div>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = html;
  shadowRoot.appendChild(div.firstElementChild); // ghost
  shadowRoot.appendChild(div.lastElementChild);  // panel

  const ghost = shadowRoot.getElementById('wm-side-panel-ghost');
  const panel = shadowRoot.getElementById('wm-side-panel');
  const resizer = shadowRoot.getElementById('wm-panel-resizer');
  const exportBtn = shadowRoot.getElementById('wm-side-export-btn');
  const undoBtn = shadowRoot.getElementById('wm-side-undo-btn');
  const redoBtn = shadowRoot.getElementById('wm-side-redo-btn');
  const clearBtn = shadowRoot.getElementById('wm-side-clear-btn');
  const closeBtn = shadowRoot.getElementById('wm-close-btn');
  const sidePages = shadowRoot.getElementById('wm-side-pages');
  const canvas = shadowRoot.getElementById('wm-side-canvas');

  let isPanelVisible = false;
  let isResizing = false;
  let currentWidth = 320;

  chrome.storage.local.get('sidePanelWidth', (result) => {
    if (result.sidePanelWidth) {
      currentWidth = result.sidePanelWidth;
      panel.style.width = `${currentWidth}px`;
      if (engine) engine.resize();
    }
  });

  let engine;
  if (canvas) {
    engine = new window.CanvasEngine(canvas, 'sidePanel', { scrollAware: true, scrollContainer: sidePages });
    // Side panel tools always default to pen
    engine.setToolState({
      activeTool: 'pen',
      color: '#ff3366',
      size: 3,
      opacity: 1,
      tools: {}
    });
  }

  // Rollable pages spacer logic
  const spacer = document.createElement('div');
  spacer.style.cssText = 'height: 100vh; width: 1px; pointer-events: none; clear: both;';
  sidePages.appendChild(spacer);

  sidePages.addEventListener('scroll', () => {
    const scrollPos = sidePages.scrollTop + sidePages.clientHeight;
    const docHeight = sidePages.scrollHeight;
    if (scrollPos >= docHeight - 50) {
      spacer.style.height = `${parseInt(spacer.style.height || '100') + 100}vh`;
    }
  }, { passive: true });

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('active');
    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('active');
      engine.resize();
      chrome.storage.local.set({ sidePanelWidth: currentWidth });
    }
  });

  // Auto-Popup and Resize Logic
  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 250) newWidth = 250;
      if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;
      
      currentWidth = newWidth;
      panel.style.width = `${currentWidth}px`;
      engine.resize();
      return;
    }

    if (isPanelVisible) return;
    
    // Within 30px: show ghost
    if (e.clientX > window.innerWidth - 30) {
      ghost.style.opacity = '1';
      ghost.style.pointerEvents = 'auto';
    } else {
      ghost.style.opacity = '0';
      ghost.style.pointerEvents = 'none';
    }

    // Within 8px: auto slide in
    if (e.clientX > window.innerWidth - 8) {
      slideIn();
    }
  });

  let hideTimeout = null;

  panel.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });

  // Auto-Close when mouse leaves panel
  panel.addEventListener('mouseleave', () => {
    if (isResizing) return;
    hideTimeout = setTimeout(() => {
      slideOut();
    }, 400);
  });

  exportBtn.addEventListener('click', () => {
    if (!engine) return;
    
    // Create a temporary canvas to merge background + drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the actual canvas content over it
    tempCtx.drawImage(canvas, 0, 0);
    
    // Trigger download
    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `web-marker-notes-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  });

  undoBtn.addEventListener('click', () => {
    if (engine) engine.undo();
  });

  redoBtn.addEventListener('click', () => {
    engine.redo();
  });

  clearBtn.addEventListener('click', () => {
    engine.clear();
  });

  const slideIn = () => {
    isPanelVisible = true;
    ghost.style.opacity = '0';
    ghost.style.pointerEvents = 'none';
    
    panel.style.transform = 'translateX(0)';
    setTimeout(() => {
      engine.resize();
      shadowRoot.dispatchEvent(new CustomEvent('wm-surface-changed', {
        detail: { name: 'sidePanel', engine: engine }
      }));
      shadowRoot.dispatchEvent(new CustomEvent('wm-panel-opened'));
    }, 300);
  };

  const slideOut = () => {
    isPanelVisible = false;
    panel.style.transform = 'translateX(100%)';
    shadowRoot.dispatchEvent(new CustomEvent('wm-panel-closed'));
  };

  const toggle = () => {
    if (isPanelVisible) slideOut();
    else slideIn();
  };

  closeBtn.addEventListener('click', slideOut);

  canvas.addEventListener('pointerdown', () => {
    shadowRoot.dispatchEvent(new CustomEvent('wm-surface-changed', {
      detail: { name: 'sidePanel', engine: engine }
    }));
  });

  return {
    show: slideIn,
    hide: slideOut,
    toggle,
    isVisible: () => isPanelVisible,
    getEngine: () => engine,
    getActiveEngine: () => engine,
    panel
  };
};
