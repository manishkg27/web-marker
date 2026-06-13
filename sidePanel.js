window.SidePanelModule = function(shadowRoot, toolbar) {
  const html = `
    <div class="wm-side-panel-ghost" id="wm-side-panel-ghost"></div>
    <div class="wm-side-panel" id="wm-side-panel">
      <div class="wm-panel-resizer" id="wm-panel-resizer"></div>
      <div class="wm-side-panel-header">
        <span class="wm-side-panel-title">Notes</span>
        <div class="wm-side-panel-controls">
          <button class="wm-pin-btn" id="wm-pin-btn" title="Pin panel">📌</button>
          <button class="wm-close-btn" id="wm-close-btn" title="Close">✕</button>
        </div>
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
  const resizer = shadowRoot.getElementById('wm-panel-resizer');
  const canvas = shadowRoot.getElementById('wm-side-canvas');
  const pinBtn = shadowRoot.getElementById('wm-pin-btn');
  const closeBtn = shadowRoot.getElementById('wm-close-btn');

  let isPinned = false;
  let isPanelVisible = false;
  let isResizing = false;
  let currentWidth = 320;

  const engine = new window.CanvasEngine(canvas, 'sidePanel', { scrollAware: false });

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
      
      if (isPinned) {
        document.body.style.marginRight = `${currentWidth}px`;
      }
    }
  });

  // --- Ghost indicator & Auto-slide logic ---
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

  const slideIn = () => {
    isPanelVisible = true;
    ghost.style.opacity = '0';
    ghost.style.pointerEvents = 'none';
    
    panel.style.transform = 'translateX(0)';
    if (isPinned) {
      document.body.style.marginRight = `${currentWidth}px`;
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
      document.body.style.marginRight = `${currentWidth}px`;
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



  return {
    show: slideIn,
    hide: slideOut,
    toggle,
    isVisible: () => isPanelVisible,
    getEngine: () => engine,
    panel
  };
};
