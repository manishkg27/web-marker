/**
 * Web Marker — CanvasEngine
 * =========================
 * The core drawing engine for the Web Marker Chrome extension.
 * One CanvasEngine instance is created per drawing surface:
 *   - 'overlay'         — scroll-aware, drawn over the live page
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

const ToolRenderers = {
  pen: {
    incremental: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      
      if (points.length === 1) {
        const p = points[0];
        const w = size * (p.pressure * 1.5 + 0.25);
        ctx.beginPath();
        ctx.arc(engine._tx(p.x), engine._ty(p.y), w / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        const start = stroke.lastRenderedIndex || 1;
        ToolRenderers._drawSmoothCurve(engine, ctx, points, start, size, false);
        stroke.lastRenderedIndex = points.length - 1;
      }
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ToolRenderers._drawSmoothCurve(engine, ctx, points, 1, size, false);
    }
  },
  laser: {
    incremental: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      
      if (points.length === 1) {
        const p = points[0];
        const w = size * (p.pressure * 1.5 + 0.25);
        ctx.beginPath();
        ctx.arc(engine._tx(p.x), engine._ty(p.y), w / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        const start = stroke.lastRenderedIndex || 1;
        ToolRenderers._drawSmoothCurve(engine, ctx, points, start, size, false);
        stroke.lastRenderedIndex = points.length - 1;
      }
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ToolRenderers._drawSmoothCurve(engine, ctx, points, 1, size, false);
    }
  },
  highlighter: {
    incremental: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      
      if (points.length === 1) {
        const p = points[0];
        ctx.beginPath();
        ctx.arc(engine._tx(p.x), engine._ty(p.y), (size * 4) / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        const start = stroke.lastRenderedIndex || 1;
        ToolRenderers._drawSmoothCurve(engine, ctx, points, start, size, true);
        stroke.lastRenderedIndex = points.length - 1;
      }
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ToolRenderers._drawSmoothCurve(engine, ctx, points, 1, size, true);
    }
  },
  arrow: {
    incremental: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.restore();
      engine.redrawAll();
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      engine._drawArrow(ctx, points, size);
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      engine._drawArrow(ctx, points, size);
    }
  },
  line: {
    incremental: (engine, ctx, stroke) => {
      ctx.restore(); engine.redrawAll(); ctx.save();
      ToolRenderers.line.full(engine, ctx, stroke);
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      if (points.length < 2) return;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 1.5;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(engine._tx(points[0].x), engine._ty(points[0].y));
      ctx.lineTo(engine._tx(points[points.length - 1].x), engine._ty(points[points.length - 1].y));
      ctx.stroke();
    }
  },
  rectangle: {
    incremental: (engine, ctx, stroke) => {
      ctx.restore(); engine.redrawAll(); ctx.save();
      ToolRenderers.rectangle.full(engine, ctx, stroke);
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      if (points.length < 2) return;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 1.5;
      ctx.lineJoin = 'round';
      const p1 = points[0];
      const p2 = points[points.length - 1];
      let x = engine._tx(p1.x);
      let y = engine._ty(p1.y);
      let w = engine._tx(p2.x) - x;
      let h = engine._ty(p2.y) - y;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();
    }
  },
  ellipse: {
    incremental: (engine, ctx, stroke) => {
      ctx.restore(); engine.redrawAll(); ctx.save();
      ToolRenderers.ellipse.full(engine, ctx, stroke);
    },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity } = stroke;
      if (points.length < 2) return;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 1.5;
      const p1 = points[0];
      const p2 = points[points.length - 1];
      let x1 = engine._tx(p1.x);
      let y1 = engine._ty(p1.y);
      let x2 = engine._tx(p2.x);
      let y2 = engine._ty(p2.y);
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const radiusX = Math.abs(x2 - x1) / 2;
      const radiusY = Math.abs(y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
  },
  text: {
    incremental: (engine, ctx, stroke) => { /* none */ },
    full: (engine, ctx, stroke) => {
      const { points, color, size, opacity, text } = stroke;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.font = `${size}px inherit`;
      ctx.textBaseline = 'top';
      const lines = (text || '').split('\n');
      let yOffset = engine._ty(points[0].y);
      for (const line of lines) {
        ctx.fillText(line, engine._tx(points[0].x), yOffset);
        yOffset += size * 1.2;
      }
    }
  },
  
  _drawSmoothCurve: (engine, ctx, points, startIndex, size, isHighlighter) => {
    for (let i = startIndex; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const width = isHighlighter ? size * 4 : size * (p1.pressure * 1.5 + 0.25);

      ctx.beginPath();
      ctx.lineWidth = width;

      let startX, startY;
      if (i === 1) {
        startX = engine._tx(p0.x);
        startY = engine._ty(p0.y);
      } else {
        startX = (engine._tx(p0.x) + engine._tx(p1.x)) / 2;
        startY = (engine._ty(p0.y) + engine._ty(p1.y)) / 2;
      }
      ctx.moveTo(startX, startY);

      if (i < points.length - 1) {
        const p2 = points[i + 1];
        const endX = (engine._tx(p1.x) + engine._tx(p2.x)) / 2;
        const endY = (engine._ty(p1.y) + engine._ty(p2.y)) / 2;
        ctx.quadraticCurveTo(engine._tx(p1.x), engine._ty(p1.y), endX, endY);
      } else {
        ctx.lineTo(engine._tx(p1.x), engine._ty(p1.y));
      }
      ctx.stroke();
    }
  }
};

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
    this.scrollContainer = options.scrollContainer || null;

    /** @type {object|null} In-progress stroke being drawn right now */
    this.currentStroke = null;

    /** @type {Array<object>} Local cache of committed strokes (synced with background) */
    this.strokes = [];

    this.isDrawing = false;

    /** Active tool configuration — mutated via setToolState() */
    this.toolState = {
      activeTool: 'pen',
      color: '#ff3366',
      size: 3,
      opacity: 1,
      tools: {}
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
    
    // Use offsetWidth to get unscaled CSS dimensions, ignoring transform: scale()
    let cssWidth = this.canvas.offsetWidth;
    let cssHeight = this.canvas.offsetHeight;
    
    // Fallback if offset is 0 (e.g. display: none)
    if (cssWidth === 0 || cssHeight === 0) {
      const rect = this.canvas.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
    }

    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;
    this.ctx.scale(dpr, dpr);

    this.dpr = dpr;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
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
      const target = this.scrollContainer || window;
      target.addEventListener('scroll', this._scrollHandler, { passive: true });
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
      const target = this.scrollContainer || window;
      x += target === window ? window.scrollX : target.scrollLeft;
      y += target === window ? window.scrollY : target.scrollTop;
    }

    return { x, y, pressure: e.pressure || 0.5 };
  }

  /**
   * Transform a stored x-coordinate back to canvas-local space for rendering.
   */
  _tx(x) {
    if (!this.scrollAware) return x;
    const target = this.scrollContainer || window;
    const scrollX = target === window ? window.scrollX : target.scrollLeft;
    return x - scrollX;
  }

  /**
   * Transform a stored y-coordinate back to canvas-local space for rendering.
   */
  _ty(y) {
    if (!this.scrollAware) return y;
    const target = this.scrollContainer || window;
    const scrollY = target === window ? window.scrollY : target.scrollTop;
    return y - scrollY;
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

    // pen / highlighter / laser / arrow — start a new stroke
    this.isDrawing = true;
    this.canvas.setPointerCapture(e.pointerId);

    if (tool === 'laser' && this._laserTimeout) {
      clearTimeout(this._laserTimeout);
      this._laserTimeout = null;
    }

    const config = (this.toolState.tools && this.toolState.tools[tool]) || { color: '#ff3366', size: 3, opacity: 1 };
    this.currentStroke = {
      id: crypto.randomUUID(),
      tool,
      color: config.color,
      size: config.size,
      opacity: config.opacity || 1,
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
      let pt = this._getPoint(ce);

      // Shift-to-Snap logic for continuous drawing tools
      if (e.shiftKey && ['pen', 'highlighter', 'laser'].includes(this.currentStroke.tool)) {
        const startPt = this.currentStroke.points[0];
        const dx = Math.abs(pt.x - startPt.x);
        const dy = Math.abs(pt.y - startPt.y);
        if (dx > dy) {
          pt.y = startPt.y; // perfectly horizontal
        } else {
          pt.x = startPt.x; // perfectly vertical
        }
      } else if (e.shiftKey && ['rectangle', 'ellipse', 'line', 'arrow'].includes(this.currentStroke.tool)) {
        const startPt = this.currentStroke.points[0];
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (['rectangle', 'ellipse'].includes(this.currentStroke.tool)) {
          // Snap to 1:1 aspect ratio (square/circle)
          const size = Math.max(absDx, absDy);
          pt.x = startPt.x + (dx < 0 ? -size : size);
          pt.y = startPt.y + (dy < 0 ? -size : size);
        } else {
          // Snap horizontal or vertical for line/arrow
          if (absDx > absDy) {
            pt.y = startPt.y;
          } else {
            pt.x = startPt.x;
          }
        }
      }

      this.currentStroke.points.push(pt);
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

    // Capture the stroke synchronously to prevent race conditions with the next pointerdown
    const strokeToSave = this.currentStroke;
    this.currentStroke = null;

    // Only persist strokes with at least 2 points
    if (strokeToSave && strokeToSave.points.length >= 2) {
      // Optimistic update: instantly apply stroke to canvas without waiting for background
      this.strokes.push(strokeToSave);
      this.redrawAll();

      if (strokeToSave.tool === 'laser') {
        // Ephemeral: Laser pointer stays until 2.5s of inactivity.
        if (this._laserTimeout) {
          clearTimeout(this._laserTimeout);
        }
        this._laserTimeout = setTimeout(() => {
          let hasLaser = false;
          this.strokes = this.strokes.filter(s => {
            if (s.tool === 'laser') {
              hasLaser = true;
              return false;
            }
            return true;
          });
          if (hasLaser) this.redrawAll();
        }, 2500);
      } else {
        // Send persistent strokes to the background.
        chrome.runtime.sendMessage({
          type: 'ADD_STROKE',
          payload: { surfaceId: this.surfaceId, stroke: strokeToSave },
        }).catch(err => {
          console.warn('[CanvasEngine] Async ADD_STROKE failed:', err);
        });
      }
    }
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

    const renderer = ToolRenderers[tool];
    if (renderer && renderer.incremental) {
      renderer.incremental(this, ctx, this.currentStroke);
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
    if (points.length < 2 && tool !== 'text') return;

    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const renderer = ToolRenderers[tool];
    if (renderer && renderer.full) {
      renderer.full(this, ctx, stroke);
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
    const config = (this.toolState.tools && this.toolState.tools['eraser']) || { size: 20 };
    const hitRadius = config.size;

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

  _handleText(e) {
    const point = this._getPoint(e);

    this.canvas.dispatchEvent(
      new CustomEvent('wm-text-request', {
        detail: {
          x: e.clientX,
          y: e.clientY,
          docX: point.x,
          docY: point.y,
          surfaceId: this.surfaceId
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
      const target = this.scrollContainer || window;
      target.removeEventListener('scroll', this._scrollHandler);
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
