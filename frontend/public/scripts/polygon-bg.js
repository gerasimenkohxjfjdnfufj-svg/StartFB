/**
 * polygon-bg.js — animated polygon canvas background
 *
 * Architecture:
 *   init()              — creates canvas, binds resize, kicks off animation
 *   generatePolygons()  — grid triangulation → polygon array
 *   animate()           — RAF loop, draws all polygons each frame
 *
 * Shared state (consumed by polygon-glass.js):
 *   window.__PG.mouse   — { x, y } updated by polygon-glass.js
 */
;(function () {
  'use strict'

  if (!document.body.classList.contains('style-polygon-glass')) return

  /* ── Shared state ───────────────────────────────────────────────────── */
  window.__PG = window.__PG || { mouse: { x: -9999, y: -9999 } }

  /* ── Config ─────────────────────────────────────────────────────────── */
  var CFG = {
    desktopCount : 500,
    mobileCount  : 100,
    jitter       : 0.46,   /* point randomization as fraction of cell */
    hueMin       : 192,
    hueMax       : 260,    /* cyan → electric-blue palette */
    satMin       : 55,
    satMax       : 90,
    litMin       : 6,
    litMax       : 22,
    alphaMin     : 0.30,
    alphaMax     : 0.65,
    timeStep     : 0.0025, /* radians added per frame to global time */
    mouseRadius  : 120,    /* px — proximity influence radius */
    mouseGain    : 0.16,   /* brightness gain per frame when in range */
    mouseDecay   : 0.045,  /* brightness decay per frame out of range */
    mouseSatBoost: 28,     /* max saturation boost from mouse */
    mouseLitBoost: 36,     /* max lightness boost from mouse */
    mouseAlpBoost: 0.30,   /* max opacity boost from mouse */
    edgeBaseAlpha: 0.04,   /* base edge line opacity */
    edgeHoverMax : 0.22,   /* max edge opacity near cursor */
    resizeDebounce: 260,   /* ms */
  }

  /* ── Module state ────────────────────────────────────────────────────── */
  var canvas, ctx
  var W = 0, H = 0, DPR = 1
  var polygons = []
  var globalTime = 0
  var rafId = null
  var resizeTimer = null
  var MOUSE_R2 = CFG.mouseRadius * CFG.mouseRadius

  /* ══════════════════════════════════════════════════════════════════════
     1. init()
     ══════════════════════════════════════════════════════════════════════ */
  function init() {
    /* remove stale canvas if reinitialised */
    var old = document.getElementById('pg-canvas')
    if (old) old.parentNode.removeChild(old)

    canvas = document.createElement('canvas')
    canvas.id = 'pg-canvas'
    canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'z-index:-1',
      'pointer-events:none',
      'display:block',
    ].join(';')

    /* prepend so it sits below all content */
    document.body.insertBefore(canvas, document.body.firstChild)
    ctx = canvas.getContext('2d')

    resize()

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        resize()
        polygons = generatePolygons(isMobile() ? CFG.mobileCount : CFG.desktopCount)
      }, CFG.resizeDebounce)
    })

    polygons = generatePolygons(isMobile() ? CFG.mobileCount : CFG.desktopCount)

    if (rafId) cancelAnimationFrame(rafId)
    animate()
  }

  /* ── resize (handles devicePixelRatio) ──────────────────────────────── */
  function resize() {
    DPR = window.devicePixelRatio || 1
    W   = window.innerWidth
    H   = window.innerHeight

    /* CSS size */
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    /* physical pixel size */
    canvas.width  = Math.round(W * DPR)
    canvas.height = Math.round(H * DPR)

    /* scale once — all draw coords stay in CSS pixels */
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. generatePolygons(count)
     ══════════════════════════════════════════════════════════════════════ */
  function generatePolygons(count) {
    var result = []

    /* derive grid dimensions from target triangle count + aspect ratio */
    var cells  = Math.ceil(count / 2)
    var aspect = W > 0 ? W / H : 1.78
    var cols   = Math.max(3, Math.round(Math.sqrt(cells * aspect)))
    var rows   = Math.max(2, Math.round(cells / cols))

    var cw = W / cols
    var ch = H / rows
    var jx = cw * CFG.jitter
    var jy = ch * CFG.jitter

    /* build jittered grid of points */
    var pts = []
    for (var r = 0; r <= rows; r++) {
      for (var c = 0; c <= cols; c++) {
        pts.push({
          x: clamp(c * cw + rand(-jx, jx), 0, W),
          y: clamp(r * ch + rand(-jy, jy), 0, H),
        })
      }
    }

    /* each cell → 2 triangles */
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var tl = pts[ r      * (cols + 1) + c    ]
        var tr = pts[ r      * (cols + 1) + c + 1]
        var bl = pts[(r + 1) * (cols + 1) + c    ]
        var br = pts[(r + 1) * (cols + 1) + c + 1]
        result.push(makePoly(tl, tr, bl))
        result.push(makePoly(tr, br, bl))
      }
    }

    return result
  }

  /**
   * makePoly(a, b, c) → polygon descriptor
   * {
   *   points:     [ [x,y], [x,y], [x,y] ],
   *   cx, cy:     centroid (for mouse distance calc),
   *   baseHue:    HSL hue,
   *   saturation, lightness, opacity,
   *   phase:      random offset for sin wave,
   *   mEffect:    0..1, animated by proximity to mouse
   * }
   */
  function makePoly(a, b, c) {
    var cx = (a.x + b.x + c.x) / 3
    var cy = (a.y + b.y + c.y) / 3
    return {
      points     : [[a.x, a.y], [b.x, b.y], [c.x, c.y]],
      cx         : cx,
      cy         : cy,
      baseHue    : rand(CFG.hueMin, CFG.hueMax),
      saturation : rand(CFG.satMin, CFG.satMax),
      lightness  : rand(CFG.litMin, CFG.litMax),
      opacity    : rand(CFG.alphaMin, CFG.alphaMax),
      phase      : Math.random() * Math.PI * 2,
      mEffect    : 0,
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. animate()  — RAF loop
     ══════════════════════════════════════════════════════════════════════ */
  function animate() {
    globalTime += CFG.timeStep

    /* clear to dark base (canvas bg shows between transparent polygons) */
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#05080e'
    ctx.fillRect(0, 0, W, H)

    var mx = window.__PG.mouse.x
    var my = window.__PG.mouse.y

    for (var i = 0; i < polygons.length; i++) {
      var p = polygons[i]

      /* ── mouse proximity → mEffect (0..1) ── */
      var dx = p.cx - mx
      var dy = p.cy - my
      var d2 = dx * dx + dy * dy
      if (d2 < MOUSE_R2) {
        var factor = 1 - d2 / MOUSE_R2          /* 0..1, peaks at cursor */
        p.mEffect = Math.min(1, p.mEffect + factor * CFG.mouseGain)
      } else {
        p.mEffect = Math.max(0, p.mEffect - CFG.mouseDecay)
      }

      /* ── per-polygon HSL animation via sin wave ── */
      var wave = Math.sin(globalTime + p.phase)  /* -1..1 */

      var hue   = p.baseHue    + wave * 16
      var sat   = p.saturation + wave * 10 + p.mEffect * CFG.mouseSatBoost
      var lit   = p.lightness  + wave *  7 + p.mEffect * CFG.mouseLitBoost
      var alpha = p.opacity    + wave * 0.06 + p.mEffect * CFG.mouseAlpBoost

      /* ── fill ── */
      ctx.beginPath()
      ctx.moveTo(p.points[0][0], p.points[0][1])
      ctx.lineTo(p.points[1][0], p.points[1][1])
      ctx.lineTo(p.points[2][0], p.points[2][1])
      ctx.closePath()

      ctx.fillStyle = 'hsla(' +
        hue + ',' +
        Math.max(0, sat) + '%,' +
        Math.max(0, lit) + '%,' +
        Math.min(1, Math.max(0, alpha)) + ')'
      ctx.fill()

      /* ── glowing edge ── */
      var edgeAlpha = CFG.edgeBaseAlpha + p.mEffect * CFG.edgeHoverMax
      ctx.strokeStyle = 'rgba(0,200,255,' + edgeAlpha + ')'
      ctx.lineWidth   = 0.5
      ctx.stroke()
    }

    rafId = requestAnimationFrame(animate)
  }

  /* ── Utilities ───────────────────────────────────────────────────────── */
  function rand(lo, hi)      { return lo + Math.random() * (hi - lo) }
  function clamp(v, lo, hi)  { return v < lo ? lo : v > hi ? hi : v }
  function isMobile()        { return window.innerWidth <= 768 }

  /* ── Boot ────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
