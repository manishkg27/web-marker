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
