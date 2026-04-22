/**
 * Polygon Glass — animated canvas background
 * Grid-based triangulation with HSL color lerp and mouse interaction.
 * Only runs when <body> has .style-polygon-glass.
 */
;(function () {
  if (!document.body.classList.contains('style-polygon-glass')) return

  /* ── Config ─────────────────────────────────────────────────────────── */
  const CFG = {
    colsDesktop: 32,
    rowsDesktop: 17,
    colsMobile:  13,
    rowsMobile:   8,
    jitter:       0.48,      // point randomization (fraction of cell)
    hueMin:       190,
    hueMax:       260,       // cyan → indigo palette
    satMin:        55,
    satMax:        90,
    litMin:         5,
    litMax:        22,
    alphaMin:      0.35,
    alphaMax:      0.70,
    animSpeed:     0.0028,   // radians per frame
    mouseRadius:   130,
    mouseLift:      40,      // max lightness boost from mouse
    mouseAlpha:     0.3,     // max alpha boost from mouse
    mouseDecay:     0.05,    // brightness decay per frame
    mouseGain:      0.18,    // brightness gain per frame
    throttleMs:     30,      // mousemove throttle
  }

  /* ── State ───────────────────────────────────────────────────────────── */
  let canvas, ctx
  let W = 0, H = 0
  let triangles = []
  let t = 0
  let rafId
  let mouse = { x: -9999, y: -9999 }
  let lastMouse = 0

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init () {
    const existing = document.getElementById('pg-bg')
    if (existing) existing.remove()

    canvas = document.createElement('canvas')
    canvas.id = 'pg-bg'
    Object.assign(canvas.style, {
      position:       'fixed',
      inset:          '0',
      width:          '100%',
      height:         '100%',
      zIndex:         '-1',
      pointerEvents:  'none',
      display:        'block',
    })
    document.body.prepend(canvas)
    ctx = canvas.getContext('2d')

    resize()
    buildMesh()
    bindEvents()
    if (rafId) cancelAnimationFrame(rafId)
    tick()
  }

  /* ── Resize ──────────────────────────────────────────────────────────── */
  function resize () {
    W = canvas.width  = window.innerWidth
    H = canvas.height = window.innerHeight
  }

  /* ── Build triangulated grid ─────────────────────────────────────────── */
  function buildMesh () {
    triangles = []
    const mobile = window.innerWidth <= 768
    const cols   = mobile ? CFG.colsMobile : CFG.colsDesktop
    const rows   = mobile ? CFG.rowsMobile : CFG.rowsDesktop
    const cw     = W / cols
    const ch     = H / rows
    const jx     = cw * CFG.jitter
    const jy     = ch * CFG.jitter

    /* grid of slightly randomized points */
    const pts = []
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = clamp(c * cw + rand(-jx, jx), 0, W)
        const y = clamp(r * ch + rand(-jy, jy), 0, H)
        pts.push({ x, y })
      }
    }

    /* each cell → 2 triangles */
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tl = pts[r * (cols + 1) + c]
        const tr = pts[r * (cols + 1) + c + 1]
        const bl = pts[(r + 1) * (cols + 1) + c]
        const br = pts[(r + 1) * (cols + 1) + c + 1]
        triangles.push(makeTri(tl, tr, bl))
        triangles.push(makeTri(tr, br, bl))
      }
    }
  }

  function makeTri (a, b, c) {
    const cx = (a.x + b.x + c.x) / 3
    const cy = (a.y + b.y + c.y) / 3
    return {
      v: [a, b, c],
      cx, cy,
      hue:    rand(CFG.hueMin, CFG.hueMax),
      sat:    rand(CFG.satMin, CFG.satMax),
      lit:    rand(CFG.litMin, CFG.litMax),
      alpha:  rand(CFG.alphaMin, CFG.alphaMax),
      offset: Math.random() * Math.PI * 2,
      bright: 0,
    }
  }

  /* ── Animation loop ──────────────────────────────────────────────────── */
  const RSQR = CFG.mouseRadius * CFG.mouseRadius

  function tick () {
    t += CFG.animSpeed

    /* clear with dark base */
    ctx.fillStyle = '#06080f'
    ctx.fillRect(0, 0, W, H)

    /* update mouse brightness */
    const mx = mouse.x, my = mouse.y
    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i]
      const dx = tri.cx - mx, dy = tri.cy - my
      const d2 = dx * dx + dy * dy
      if (d2 < RSQR) {
        const factor = 1 - d2 / RSQR
        tri.bright = Math.min(1, tri.bright + factor * CFG.mouseGain)
      } else {
        tri.bright = Math.max(0, tri.bright - CFG.mouseDecay)
      }
    }

    /* draw triangles */
    for (let i = 0; i < triangles.length; i++) {
      const tri  = triangles[i]
      const wave = Math.sin(t + tri.offset)   // -1..1

      const hue   = tri.hue   + wave * 14
      const sat   = tri.sat   + wave * 12
      const lit   = tri.lit   + wave * 7  + tri.bright * CFG.mouseLift
      const alpha = tri.alpha + wave * 0.08 + tri.bright * CFG.mouseAlpha

      ctx.beginPath()
      ctx.moveTo(tri.v[0].x, tri.v[0].y)
      ctx.lineTo(tri.v[1].x, tri.v[1].y)
      ctx.lineTo(tri.v[2].x, tri.v[2].y)
      ctx.closePath()

      ctx.fillStyle = `hsla(${hue},${sat}%,${Math.max(0, lit)}%,${Math.min(1, alpha)})`
      ctx.fill()

      /* thin glowing edge */
      const edgeAlpha = 0.04 + tri.bright * 0.18
      ctx.strokeStyle = `rgba(0,200,255,${edgeAlpha})`
      ctx.lineWidth   = 0.6
      ctx.stroke()
    }

    rafId = requestAnimationFrame(tick)
  }

  /* ── Events ──────────────────────────────────────────────────────────── */
  function bindEvents () {
    window.addEventListener('mousemove', e => {
      const now = performance.now()
      if (now - lastMouse < CFG.throttleMs) return
      lastMouse = now
      mouse.x = e.clientX
      mouse.y = e.clientY
    })

    window.addEventListener('resize', debounce(() => {
      resize()
      buildMesh()
    }, 280))
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function rand (lo, hi) { return lo + Math.random() * (hi - lo) }
  function clamp (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
  function debounce (fn, ms) {
    let id
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms) }
  }

  /* ── Boot ────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  /* public API for hot-toggle */
  window.__pgBg = {
    init,
    destroy () {
      if (rafId) cancelAnimationFrame(rafId)
      const c = document.getElementById('pg-bg')
      if (c) c.remove()
    },
  }
})()
