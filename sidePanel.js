window.SidePanelModule = function(shadowRoot, toolbar) {
  const html = `
    <div class="wm-side-panel-ghost" id="wm-side-panel-ghost"></div>
    <div class="wm-side-panel" id="wm-side-panel">
      <div class="wm-side-panel-header">
        <span class="wm-side-panel-title">Notes</span>
        <div class="wm-side-panel-controls">
          <button class="wm-pin-btn" id="wm-pin-btn" title="Pin panel">📌</button>
          <button class="wm-close-btn" id="wm-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="wm-mini-toolbar">
        <div class="wm-mini-colors">
          <button class="wm-mini-swatch active" data-color="#ff3366" style="background:#ff3366"></button>
          <button class="wm-mini-swatch" data-color="#3366ff" style="background:#3366ff"></button>
          <button class="wm-mini-swatch" data-color="#ffffff" style="background:#ffffff"></button>
          <button class="wm-mini-swatch" data-color="#1a1a2e" style="background:#1a1a2e"></button>
        </div>
        <input type="range" class="wm-mini-size" min="1" max="20" value="3">
        <button class="wm-mini-btn" data-action="undo">↩</button>
        <button class="wm-mini-btn" data-action="redo">↪</button>
        <button class="wm-mini-btn" data-action="clear">🗑</button>
      </div>
      <canvas class="wm-side-canvas" id="wm-side-canvas"></canvas>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = html;
  shadowRoot.appendChild(div.firstElementChild);
  shadowRoot.appendChild(div.lastElementChild);

  const ghost = shadowRoot.getElementById('wm-side-panel-ghost');
  const panel = shadowRoot.getElementById('wm-side-panel');
  const canvas = shadowRoot.getElementById('wm-side-canvas');
  const pinBtn = shadowRoot.getElementById('wm-pin-btn');
  const closeBtn = shadowRoot.getElementById('wm-close-btn');

  let isPinned = false;
  let isPanelVisible = false;

  const engine = new window.CanvasEngine(canvas, 'sidePanel', { scrollAware: false });

  // --- Ghost indicator & Auto-slide logic ---
  document.addEventListener('mousemove', (e) => {
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

  const slideIn = () => {
    isPanelVisible = true;
    ghost.style.opacity = '0';
    ghost.style.pointerEvents = 'none';
    
    panel.style.transform = 'translateX(0)';
    if (isPinned) {
      document.body.style.marginRight = '320px';
    }
    
    // Resize engine after transition
    setTimeout(() => engine.resize(), 300);
  };

  const slideOut = () => {
    if (isPinned) return; // Don't slide out if pinned
    
    isPanelVisible = false;
    panel.style.transform = 'translateX(100%)';
    document.body.style.marginRight = '';
  };

  const toggle = () => {
    if (isPanelVisible) slideOut();
    else slideIn();
  };

  // Close button
  closeBtn.addEventListener('click', () => {
    isPinned = false;
    pinBtn.classList.remove('active');
    isPanelVisible = false;
    panel.style.transform = 'translateX(100%)';
    document.body.style.marginRight = '';
  });

  // Pin button
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    pinBtn.classList.toggle('active', isPinned);
    
    if (isPinned && isPanelVisible) {
      document.body.style.marginRight = '320px';
    } else {
      document.body.style.marginRight = '';
    }
  });

  // Active surface tracking
  canvas.addEventListener('pointerdown', () => {
    shadowRoot.dispatchEvent(new CustomEvent('wm-surface-changed', {
      detail: { name: 'sidePanel', engine: engine }
    }));
  });

  // --- Mini toolbar logic ---
  const miniToolbar = shadowRoot.querySelector('.wm-mini-toolbar');
  
  miniToolbar.addEventListener('click', (e) => {
    const swatch = e.target.closest('.wm-mini-swatch');
    if (swatch) {
      const color = swatch.dataset.color;
      miniToolbar.querySelectorAll('.wm-mini-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      engine.setToolState({ ...engine.toolState, color });
      return;
    }

    const actionBtn = e.target.closest('.wm-mini-btn');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'undo') engine.undo();
      else if (action === 'redo') engine.redo();
      else if (action === 'clear') engine.clear();
      return;
    }
  });

  const sizeSlider = miniToolbar.querySelector('.wm-mini-size');
  sizeSlider.addEventListener('input', (e) => {
    engine.setToolState({ ...engine.toolState, size: parseInt(e.target.value) });
  });

  return {
    show: slideIn,
    hide: slideOut,
    toggle,
    isVisible: () => isPanelVisible,
    getEngine: () => engine,
    panel
  };
};
