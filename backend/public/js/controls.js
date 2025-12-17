function initControls(ctx) {
  const { ws, canvas, id, modeProvider, videoEl } = ctx
  const toolbar = document.querySelector('.toolbar')
  if (!toolbar) return
  function sendKeycode(action, code) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const buf = new ArrayBuffer(14)
    const view = new DataView(buf)
    view.setUint8(0, 0)
    view.setUint8(1, action)
    view.setInt32(2, code)
    view.setInt32(6, 0)
    view.setInt32(10, 0)
    ws.send(buf)
  }
  const KEYCODES = { back: 4, home: 3, recents: 187, power: 26, volup: 24, voldown: 25 }
  toolbar.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button, select')
    if (!btn) return
    const action = btn.dataset.action
    if (action === 'back') sendKeycode(0, KEYCODES.back), sendKeycode(1, KEYCODES.back)
    else if (action === 'home') sendKeycode(0, KEYCODES.home), sendKeycode(1, KEYCODES.home)
    else if (action === 'recents') sendKeycode(0, KEYCODES.recents), sendKeycode(1, KEYCODES.recents)
    else if (action === 'power') sendKeycode(0, KEYCODES.power), sendKeycode(1, KEYCODES.power)
    else if (action === 'vol-up') sendKeycode(0, KEYCODES.volup), sendKeycode(1, KEYCODES.volup)
    else if (action === 'vol-down') sendKeycode(0, KEYCODES.voldown), sendKeycode(1, KEYCODES.voldown)
    else if (action === 'fullscreen') {
      const el = canvas
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{})
      else el.requestFullscreen && el.requestFullscreen().catch(()=>{})
    } else if (action === 'rotate') {
      try { screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null } catch(_) {}
    } else if (action === 'keyboard') {
      const input = document.getElementById('soft-keyboard') || (() => {
        const i = document.createElement('input')
        i.id = 'soft-keyboard'
        i.style.position = 'absolute'
        i.style.opacity = '0'
        i.style.top = '-1000px'
        document.body.appendChild(i)
        // Send text as shell input or keycodes? 
        // For now just trigger keyboard show. 
        // Actual text input handling would require a listener here sending shell injectText.
        // But the user just asked for "Keyboard" button which usually toggles soft keyboard.
        // If we want actual input, we need to implement it.
        // Let's just make it focusable to show the keyboard on mobile.
        return i
      })()
      input.focus()
      // If we want to hide it, we blur?
      // input.blur()
    } else if (action === 'screenshot') {
      try {
        const targetCanvas = canvas
        const blob = await new Promise((res) => targetCanvas.toBlob(res, 'image/png'))
        const a = document.createElement('a')
        const url = URL.createObjectURL(blob)
        const ts = new Date().toISOString().replace(/[:.]/g,'-')
        a.href = url
        a.download = `screenshot-${id}-${ts}.png`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 0)
      } catch (e) {}
    }
  })
  toolbar.addEventListener('change', (ev) => {
    const sel = ev.target.closest('select')
    if (!sel) return
    const action = sel.dataset.action
    if (action === 'quality') {
      const q = parseInt(sel.value,10)
      fetch('/device/'+id+'/start', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ maxSize: q }) }).catch(()=>{})
    } else if (action === 'mode') {
      const m = sel.value
      try { ws.send(JSON.stringify({ type:'mode', id, mode: m })) } catch(_){}
      if (modeProvider) modeProvider(m)
    }
  })
  canvas.addEventListener('touchstart', (e) => { e.preventDefault() }, { passive: false })
  canvas.addEventListener('touchmove', (e) => { e.preventDefault() }, { passive: false })
}
window.initControls = initControls
