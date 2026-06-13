/* =========================================================
   Web Marker — Popup Script
   ========================================================= */

const toggleBtn = document.getElementById('toggleBtn');
let isDrawing = false;

toggleBtn.addEventListener('click', async () => {
  try {
    // Query the active tab in the current window
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Check for restricted URLs where content scripts cannot be injected
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('https://chrome.google.com/webstore') || tab.url.startsWith('chrome-extension://'))) {
      document.body.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ffb3b3;">
          <h2 style="margin-bottom: 10px; color: #ff3366; font-size: 16px;">Restricted Page</h2>
          <p style="font-size: 13px; line-height: 1.5; color: #e0e0e0;">Browser security policies prevent extensions from running on system pages or the Web Store.<br><br>Please try on a regular webpage!</p>
        </div>
      `;
      return;
    }

    // Send toggle message to the background service worker
    await chrome.runtime.sendMessage({ type: 'TOGGLE_DRAWING', payload: { tabId: tab.id } });

    // Toggle UI state
    isDrawing = !isDrawing;
    toggleBtn.textContent = isDrawing ? 'Stop Drawing' : 'Start Drawing';
    toggleBtn.classList.toggle('active', isDrawing);

    // Close the popup after a short delay so the user sees feedback
    setTimeout(() => window.close(), 350);
  } catch (err) {
    console.error('[Web Marker Popup] Error toggling drawing:', err);
  }
});
