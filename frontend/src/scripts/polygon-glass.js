/**
 * Polygon Glass — UI interactions
 * Crack effect on click (canvas overlay), click listeners via MutationObserver.
 * Only runs when <body> has .style-polygon-glass.
 */
;(function () {
  if (!document.body.classList.contains('style-polygon-glass')) return

  /* ── Crack Canvas ────────────────────────────────────────────────────── */
  let crackCanvas, crackCtx

  function initCrackCanvas () {
    const existing = document.getElementById('pg-crack')
    if (existing) existing.remove()

    crackCanvas = document.createElement('canvas')
    crackCanvas.id = 'pg-crack'
    Object.assign(crackCanvas.style, {
      position:      'fixed',
      inset:         '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '9999',
      pointerEvents: 'none',
    })
    document.body.appendChild(crackCanvas)
    setSizes()
    crackCtx = crackCanvas.getContext('2d')

    window.addEventListener('resize', setSizes)
  }

  function setSizes () {
    if (!crackCanvas) return
    crackCanvas.width  = window.innerWidth
    crackCanvas.height = window.innerHeight
  }

  /* ── Draw crack at (x, y) ────────────────────────────────────────────── */
  function drawCrack (x, y) {
    if (window.innerWidth <= 768) return   // skip on mobile for perf

    const ctx      = crackCtx
    const branches = 5 + Math.floor(Math.random() * 5)   // 5–9 branches
    const maxLen   = 55 + Math.random() * 45              // 55–100px
    const lines    = []

    for (let i = 0; i < branches; i++) {
      const baseAngle = (Math.PI * 2 / branches) * i + (Math.random() - 0.5) * 0.7
      const len       = maxLen * (0.45 + Math.random() * 0.55)
      lines.push({ x1: x, y1: y, angle: baseAngle, len, width: 1.4 })

      /* sub-crack at ~60% of branch length */
      if (Math.random() > 0.4) {
        lines.push({
          x1:    x + Math.cos(baseAngle) * len * 0.6,
          y1:    y + Math.sin(baseAngle) * len * 0.6,
          angle: baseAngle + (Math.random() - 0.5) * 1.4,
          len:   len * 0.38,
          width: 0.7,
        })
      }
    }

    const duration = 260
    const start    = performance.now()
    let   rafId

    function draw () {
      const elapsed = performance.now() - start
      const prog    = elapsed / duration          // 0 → 1
      const opacity = Math.pow(1 - prog, 1.8)    // fast fade

      ctx.clearRect(0, 0, crackCanvas.width, crackCanvas.height)

      if (opacity <= 0) {
        cancelAnimationFrame(rafId)
        return
      }

      ctx.save()
      ctx.globalAlpha = opacity

      for (const l of lines) {
        /* draw only up to current progress (crack "spreads") */
        const drawLen = l.len * Math.min(1, prog * 3)
        const ex      = l.x1 + Math.cos(l.angle) * drawLen
        const ey      = l.y1 + Math.sin(l.angle) * drawLen

        ctx.beginPath()
        ctx.moveTo(l.x1, l.y1)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle    = 'rgba(0,220,255,1)'
        ctx.lineWidth      = l.width
        ctx.shadowColor    = 'rgba(0,200,255,0.9)'
        ctx.shadowBlur     = 7
        ctx.lineCap        = 'round'
        ctx.stroke()
      }

      ctx.restore()
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
  }

  /* ── Bind click → crack ──────────────────────────────────────────────── */
  const SELECTOR = [
    '.btn-main',
    '.btn-swap',
    '.profile-btn',
    '.theme-toggle',
    '.auth-submit-btn',
    '.auth-role-btn',
    '.auth-profile-btn',
    '.auth-tab',
  ].join(',')

  const bound = new WeakSet()

  function bindCrack () {
    document.querySelectorAll(SELECTOR).forEach(el => {
      if (bound.has(el)) return
      bound.add(el)
      el.addEventListener('click', e => {
        drawCrack(e.clientX, e.clientY)
      })
    })
  }

  /* ── MutationObserver for dynamic elements ───────────────────────────── */
  const observer = new MutationObserver(bindCrack)

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init () {
    if (!document.body.classList.contains('style-polygon-glass')) return
    initCrackCanvas()
    bindCrack()
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  window.__pgGlass = { reinit: init }
})()
