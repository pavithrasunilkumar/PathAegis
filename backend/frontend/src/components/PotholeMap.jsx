import { useEffect, useRef } from 'react'

// Dynamic Leaflet import to avoid SSR issues
let L = null

const SEVERITY_CONFIG = {
  high:   { color: '#ef4444', glow: 'rgba(239,68,68,0.4)',   label: 'HIGH',   pulse: true },
  medium: { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  label: 'MED',    pulse: false },
  low:    { color: '#39ff14', glow: 'rgba(57,255,20,0.3)',   label: 'LOW',    pulse: false },
}

function createMarkerIcon(severity) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill="${cfg.color}" fill-opacity="0.2" stroke="${cfg.color}" stroke-width="1.5" filter="url(#glow)"/>
      <circle cx="16" cy="16" r="7" fill="${cfg.color}" filter="url(#glow)"/>
      <line x1="16" y1="30" x2="16" y2="38" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

function formatTimestamp(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString()
}

export default function PotholeMap({ potholes = [], center = [18.5204, 73.8567], zoom = 13 }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return

    const initMap = async () => {
      if (!L) {
        L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')
      }

      if (!mapRef.current) return

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Custom zoom control
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Attribution (small)
      L.control.attribution({ position: 'bottomleft', prefix: '' })
        .addAttribution('© OSM')
        .addTo(map)

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when potholes change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !L) return

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Add new markers
    potholes.forEach((p) => {
      if (!p.latitude || !p.longitude) return
      const cfg = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.low
      const icon = createMarkerIcon(p.severity)

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;min-width:180px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${cfg.color};box-shadow:0 0 6px ${cfg.color}"></div>
              <span style="font-weight:700;font-size:13px;color:${cfg.color};">${cfg.label} SEVERITY</span>
            </div>
            <div style="color:#9ca3af;font-size:11px;margin-bottom:4px;">
              📍 ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}
            </div>
            ${p.confidence ? `<div style="color:#6b7280;font-size:11px;margin-bottom:4px;">Confidence: ${(p.confidence * 100).toFixed(0)}%</div>` : ''}
            <div style="color:#6b7280;font-size:10px;border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;padding-top:8px;">
              ${formatTimestamp(p.timestamp)}
            </div>
          </div>
        `)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [potholes])

  return (
    <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
  )
}
