import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { roadAPI } from '../utils/api'
import PotholeMap from '../components/PotholeMap'
import LiveCamera from '../components/LiveCamera'

const POLL_INTERVAL = 6000

export default function Dashboard() {
  const { user } = useAuth()
  const [potholes, setPotholes]   = useState([])
  const [stats, setStats]         = useState({ total: 0, high: 0, medium: 0, low: 0 })
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [newAlert, setNewAlert]   = useState(null)
  const prevTotal = useRef(0)
  const pollRef   = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        roadAPI.getPotholes({ limit: 300 }),
        roadAPI.getStats(),
      ])
      const pts = pRes.data.potholes
      const st  = sRes.data

      if (prevTotal.current > 0 && pts.length > prevTotal.current && pts[0]) {
        setNewAlert({
          severity: pts[0].severity,
          coords: `${pts[0].latitude?.toFixed(4)}, ${pts[0].longitude?.toFixed(4)}`,
        })
        setTimeout(() => setNewAlert(null), 5000)
      }
      prevTotal.current = pts.length
      setPotholes(pts)
      setStats(st)
      setConnected(true)
      setLastUpdate(new Date())
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setTimeout(() => setRefreshing(false), 700)
  }

  const handlePotholeDetected = useCallback(async ({ severity, confidence, bbox_area }) => {
    const lat = 18.5204 + (Math.random() - 0.5) * 0.018
    const lng = 73.8567 + (Math.random() - 0.5) * 0.018
    try {
      await roadAPI.reportPothole({ latitude: lat, longitude: lng, severity, confidence, bbox_area })
      fetchData()
    } catch (e) {
      console.warn('Backend unreachable:', e.message)
    }
  }, [fetchData])

  const SEV_COLOR = { high: 'var(--neon-red)', medium: 'var(--neon-yellow)', low: 'var(--neon-green)' }
  const SEV_BG    = { high: 'rgba(248,113,113,0.15)', medium: 'rgba(251,191,36,0.15)', low: 'rgba(74,222,128,0.15)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', paddingTop: '60px' }}>

      {/* Alert toast */}
      {newAlert && (
        <div style={{
          position: 'fixed', top: 70, right: 20, zIndex: 9999,
          background: SEV_BG[newAlert.severity],
          border: `1px solid ${SEV_COLOR[newAlert.severity]}`,
          color: SEV_COLOR[newAlert.severity],
          padding: '10px 18px', borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
          letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 0 24px ${SEV_COLOR[newAlert.severity]}44`,
          animation: 'fadeInUp 0.3s ease',
        }}>
          ⚠ {newAlert.severity.toUpperCase()} · {newAlert.coords}
        </div>
      )}

      {/* Sub-header */}
      <div style={{
        background: 'rgba(10,10,15,0.9)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em' }}>
            Command Center
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            {user?.username} · polling every {POLL_INTERVAL / 1000}s
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99,
            background: connected ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${connected ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: connected ? 'var(--neon-green)' : 'var(--neon-red)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: connected ? 'blink 1.4s infinite' : 'none' }} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>

          {lastUpdate && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={handleRefresh}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>

        {/* LEFT — Camera */}
        <div style={{ borderRight: '1px solid var(--border-subtle)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stat chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Total',  value: stats.total,  color: 'var(--purple-glow)' },
              { label: 'High',   value: stats.high,   color: 'var(--neon-red)'    },
              { label: 'Medium', value: stats.medium, color: 'var(--neon-yellow)' },
              { label: 'Low',    value: stats.low,    color: 'var(--neon-green)'  },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '12px 0', textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: '1.8rem', color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Camera */}
          <div style={{ flex: 1 }}>
            <LiveCamera onPotholeDetected={handlePotholeDetected} />
          </div>
        </div>

        {/* RIGHT — Map + log */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Map header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em' }}>
                Road Intelligence Map
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {potholes.length} markers · OpenStreetMap
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['var(--neon-red)','High'],['var(--neon-yellow)','Med'],['var(--neon-green)','Low']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div style={{
            flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden',
            border: '1px solid var(--border-subtle)', minHeight: 300,
          }}>
            <PotholeMap potholes={potholes} />
          </div>

          {/* Recent log */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recent Detections
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {potholes.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', padding: '10px 0' }}>
                  No detections yet — start camera to begin
                </div>
              ) : (
                potholes.slice(0, 6).map((p, i) => (
                  <div key={p.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: SEV_COLOR[p.severity] || '#555', boxShadow: `0 0 6px ${SEV_COLOR[p.severity] || '#555'}` }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>
                      {p.latitude?.toFixed(5)}, {p.longitude?.toFixed(5)}
                    </span>
                    <span className={`badge badge-${p.severity}`}>{p.severity}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
