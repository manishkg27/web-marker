window.BlankPagesModule = function(shadowRoot, toolbar) {
  const containerHTML = `
    <div class="wm-blank-pages-container" id="wm-blank-pages-container" style="display:none">
      <div id="wm-pages-wrapper"></div>
      <div class="wm-page-nav" id="wm-page-nav">
        <button class="wm-dot active" data-index="0"></button>
        <button class="wm-dot" data-index="1"></button>
        <button class="wm-dot" data-index="2"></button>
        <button class="wm-dot" data-index="3"></button>
        <button class="wm-dot" data-index="4"></button>
      </div>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = containerHTML;
  shadowRoot.appendChild(div.firstElementChild);

  const container = shadowRoot.getElementById('wm-blank-pages-container');
  const wrapper = shadowRoot.getElementById('wm-pages-wrapper');
  const navDots = shadowRoot.querySelectorAll('.wm-dot');
  
  const engines = [];
  let activeIndex = 0;

  // Create 5 pages
  for (let i = 0; i < 5; i++) {
    const pageHtml = `
      <div class="wm-page ${i === 0 ? 'active' : ''}" data-index="${i}">
        <div class="wm-page-header">
          <span>Page ${i + 1} / 5</span>
          <div class="wm-page-actions">
            <button class="wm-page-clear" data-index="${i}">Clear</button>
            <button class="wm-page-export" data-index="${i}">Export</button>
          </div>
        </div>
        <canvas class="wm-blank-canvas" id="wm-blank-canvas-${i}"></canvas>
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pageHtml;
    wrapper.appendChild(tempDiv.firstElementChild);

    const canvas = shadowRoot.getElementById(`wm-blank-canvas-${i}`);
    const engine = new window.CanvasEngine(canvas, `blankPage_${i}`, { scrollAware: false });
    engines.push(engine);

    // Active surface tracking
    canvas.addEventListener('pointerdown', () => {
      // Not ideal since we don't have setActiveSurface directly from here easily
      // Content.js handles it, but we can dispatch an event
      shadowRoot.dispatchEvent(new CustomEvent('wm-surface-changed', {
        detail: { name: `blankPage_${i}`, engine: engine }
      }));
    });
  }

  // Navigation
  navDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      switchPage(index);
    });
  });

  // Clear / Export
  wrapper.addEventListener('click', (e) => {
    if (e.target.classList.contains('wm-page-clear')) {
      const index = parseInt(e.target.dataset.index);
      engines[index].clear();
    } else if (e.target.classList.contains('wm-page-export')) {
      const index = parseInt(e.target.dataset.index);
      const dataUrl = engines[index].exportPNG();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `web-marker-page-${index + 1}-${Date.now()}.png`;
      a.click();
    }
  });

  const switchPage = (index) => {
    if (index < 0 || index >= 5) return;
    
    activeIndex = index;
    
    shadowRoot.querySelectorAll('.wm-page').forEach(page => {
      page.classList.toggle('active', parseInt(page.dataset.index) === index);
    });
    
    navDots.forEach(dot => {
      dot.classList.toggle('active', parseInt(dot.dataset.index) === index);
    });

    // Make it active surface
    shadowRoot.dispatchEvent(new CustomEvent('wm-surface-changed', {
      detail: { name: `blankPage_${index}`, engine: engines[index] }
    }));

    // Trigger resize to fix canvas DPI issues if it was hidden
    engines[index].resize();

    // Persist page index
    chrome.runtime.sendMessage({ type: 'SET_PAGE', payload: { index } });
  };

  // Restore page index
  (async () => {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (state?.success && state.data) {
      if (typeof state.data.activePageIndex === 'number') {
        switchPage(state.data.activePageIndex);
      }
    }
  })();

  return {
    show: () => { container.style.display = 'block'; engines[activeIndex].resize(); },
    hide: () => { container.style.display = 'none'; },
    switchPage,
    getActiveEngine: () => engines[activeIndex],
    getEngine: (index) => engines[index],
    container
  };
};
