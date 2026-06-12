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

/** Create default TabData with every surface initialised. */
function createTabData() {
  return {
    overlay: createStrokeCollection(),
    blankPage_0: createStrokeCollection(),
    blankPage_1: createStrokeCollection(),
    blankPage_2: createStrokeCollection(),
    blankPage_3: createStrokeCollection(),
    blankPage_4: createStrokeCollection(),
    sidePanel: createStrokeCollection(),
    activePageIndex: 0,
  };
}

// ── Accessors ───────────────────────────────────────────────

/**
 * Return existing TabData or create + cache a new default.
 * @param {number} tabId
 * @returns {object} TabData
 */
function getTabData(tabId) {
  if (!tabStore.has(tabId)) {
    tabStore.set(tabId, createTabData());
  }
  return tabStore.get(tabId);
}

/**
 * Return the StrokeCollection for a named surface.
 * @param {number} tabId
 * @param {string} surfaceId  e.g. 'overlay', 'blankPage_0' … 'blankPage_4', 'sidePanel'
 * @returns {object} StrokeCollection
 */
function getSurface(tabId, surfaceId) {
  const tabData = getTabData(tabId);
  if (!tabData[surfaceId]) {
    tabData[surfaceId] = createStrokeCollection();
  }
  return tabData[surfaceId];
}

// ── Deep-copy utility ───────────────────────────────────────

function deepCopy(arr) {
  return JSON.parse(JSON.stringify(arr));
}

// ── Undo / Redo snapshot helpers ────────────────────────────

/**
 * Push a snapshot of current strokes onto undoStack and clear redoStack.
 * Used before mutating strokes (ADD_STROKE, CLEAR).
 */
function snapshotUndo(collection) {
  collection.undoStack.push(deepCopy(collection.strokes));
  collection.redoStack = [];
}

/**
 * Push a snapshot onto undoStack WITHOUT clearing redoStack.
 * Used internally by undo/redo to preserve the opposite stack.
 */
function snapshotForUndo(collection) {
  collection.undoStack.push(deepCopy(collection.strokes));
}

// ── Message handler (single listener, async IIFE pattern) ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { type, payload } = message;

      // Resolve tabId — prefer sender.tab.id; fall back for popup
      const tabId = sender.tab?.id;

      switch (type) {
        // ── ADD_STROKE ────────────────────────────────────
        case 'ADD_STROKE': {
          const { surfaceId, stroke } = payload;
          const collection = getSurface(tabId, surfaceId);
          snapshotUndo(collection);
          collection.strokes.push(stroke);
          sendResponse({ success: true, data: { strokes: collection.strokes } });
          break;
        }

        // ── UNDO ──────────────────────────────────────────
        case 'UNDO': {
          const { surfaceId } = payload;
          const collection = getSurface(tabId, surfaceId);

          if (collection.undoStack.length === 0) {
            sendResponse({ success: true, data: { strokes: collection.strokes } });
            break;
          }

          collection.redoStack.push(deepCopy(collection.strokes));
          collection.strokes = collection.undoStack.pop();
          sendResponse({ success: true, data: { strokes: collection.strokes } });
          break;
        }

        // ── REDO ──────────────────────────────────────────
        case 'REDO': {
          const { surfaceId } = payload;
          const collection = getSurface(tabId, surfaceId);

          if (collection.redoStack.length === 0) {
            sendResponse({ success: true, data: { strokes: collection.strokes } });
            break;
          }

          snapshotForUndo(collection);
          collection.strokes = collection.redoStack.pop();
          sendResponse({ success: true, data: { strokes: collection.strokes } });
          break;
        }

        // ── CLEAR ─────────────────────────────────────────
        case 'CLEAR': {
          const { surfaceId } = payload;
          const collection = getSurface(tabId, surfaceId);
          snapshotUndo(collection);
          collection.strokes = [];
          sendResponse({ success: true, data: { strokes: collection.strokes } });
          break;
        }

        // ── GET_STATE ─────────────────────────────────────
        case 'GET_STATE': {
          const tabData = getTabData(tabId);
          sendResponse({ success: true, data: tabData });
          break;
        }

        // ── SET_TOOL ──────────────────────────────────────
        case 'SET_TOOL': {
          const toolState = payload; // { activeTool, color, size, opacity }
          await chrome.storage.session.set({ [`toolState_${tabId}`]: toolState });
          sendResponse({ success: true, data: toolState });
          break;
        }

        // ── GET_TOOL ──────────────────────────────────────
        case 'GET_TOOL': {
          const key = `toolState_${tabId}`;
          const result = await chrome.storage.session.get(key);
          const toolState = result[key] || {
            activeTool: 'pen',
            color: '#ff3366',
            size: 3,
            opacity: 1,
          };
          sendResponse({ success: true, data: toolState });
          break;
        }

        // ── SET_PAGE ──────────────────────────────────────
        case 'SET_PAGE': {
          const { index } = payload;
          const tabData = getTabData(tabId);
          tabData.activePageIndex = index;
          sendResponse({ success: true, data: { index } });
          break;
        }

        // ── TOGGLE_DRAWING ────────────────────────────────
        case 'TOGGLE_DRAWING': {
          // May come from popup (no sender.tab) — query active tab
          let targetTabId = tabId;
          if (!targetTabId) {
            const [activeTab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            targetTabId = activeTab?.id;
          }
          if (targetTabId) {
            await chrome.tabs.sendMessage(targetTabId, { type: 'TOGGLE_DRAWING' });
          }
          sendResponse({ success: true });
          break;
        }

        // ── ERASE_STROKE ──────────────────────────────────
        case 'ERASE_STROKE': {
          const { surfaceId, strokeIndex } = payload;
          const collection = getSurface(tabId, surfaceId);
          snapshotUndo(collection);
          collection.strokes.splice(strokeIndex, 1);
          sendResponse({ success: true, data: { strokes: collection.strokes } });
          break;
        }

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
  chrome.storage.session.remove(`toolState_${tabId}`);
});
