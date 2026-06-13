/* =========================================================
   Web Marker — Background Service Worker (Source of Truth)
   ========================================================= */

// ── In-memory store keyed by tabId ──────────────────────────
const tabStore = new Map();

// ── Factory helpers ─────────────────────────────────────────

/** Create an empty StrokeCollection. */
function createStrokeCollection() {
  return {
    strokes: [],
    undoStack: [],
    redoStack: [],
  };
}

let globalSidePanelData = null;

async function saveGlobalSidePanel() {
  if (globalSidePanelData) {
    await chrome.storage.local.set({ global_sidePanel: globalSidePanelData });
  }
}

/** Create default TabData with every surface initialised. */
function createTabData() {
  return {
    overlay: createStrokeCollection(),
  };
}

// ── Accessors ───────────────────────────────────────────────

/**
 * Return existing TabData or create + cache a new default.
 * @param {number} tabId
 * @returns {Promise<object>} TabData
 */
async function getTabData(tabId) {
  if (!tabStore.has(tabId)) {
    const key = `tabData_${tabId}`;
    const result = await chrome.storage.session.get(key);
    if (result[key]) {
      tabStore.set(tabId, result[key]);
    } else {
      tabStore.set(tabId, createTabData());
    }
  }
  return tabStore.get(tabId);
}

/**
 * Save current TabData to session storage.
 * @param {number} tabId
 */
async function saveTabData(tabId) {
  if (tabStore.has(tabId)) {
    const key = `tabData_${tabId}`;
    await chrome.storage.session.set({ [key]: tabStore.get(tabId) });
  }
}

/**
 * Return the StrokeCollection for a named surface.
 * @param {number} tabId
 * @param {string} surfaceId  e.g. 'overlay', 'sidePanel'
 * @returns {Promise<object>} StrokeCollection
 */
async function getSurface(tabId, surfaceId) {
  if (surfaceId === 'sidePanel') {
    if (!globalSidePanelData) {
      const result = await chrome.storage.local.get('global_sidePanel');
      globalSidePanelData = result.global_sidePanel || createStrokeCollection();
    }
    return globalSidePanelData;
  }
  
  const tabData = await getTabData(tabId);
  if (!tabData[surfaceId]) {
    tabData[surfaceId] = createStrokeCollection();
  }
  return tabData[surfaceId];
}

const activeSidePanelTabs = new Set();

async function broadcastSidePanelUpdate() {
  if (!globalSidePanelData) return;
  for (const tabId of activeSidePanelTabs) {
    chrome.tabs.sendMessage(tabId, { 
      type: 'SURFACE_UPDATED', 
      payload: { surfaceId: 'sidePanel', strokes: globalSidePanelData.strokes } 
    }).catch(() => {}); // Ignore errors for tabs without content script
  }
}
// ── Deep-copy utility ───────────────────────────────────────

function deepCopy(arr) {
  return JSON.parse(JSON.stringify(arr));
}

// ── Undo / Redo snapshot helpers ────────────────────────────

const MAX_UNDO_STATES = 30;

/**
 * Push a snapshot of current strokes onto undoStack and clear redoStack.
 * Used before mutating strokes (ADD_STROKE, CLEAR).
 */
function snapshotUndo(collection) {
  collection.undoStack.push(deepCopy(collection.strokes));
  if (collection.undoStack.length > MAX_UNDO_STATES) {
    collection.undoStack.shift();
  }
  collection.redoStack = [];
}

/**
 * Push a snapshot onto undoStack WITHOUT clearing redoStack.
 * Used internally by undo/redo to preserve the opposite stack.
 */
function snapshotForUndo(collection) {
  collection.undoStack.push(deepCopy(collection.strokes));
  if (collection.undoStack.length > MAX_UNDO_STATES) {
    collection.undoStack.shift();
  }
}

// ── Message Handlers ────────────────────────────────────────

async function handleAddStroke(tabId, payload, sendResponse) {
  const { surfaceId, stroke } = payload;
  const collection = await getSurface(tabId, surfaceId);
  snapshotUndo(collection);
  collection.strokes.push(stroke);
  if (surfaceId === 'sidePanel') {
    await saveGlobalSidePanel();
    broadcastSidePanelUpdate();
  } else {
    await saveTabData(tabId);
  }
  sendResponse({ success: true, data: { strokes: collection.strokes } });
}

async function handleUndo(tabId, payload, sendResponse) {
  const { surfaceId } = payload;
  const collection = await getSurface(tabId, surfaceId);

  if (collection.undoStack.length === 0) {
    sendResponse({ success: true, data: { strokes: collection.strokes } });
    return;
  }

  collection.redoStack.push(deepCopy(collection.strokes));
  if (collection.redoStack.length > MAX_UNDO_STATES) {
    collection.redoStack.shift();
  }
  collection.strokes = collection.undoStack.pop();
  if (surfaceId === 'sidePanel') {
    await saveGlobalSidePanel();
    broadcastSidePanelUpdate();
  } else {
    await saveTabData(tabId);
  }
  sendResponse({ success: true, data: { strokes: collection.strokes } });
}

async function handleRedo(tabId, payload, sendResponse) {
  const { surfaceId } = payload;
  const collection = await getSurface(tabId, surfaceId);

  if (collection.redoStack.length === 0) {
    sendResponse({ success: true, data: { strokes: collection.strokes } });
    return;
  }

  snapshotForUndo(collection);
  collection.strokes = collection.redoStack.pop();
  if (surfaceId === 'sidePanel') {
    await saveGlobalSidePanel();
    broadcastSidePanelUpdate();
  } else {
    await saveTabData(tabId);
  }
  sendResponse({ success: true, data: { strokes: collection.strokes } });
}

async function handleClear(tabId, payload, sendResponse) {
  const { surfaceId } = payload;
  const collection = await getSurface(tabId, surfaceId);
  snapshotUndo(collection);
  collection.strokes = [];
  if (surfaceId === 'sidePanel') {
    await saveGlobalSidePanel();
    broadcastSidePanelUpdate();
  } else {
    await saveTabData(tabId);
  }
  sendResponse({ success: true, data: { strokes: collection.strokes } });
}

async function handleGetState(tabId, sendResponse) {
  const tabData = await getTabData(tabId);
  const spData = await getSurface(tabId, 'sidePanel');
  sendResponse({ success: true, data: { ...tabData, sidePanel: spData } });
}

async function handleSetTool(tabId, payload, sendResponse) {
  const toolState = payload;
  await chrome.storage.local.set({ globalToolState: toolState });
  sendResponse({ success: true, data: toolState });
}

async function handleGetTool(tabId, sendResponse) {
  const result = await chrome.storage.local.get('globalToolState');
  const toolState = result.globalToolState || {
    activeTool: 'pen',
    color: '#ff3366',
    size: 3,
    opacity: 1,
  };
  sendResponse({ success: true, data: toolState });
}

async function handleSetPage(tabId, payload, sendResponse) {
  const { index } = payload;
  const tabData = await getTabData(tabId);
  tabData.activePageIndex = index;
  await saveTabData(tabId);
  sendResponse({ success: true, data: { index } });
}

async function handleToggleDrawing(tabId, sendResponse) {
  let targetTabId = tabId;
  if (!targetTabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTabId = activeTab?.id;
  }
  if (targetTabId) {
    await chrome.tabs.sendMessage(targetTabId, { type: 'TOGGLE_DRAWING' }).catch(() => {});
  }
  sendResponse({ success: true });
}

async function handleEraseStroke(tabId, payload, sendResponse) {
  const { surfaceId, strokeIndex } = payload;
  const collection = await getSurface(tabId, surfaceId);
  snapshotUndo(collection);
  collection.strokes.splice(strokeIndex, 1);
  if (surfaceId === 'sidePanel') {
    await saveGlobalSidePanel();
    broadcastSidePanelUpdate();
  } else {
    await saveTabData(tabId);
  }
  sendResponse({ success: true, data: { strokes: collection.strokes } });
}

// ── Message handler (single listener, async IIFE pattern) ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { type, payload } = message;
      const tabId = sender.tab?.id;

      switch (type) {
        case 'SIDE_PANEL_OPENED':
          if (tabId) activeSidePanelTabs.add(tabId);
          sendResponse({ success: true });
          break;
        case 'SIDE_PANEL_CLOSED':
          if (tabId) activeSidePanelTabs.delete(tabId);
          sendResponse({ success: true });
          break;
        case 'ADD_STROKE':
          await handleAddStroke(tabId, payload, sendResponse);
          break;
        case 'UNDO':
          await handleUndo(tabId, payload, sendResponse);
          break;
        case 'REDO':
          await handleRedo(tabId, payload, sendResponse);
          break;
        case 'CLEAR':
          await handleClear(tabId, payload, sendResponse);
          break;
        case 'GET_STATE':
          await handleGetState(tabId, sendResponse);
          break;
        case 'SET_TOOL':
          await handleSetTool(tabId, payload, sendResponse);
          break;
        case 'GET_TOOL':
          await handleGetTool(tabId, sendResponse);
          break;
        case 'SET_PAGE':
          await handleSetPage(tabId, payload, sendResponse);
          break;
        case 'TOGGLE_DRAWING':
          await handleToggleDrawing(tabId, sendResponse);
          break;
        case 'ERASE_STROKE':
          await handleEraseStroke(tabId, payload, sendResponse);
          break;
        default:
          sendResponse({ success: false, error: `Unknown message type: ${type}` });
      }
    } catch (err) {
      console.error('[Web Marker BG] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Keep the message channel open for the async response
  return true;
});

// ── Action click handler ────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWING' });
    } catch (err) {
      console.error('[Web Marker BG] Error toggling drawing on action click:', err);
    }
  }
});

// ── Tab cleanup ─────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStore.delete(tabId);
  activeSidePanelTabs.delete(tabId);
  chrome.storage.session.remove(`tabData_${tabId}`);
});
