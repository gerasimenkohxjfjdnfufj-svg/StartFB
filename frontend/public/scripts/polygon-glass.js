/**
 * polygon-glass.js — UI interactions for Polygon Glass theme
 *
 * Responsibilities:
 *   • Throttled mousemove → window.__PG.mouse (read by polygon-bg.js)
 *   • Click → temporary crack canvas overlay (desktop only)
 *   • MutationObserver keeps crack bindings on dynamically mounted elements
 */
;(function () {
  'use strict'

  if (!document.body.classList.contains('style-polygon-glass')) return

  /* ── Throttled mouse → shared state ────────────────────────────────── */
  var lastMoveTime = 0
  var THROTTLE_MS  = 16   /* ~60fps */

  function onMouseMove(e) {
    var now = performance.now ? performance.now() : Date.now()
    if (now - lastMoveTime < THROTTLE_MS) return
    lastMoveTime = now

    /* window.__PG is created by polygon-bg.js; guard for load order */
    if (window.__PG) {
      window.__PG.mouse.x = e.clientX
      window.__PG.mouse.y = e.clientY
    }
  }

  /* ── Crack effect ────────────────────────────────────────────────────── */
  var CRACK_DURATION = 270   /* ms */
  var CRACK_BRANCHES = [5, 9] /* [min, max] */

  function spawnCrack(x, y) {
    /* disabled on mobile for performance */
    if (window.innerWidth <= 768) return

    var oc = document.createElement('canvas')
    oc.width  = window.innerWidth
    oc.height = window.innerHeight
    oc.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'z-index:9999',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(oc)

    var ctx = oc.getContext('2d')
    var n   = CRACK_BRANCHES[0] + Math.floor(Math.random() * (CRACK_BRANCHES[1] - CRACK_BRANCHES[0] + 1))
    var maxLen = 52 + Math.random() * 50
    var lines  = buildLines(x, y, n, maxLen)
    var start  = performance.now ? performance.now() : Date.now()

    /* self-contained RAF loop — removed when opacity reaches 0 */
    ;(function draw() {
      var elapsed = (performance.now ? performance.now() : Date.now()) - start
      var progress = Math.min(1, elapsed / CRACK_DURATION)
      var opacity  = Math.pow(1 - progress, 1.7)

      if (opacity < 0.015) {
        if (oc.parentNode) oc.parentNode.removeChild(oc)
        return
      }

      ctx.clearRect(0, 0, oc.width, oc.height)
      ctx.save()
      ctx.globalAlpha = opacity

      for (var i = 0; i < lines.length; i++) {
        var l = lines[i]
        /* crack "grows" quickly in first third of animation */
        var drawn = l.len * Math.min(1, progress * 3.2)
        ctx.beginPath()
        ctx.moveTo(l.x, l.y)
        ctx.lineTo(l.x + Math.cos(l.a) * drawn, l.y + Math.sin(l.a) * drawn)
        ctx.strokeStyle = 'rgba(0,220,255,1)'
        ctx.lineWidth   = l.w
        ctx.lineCap     = 'round'
        ctx.shadowColor = 'rgba(0,200,255,0.85)'
        ctx.shadowBlur  = 8
        ctx.stroke()
      }

      ctx.restore()
      requestAnimationFrame(draw)
    }())
  }

  function buildLines(ox, oy, count, maxLen) {
    var lines = []
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.9
      var len   = maxLen * (0.42 + Math.random() * 0.58)
      lines.push({ x: ox, y: oy, a: angle, len: len, w: 1.4 })

      /* sub-crack at ~58% along the main branch */
      if (Math.random() > 0.4) {
        lines.push({
          x   : ox + Math.cos(angle) * len * 0.58,
          y   : oy + Math.sin(angle) * len * 0.58,
          a   : angle + (Math.random() - 0.5) * 1.6,
          len : len * 0.38,
          w   : 0.7,
        })
      }
    }
    return lines
  }

  /* ── Bind click→crack on interactive elements ────────────────────────── */
  var CLICK_SELECTOR = [
    '.btn-main',
    '.btn-swap',
    '.profile-btn',
    '.theme-toggle',
    '.auth-submit-btn',
    '.auth-role-btn',
    '.auth-profile-btn',
    '.auth-tab',
  ].join(',')

  var bound = (typeof WeakSet !== 'undefined') ? new WeakSet() : null

  function bindCrackToElements() {
    var els = document.querySelectorAll(CLICK_SELECTOR)
    for (var i = 0; i < els.length; i++) {
      var el = els[i]
      if (bound && bound.has(el)) continue
      if (bound) bound.add(el)
      el.addEventListener('click', crackHandler)
    }
  }

  function crackHandler(e) {
    spawnCrack(e.clientX, e.clientY)
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init() {
    if (!document.body.classList.contains('style-polygon-glass')) return

    window.addEventListener('mousemove', onMouseMove)

    bindCrackToElements()

    /* re-bind when React mounts new components */
    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(bindCrackToElements)
      obs.observe(document.body, { childList: true, subtree: true })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
