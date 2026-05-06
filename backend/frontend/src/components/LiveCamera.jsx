/**
 * LiveCamera — Real Browser-Side Pothole Detection
 * Uses pixel-level analysis + TensorFlow.js COCO-SSD
 * Styled with PathAegis design tokens (Rajdhani / Exo 2 / Share Tech Mono)
 */
import { useEffect, useRef, useState, useCallback } from 'react'

function getSeverity(bboxArea, frameArea) {
  const ratio = bboxArea / Math.max(frameArea, 1)
  if (ratio < 0.018) return 'low'
  if (ratio < 0.065) return 'medium'
  return 'high'
}

function analyzeFrame(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const W = canvas.width, H = canvas.height
  const rx = Math.floor(W * 0.1), ry = Math.floor(H * 0.35)
  const rw = Math.floor(W * 0.8), rh = Math.floor(H * 0.6)

  let imageData
  try { imageData = ctx.getImageData(rx, ry, rw, rh) } catch { return null }

  const { data } = imageData
  const pixels = rw * rh
  let darkCount = 0, edgeCount = 0

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]
    if (lum < 55) darkCount++
    if (i + 4 < data.length) {
      const lumNext = 0.299 * data[i+4] + 0.587 * data[i+5] + 0.114 * data[i+6]
      if (Math.abs(lum - lumNext) > 30) edgeCount++
    }
  }

  const darkRatio = darkCount / pixels
  const edgeRatio = edgeCount / pixels
  const score = (darkRatio * 0.55) + ((1 - Math.min(edgeRatio / 0.15, 1)) * 0.45)
  if (score < 0.38) return null

  const bboxW = rw * (0.3 + darkRatio * 0.5)
  const bboxH = rh * (0.25 + darkRatio * 0.4)
  return {
    confidence: Math.min(score * 1.5, 0.94),
    bbox: { x: rx + (rw - bboxW) / 2, y: ry + (rh - bboxH) / 2, w: bboxW, h: bboxH },
    bboxArea: bboxW * bboxH,
    frameArea: W * H,
    severity: getSeverity(bboxW * bboxH, W * H),
  }
}

const SEV = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.85)', label: '⚠ HIGH RISK POTHOLE'   },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.85)',  label: '⚠ MEDIUM POTHOLE'       },
  low:    { color: '#4ade80', bg: 'rgba(74,222,128,0.85)',  label: '• LOW SEVERITY POTHOLE' },
}

function drawCorners(ctx, bbox, color) {
  const cs = 14
  const corners = [
    [bbox.x, bbox.y, 1, 1],
    [bbox.x + bbox.w, bbox.y, -1, 1],
    [bbox.x, bbox.y + bbox.h, 1, -1],
    [bbox.x + bbox.w, bbox.y + bbox.h, -1, -1],
  ]
  ctx.beginPath()
  corners.forEach(([cx, cy, dx, dy]) => {
    ctx.moveTo(cx + dx * cs, cy)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx, cy + dy * cs)
  })
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
}

export default function LiveCamera({ onPotholeDetected }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const overlayRef = useRef(null)
  const streamRef  = useRef(null)
  const rafRef     = useRef(null)
  const tfModelRef = useRef(null)
  const lastSentRef = useRef(0)
  const bufferRef  = useRef([])

  const [state, setState]           = useState('idle')
  const [error, setError]           = useState('')
  const [modelStatus, setModelStatus] = useState('unloaded')
  const [detection, setDetection]   = useState(null)
  const [sessionCount, setSessionCount] = useState(0)

  const loadModel = useCallback(async () => {
    setModelStatus('loading')
    try {
      if (!window.tf) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      if (!window.cocoSsd) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      await window.tf.ready()
      tfModelRef.current = await window.cocoSsd.load({ base: 'mobilenet_v2' })
      setModelStatus('ready')
    } catch (e) {
      console.warn('[PathAegis] TF fallback to pixel analysis:', e.message)
      setModelStatus('fallback')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d')
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)
    }
    setState('idle'); setDetection(null)
  }, [])

  const startCamera = useCallback(async () => {
    setState('starting'); setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setState('active')
      if (modelStatus === 'unloaded') loadModel()
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Camera permission denied.' : `Camera error: ${err.message}`)
      setState('error')
    }
  }, [loadModel, modelStatus])

  // Detection loop
  useEffect(() => {
    if (state !== 'active') return
    const video = videoRef.current, overlay = overlayRef.current, hidden = canvasRef.current
    if (!video || !overlay || !hidden) return
    let running = true

    const loop = async () => {
      if (!running || video.paused || video.ended) return
      const vw = video.videoWidth || 640, vh = video.videoHeight || 480
      if (hidden.width !== vw) { hidden.width = vw; hidden.height = vh }
      if (overlay.width !== vw) { overlay.width = vw; overlay.height = vh }

      hidden.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, vw, vh)

      let result = null
      if (tfModelRef.current) {
        try {
          const preds = await tfModelRef.current.detect(video)
          const road = preds.find(p => p.score > 0.5 && p.bbox[1] + p.bbox[3] > vh * 0.4 && !['person','car','truck','bus'].includes(p.class))
          if (road) {
            const [bx, by, bw, bh] = road.bbox
            result = { confidence: road.score, bbox: { x: bx, y: by, w: bw, h: bh }, bboxArea: bw * bh, frameArea: vw * vh, severity: getSeverity(bw * bh, vw * vh) }
          }
        } catch {}
      }
      const px = analyzeFrame(hidden)
      if (!result || (px && px.confidence > (result?.confidence || 0) + 0.1)) result = px

      bufferRef.current.push(result ? result.severity : null)
      if (bufferRef.current.length > 8) bufferRef.current.shift()
      const stable = bufferRef.current.filter(Boolean).length >= 4

      const oCtx = overlay.getContext('2d')
      oCtx.clearRect(0, 0, vw, vh)

      if (result && stable) {
        const { bbox, severity, confidence } = result
        const cfg = SEV[severity]

        // Bounding box
        oCtx.shadowBlur = 18; oCtx.shadowColor = cfg.color + '88'
        oCtx.strokeStyle = cfg.color; oCtx.lineWidth = 2
        oCtx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h)
        oCtx.shadowBlur = 0
        drawCorners(oCtx, bbox, cfg.color)

        // Label
        const label = `${severity.toUpperCase()}  ${Math.round(confidence * 100)}%`
        oCtx.font = 'bold 11px "Share Tech Mono", monospace'
        const tw = oCtx.measureText(label).width
        oCtx.fillStyle = cfg.bg
        oCtx.fillRect(bbox.x, Math.max(bbox.y - 26, 4), tw + 16, 20)
        oCtx.fillStyle = severity === 'medium' || severity === 'low' ? '#000' : '#fff'
        oCtx.fillText(label, bbox.x + 8, Math.max(bbox.y - 26, 4) + 14)

        setDetection({ severity, confidence })

        const now = Date.now()
        const interval = { high: 4000, medium: 7000, low: 12000 }[severity]
        if (now - lastSentRef.current > interval) {
          lastSentRef.current = now
          setSessionCount(n => n + 1)
          onPotholeDetected?.({ severity, confidence: result.confidence, bbox_area: result.bboxArea })
        }
      } else {
        setDetection(null)
      }

      // Scan zone guide
      oCtx.strokeStyle = 'rgba(124,58,237,0.15)'
      oCtx.lineWidth = 1
      oCtx.setLineDash([4, 6])
      oCtx.strokeRect(vw * 0.1, vh * 0.35, vw * 0.8, vh * 0.6)
      oCtx.setLineDash([])
      oCtx.font = '9px "Share Tech Mono", monospace'
      oCtx.fillStyle = 'rgba(124,58,237,0.3)'
      oCtx.fillText('ROAD SCAN ZONE', vw * 0.1 + 4, vh * 0.35 + 13)

      if (running) rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [state, onPotholeDetected])

  useEffect(() => () => stopCamera(), [stopCamera])

  const modelLabel = { loading: 'Loading AI…', ready: 'TF.js COCO-SSD', fallback: 'Pixel Analysis', unloaded: '' }[modelStatus]
  const modelColor = { ready: 'var(--neon-green)', fallback: 'var(--neon-yellow)', loading: 'var(--purple-glow)', unloaded: '' }[modelStatus]

  const activeDet = detection ? SEV[detection.severity] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '0.05em' }}>
            Live Detection
          </span>
          {state === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neon-red)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-red)', display: 'inline-block', animation: 'blink 0.8s infinite' }} />
              REC
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {modelLabel && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: modelColor, background: modelColor + '14', border: `1px solid ${modelColor}30`, padding: '2px 8px', borderRadius: 99 }}>
              {modelLabel}
            </span>
          )}
          {state === 'active' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {sessionCount} sent
            </span>
          )}
        </div>
      </div>

      {/* Video box */}
      <div style={{
        flex: 1, position: 'relative',
        background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden',
        border: activeDet ? `1.5px solid ${activeDet.color}` : '1px solid var(--border-subtle)',
        minHeight: 320,
        transition: 'border-color 0.2s',
        boxShadow: activeDet ? `0 0 30px ${activeDet.color}33` : 'none',
      }}>
        <video ref={videoRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: state === 'active' ? 'block' : 'none' }} muted playsInline autoPlay />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas ref={overlayRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', display: state === 'active' ? 'block' : 'none' }} />

        {/* Idle */}
        {state === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--purple-mist)', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Camera inactive</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.5 }}>
                AI runs live in your browser via TensorFlow.js
              </div>
            </div>
          </div>
        )}

        {/* Starting */}
        {state === 'starting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--purple-core)', borderTopColor: 'var(--purple-glow)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Initializing camera…</span>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neon-red)', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {/* Corner guides (active) */}
        {state === 'active' && ['tl','tr','bl','br'].map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            top: pos.startsWith('t') ? 10 : 'auto', bottom: pos.startsWith('b') ? 10 : 'auto',
            left: pos.endsWith('l') ? 10 : 'auto',  right: pos.endsWith('r') ? 10 : 'auto',
            width: 14, height: 14,
            borderTop: pos.startsWith('t') ? '1.5px solid rgba(168,85,247,0.45)' : 'none',
            borderBottom: pos.startsWith('b') ? '1.5px solid rgba(168,85,247,0.45)' : 'none',
            borderLeft: pos.endsWith('l') ? '1.5px solid rgba(168,85,247,0.45)' : 'none',
            borderRight: pos.endsWith('r') ? '1.5px solid rgba(168,85,247,0.45)' : 'none',
          }} />
        ))}

        {/* Scan line */}
        {state === 'active' && <div className="scan-line" />}

        {/* Live badge */}
        {state === 'active' && (
          <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-red)', display: 'inline-block', animation: 'blink 0.8s infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#fff' }}>LIVE</span>
          </div>
        )}

        {/* Alert banner */}
        {detection && (
          <div className="pothole-alert" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: activeDet?.bg,
            color: detection.severity === 'high' ? '#fff' : '#000',
            padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, letterSpacing: '2px',
            borderRadius: 0,
          }}>
            {activeDet?.label}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        {state !== 'active' ? (
          <button
            className="btn btn-primary"
            onClick={startCamera}
            disabled={state === 'starting'}
            style={{ flex: 1, justifyContent: 'center', padding: '10px 22px' }}
          >
            {state === 'starting' ? 'Starting…' : '▶ Start Detection'}
          </button>
        ) : (
          <button
            className="btn btn-danger"
            onClick={stopCamera}
            style={{ flex: 1, justifyContent: 'center', padding: '10px 22px' }}
          >
            ⏹ Stop Camera
          </button>
        )}
      </div>

      {/* Info note */}
      <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(124,58,237,0.06)', border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          AI runs in-browser via TensorFlow.js. For production accuracy, use <span style={{ color: 'var(--purple-glow)' }}>ml/detect.py</span> with your trained YOLOv8 model.
        </span>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
