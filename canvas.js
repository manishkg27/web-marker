/**
 * Web Marker — CanvasEngine
 * =========================
 * The core drawing engine for the Web Marker Chrome extension.
 * One CanvasEngine instance is created per drawing surface:
 *   - 'overlay'         — scroll-aware, drawn over the live page
 *   - 'blankPage_0'…4   — full blank-page canvases
 *   - 'sidePanel'       — thumbnail / mini canvas in the side panel
 *
 * Coordinates:
 *   • Scroll-aware surfaces store points in document-relative coords.
 *   • All other surfaces store canvas-relative coords.
 *
 * NOTE: background.js must also handle the ERASE_STROKE message type
 *       (same pattern as ADD_STROKE / UNDO / REDO / CLEAR).
 */

'use strict';

class CanvasEngine {
  /**
   * @param {HTMLCanvasElement} canvasElement — the <canvas> DOM element (created by the caller)
   * @param {string} surfaceId — 'overlay' | 'blankPage_0'..'blankPage_4' | 'sidePanel'
   * @param {object} [options]
   * @param {boolean} [options.scrollAware=false] — overlay is scroll-aware, others aren't
   */
  constructor(canvasElement, surfaceId, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.surfaceId = surfaceId;
    this.scrollAware = options.scrollAware || false;

    /** @type {object|null} In-progress stroke being drawn right now */
    this.currentStroke = null;

    /** @type {Array<object>} Local cache of committed strokes (synced with background) */
    this.strokes = [];

    this.isDrawing = false;

    /** Active tool configuration — mutated via setToolState() */
    this.toolState = {
      activeTool: 'pen',   // 'pen' | 'highlighter' | 'arrow' | 'eraser' | 'text'
      color: '#ff3366',
      size: 3,
      opacity: 1,
    };

    // DPI values set by _setupCanvas
    this.dpr = 1;
    this.cssWidth = 0;
    this.cssHeight = 0;

    // Bind handlers once so we can add AND remove the same references
    this._boundPointerDown = (e) => this._onPointerDown(e);
    this._boundPointerMove = (e) => this._onPointerMove(e);
    this._boundPointerUp = (e) => this._onPointerUp(e);

    this._setupCanvas();
    this._bindEvents();
  }

  // ---------------------------------------------------------------------------
  // DPI Scaling
  // ---------------------------------------------------------------------------

  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.dpr = dpr;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------

  _bindEvents() {
    // Prevent browser scroll / pinch-zoom while drawing
    this.canvas.style.touchAction = 'none';

    this.canvas.addEventListener('pointerdown', this._boundPointerDown);
    this.canvas.addEventListener('pointermove', this._boundPointerMove);
    this.canvas.addEventListener('pointerup', this._boundPointerUp);
    this.canvas.addEventListener('pointercancel', this._boundPointerUp);

    // Scroll → redraw (overlay only, so strokes track document position)
    if (this.scrollAware) {
      this._scrollHandler = () => this.redrawAll();
      window.addEventListener('scroll', this._scrollHandler, { passive: true });
    }

    // Resize → recalculate DPI + redraw
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  // ---------------------------------------------------------------------------
  // Coordinate Helpers
  // ---------------------------------------------------------------------------

  /**
   * Convert a PointerEvent to a point object.
   * For scroll-aware surfaces the coordinates are document-relative;
   * for all others they are canvas-relative.
   */
  _getPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (this.scrollAware) {
      x += window.scrollX;
      y += window.scrollY;
    }

    return { x, y, pressure: e.pressure || 0.5 };
  }

  /**
   * Transform a stored x-coordinate back to canvas-local space for rendering.
   */
  _tx(x) {
    return this.scrollAware ? x - window.scrollX : x;
  }

  /**
   * Transform a stored y-coordinate back to canvas-local space for rendering.
   */
  _ty(y) {
    return this.scrollAware ? y - window.scrollY : y;
  }

  // ---------------------------------------------------------------------------
  // Pointer Event Handlers
  // ---------------------------------------------------------------------------

  _onPointerDown(e) {
    const tool = this.toolState.activeTool;

    // Eraser — supports drag-to-erase so we still need capture
    if (tool === 'eraser') {
      this.isDrawing = true;
      this.canvas.setPointerCapture(e.pointerId);
      this._handleErase(e);
      return;
    }

    // Text — one-shot placement, no drag
    if (tool === 'text') {
      this._handleText(e);
      return;
    }

    // pen / highlighter / arrow — start a new stroke
    this.isDrawing = true;
    this.canvas.setPointerCapture(e.pointerId);

    this.currentStroke = {
      id: crypto.randomUUID(),
      tool,
      color: this.toolState.color,
      size: this.toolState.size,
      opacity: this.toolState.opacity,
      points: [this._getPoint(e)],
      timestamp: Date.now(),
    };

    // Draw the initial dot so single-click is visible
    this._drawCurrentStroke();
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;

    // Continuous erasing while dragging
    if (this.toolState.activeTool === 'eraser') {
      this._handleErase(e);
      return;
    }

    if (!this.currentStroke) return;

    // Use coalesced events for maximum input fidelity (120-240 Hz devices)
    const events = e.getCoalescedEvents?.() || [e];
    for (const ce of events) {
      this.currentStroke.points.push(this._getPoint(ce));
    }

    // Incremental render (no full redraw for perf)
    this._drawCurrentStroke();
  }

  async _onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (_) {
      // pointerId may already be released (e.g. pointercancel)
    }

    // Eraser doesn't produce strokes
    if (this.toolState.activeTool === 'eraser') return;

    // Only persist strokes with at least 2 points
    if (this.currentStroke && this.currentStroke.points.length >= 2) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'ADD_STROKE',
          payload: { surfaceId: this.surfaceId, stroke: this.currentStroke },
        });

        if (response?.success) {
          this.strokes = response.data.strokes;
          this.redrawAll();
        }
      } catch (err) {
        // Background unreachable — keep stroke locally so user doesn't lose work
        console.warn('[CanvasEngine] ADD_STROKE failed, keeping stroke locally:', err);
        this.strokes.push(this.currentStroke);
        this.redrawAll();
      }
    }

    this.currentStroke = null;
  }

  // ---------------------------------------------------------------------------
  // Drawing — Incremental (in-progress stroke)
  // ---------------------------------------------------------------------------

  /**
   * Render the current in-progress stroke incrementally on top of existing
   * content, WITHOUT doing a full redraw of all committed strokes.
   */
  _drawCurrentStroke() {
    if (!this.currentStroke) return;

    const { points, tool, color, size, opacity } = this.currentStroke;
    if (points.length === 0) return;

    const ctx = this.ctx;
    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 4;
    } else if (tool === 'pen') {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
    } else if (tool === 'arrow') {
      // For arrows we redraw the full arrow each move so it follows the cursor
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
    }

    if (tool === 'arrow') {
      // Arrows are rendered from start → current end; need mini-clear first
      // We do a full redraw for arrows since the line must update each frame
      this.ctx.restore();
      this.redrawAll();
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      this._drawArrow(ctx, points, size);
      ctx.restore();
      return;
    }

    // pen / highlighter — draw only the newest segment(s) for performance
    if (points.length === 1) {
      // Single dot
      const p = points[0];
      const w = size * (p.pressure * 1.5 + 0.25);
      ctx.beginPath();
      ctx.arc(this._tx(p.x), this._ty(p.y), w / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // Draw the last couple of segments for a smooth incremental appearance
      const start = Math.max(1, points.length - 3);
      for (let i = start; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const width = tool === 'highlighter'
          ? size * 4
          : size * (p1.pressure * 1.5 + 0.25);

        ctx.beginPath();
        ctx.lineWidth = width;

        if (i < points.length - 1) {
          const p2 = points[i + 1];
          const midX = (this._tx(p1.x) + this._tx(p2.x)) / 2;
          const midY = (this._ty(p1.y) + this._ty(p2.y)) / 2;
          ctx.moveTo(this._tx(p0.x), this._ty(p0.y));
          ctx.quadraticCurveTo(this._tx(p1.x), this._ty(p1.y), midX, midY);
        } else {
          ctx.moveTo(this._tx(p0.x), this._ty(p0.y));
          ctx.lineTo(this._tx(p1.x), this._ty(p1.y));
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Drawing — Full Stroke Render
  // ---------------------------------------------------------------------------

  /**
   * Render a single completed stroke. Called by redrawAll().
   */
  _renderStroke(stroke) {
    const { points, tool, color, size, opacity } = stroke;
    if (points.length < 2) return;

    const ctx = this.ctx;
    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 4;
    } else if (tool === 'pen') {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
    } else if (tool === 'arrow') {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
    } else if (tool === 'text') {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `${size}px inherit`;
      ctx.textBaseline = 'top';
    }

    if (tool === 'arrow') {
      this._drawArrow(ctx, points, size);
    } else if (tool === 'text') {
      // Create multiline support
      const lines = (stroke.text || '').split('\n');
      let yOffset = this._ty(points[0].y);
      for (const line of lines) {
        ctx.fillText(line, this._tx(points[0].x), yOffset);
        yOffset += size * 1.2;
      }
    } else {
      // Pressure-sensitive, variable-width Bézier smoothing:
      // Each segment is drawn individually because lineWidth changes per point.
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const width = tool === 'highlighter'
          ? size * 4
          : size * (p1.pressure * 1.5 + 0.25);

        ctx.beginPath();
        ctx.lineWidth = width;

        if (i < points.length - 1) {
          const p2 = points[i + 1];
          const midX = (this._tx(p1.x) + this._tx(p2.x)) / 2;
          const midY = (this._ty(p1.y) + this._ty(p2.y)) / 2;
          ctx.moveTo(this._tx(p0.x), this._ty(p0.y));
          ctx.quadraticCurveTo(this._tx(p1.x), this._ty(p1.y), midX, midY);
        } else {
          ctx.moveTo(this._tx(p0.x), this._ty(p0.y));
          ctx.lineTo(this._tx(p1.x), this._ty(p1.y));
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Arrow Helper
  // ---------------------------------------------------------------------------

  /**
   * Draw an arrow from the first point to the last point with a filled head.
   */
  _drawArrow(ctx, points, size) {
    const start = points[0];
    const end = points[points.length - 1];
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = size * 5;

    // Shaft
    ctx.beginPath();
    ctx.moveTo(this._tx(start.x), this._ty(start.y));
    ctx.lineTo(this._tx(end.x), this._ty(end.y));
    ctx.stroke();

    // Arrowhead (filled triangle)
    const ex = this._tx(end.x);
    const ey = this._ty(end.y);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - headLen * Math.cos(angle - Math.PI / 6),
      ey - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      ex - headLen * Math.cos(angle + Math.PI / 6),
      ey - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Eraser
  // ---------------------------------------------------------------------------

  /**
   * Stroke-level eraser: find the topmost stroke within hit radius and remove it.
   */
  _handleErase(e) {
    const point = this._getPoint(e);
    const hitRadius = this.toolState.size * 3;

    // Iterate in reverse so top-most stroke is erased first
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i];
      for (const p of stroke.points) {
        const dx = this._tx(p.x) - this._tx(point.x);
        const dy = this._ty(p.y) - this._ty(point.y);
        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
          this._eraseStroke(i);
          return;
        }
      }
    }
  }

  /**
   * Ask the background to remove a stroke at the given index,
   * then sync the local cache and redraw.
   */
  async _eraseStroke(index) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ERASE_STROKE',
        payload: { surfaceId: this.surfaceId, strokeIndex: index },
      });

      if (response?.success) {
        this.strokes = response.data.strokes;
        this.redrawAll();
      }
    } catch (err) {
      // Fallback: remove locally so the erase still feels responsive
      console.warn('[CanvasEngine] ERASE_STROKE failed, removing locally:', err);
      this.strokes.splice(index, 1);
      this.redrawAll();
    }
  }

  // ---------------------------------------------------------------------------
  // Text Tool
  // ---------------------------------------------------------------------------

  /**
   * Dispatch a custom event so content.js can create a floating text input
   * at the click location.
   */
  _handleText(e) {
    const point = this._getPoint(e);
    this.canvas.dispatchEvent(
      new CustomEvent('wm-text-request', {
        detail: {
          x: e.clientX,
          y: e.clientY,
          docX: point.x,
          docY: point.y,
          surfaceId: this.surfaceId,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Full Redraw
  // ---------------------------------------------------------------------------

  /**
   * Clear the canvas and replay every committed stroke.
   * @param {Array<object>} [strokes] — optional new strokes array to replace the cache
   */
  redrawAll(strokes) {
    if (strokes !== undefined) {
      this.strokes = strokes;
    }
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    for (const stroke of this.strokes) {
      this._renderStroke(stroke);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API — State Mutations (via Background)
  // ---------------------------------------------------------------------------

  /**
   * Clear all strokes on this surface.
   */
  async clear() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR',
        payload: { surfaceId: this.surfaceId },
      });

      if (response?.success) {
        this.strokes = response.data.strokes;
        this.redrawAll();
      }
    } catch (err) {
      console.warn('[CanvasEngine] CLEAR failed:', err);
      this.strokes = [];
      this.redrawAll();
    }
  }

  /**
   * Undo the last stroke on this surface.
   */
  async undo() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UNDO',
        payload: { surfaceId: this.surfaceId },
      });

      if (response?.success) {
        this.strokes = response.data.strokes;
        this.redrawAll();
      }
    } catch (err) {
      console.warn('[CanvasEngine] UNDO failed:', err);
    }
  }

  /**
   * Redo the last undone stroke on this surface.
   */
  async redo() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REDO',
        payload: { surfaceId: this.surfaceId },
      });

      if (response?.success) {
        this.strokes = response.data.strokes;
        this.redrawAll();
      }
    } catch (err) {
      console.warn('[CanvasEngine] REDO failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API — Local Operations
  // ---------------------------------------------------------------------------

  /**
   * Merge new tool state properties into the current toolState.
   * @param {object} newState — partial tool state, e.g. { color: '#00ff00' }
   */
  setToolState(newState) {
    Object.assign(this.toolState, newState);
  }

  /**
   * Recalculate DPI scaling and redraw (call on window resize).
   */
  resize() {
    this._setupCanvas();
    this.redrawAll();
  }

  /**
   * Export the current canvas content as a PNG data-URL.
   * @returns {string} data:image/png;base64,…
   */
  exportPNG() {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Tear down all event listeners. Call this before discarding the engine.
   */
  destroy() {
    this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
    this.canvas.removeEventListener('pointermove', this._boundPointerMove);
    this.canvas.removeEventListener('pointerup', this._boundPointerUp);
    this.canvas.removeEventListener('pointercancel', this._boundPointerUp);

    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
    }

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }
}

// ---------------------------------------------------------------------------
// Export as global — content scripts don't support ES modules
// ---------------------------------------------------------------------------
window.CanvasEngine = CanvasEngine;
