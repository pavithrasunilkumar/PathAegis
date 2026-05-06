import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const features = [
  { icon: '🎯', title: 'High-Accuracy Detection', desc: 'YOLOv8 with confidence threshold ≥ 0.6 ensures zero false positives in real-world conditions.' },
  { icon: '📡', title: 'Real-Time Processing', desc: 'Live webcam feed processed frame-by-frame. Detections fire only when a pothole is visible.' },
  { icon: '🗺️', title: 'Smart Geo Mapping', desc: 'Every pothole is geo-tagged and visualised on an interactive Leaflet map, colour-coded by severity.' },
  { icon: '⚡', title: 'Instant Alerts', desc: 'Visual and on-screen alerts trigger the moment a pothole is confirmed by the ML pipeline.' },
  { icon: '💾', title: 'Persistent Storage', desc: 'All detections are persisted server-side and visible to every logged-in user.' },
  { icon: '🔒', title: 'Secure Auth', desc: 'Session-based authentication protects the dashboard and data endpoints.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Hero */}
      <section style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '60px 24px',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'linear-gradient(var(--border-glow) 1px, transparent 1px), linear-gradient(90deg, var(--border-glow) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

        {/* Purple glow orb */}
        <div style={{
          position: 'absolute',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <div className="fade-in" style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: 760 }}>
          {/* Live badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 99,
            background: 'rgba(124,58,237,0.1)', border: '1px solid var(--border-glow)',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple-glow)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--neon-green)', display: 'inline-block',
              boxShadow: '0 0 8px var(--neon-green)',
            }} />
            AI-Powered Road Safety System
          </div>

          {/* Main title */}
          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.05, marginBottom: 20 }}>
            <span className="glow-text">PathAegis</span>
          </h1>

          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 300 }}>
            Protecting the road ahead
          </p>

          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.8 }}>
            Real-time pothole detection using YOLOv8 deep learning, live camera feeds, and intelligent geo-mapping — built for infrastructure monitoring at scale.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 15, padding: '14px 32px' }}
              onClick={() => navigate(user ? '/dashboard' : '/register')}
            >
              {user ? 'Open Dashboard' : 'Get Started Free'}
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: 15, padding: '14px 32px' }}
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 56, flexWrap: 'wrap' }}>
            {[
              { value: '≥80%', label: 'Precision' },
              { value: '0.6', label: 'Conf. Threshold' },
              { value: 'YOLOv8', label: 'Model' },
              { value: 'Live', label: 'Detection' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.8rem',
                  fontWeight: 700, color: 'var(--purple-glow)',
                }}>{s.value}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Features */}
      <section id="about" style={{ padding: '80px 24px', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: '2.4rem', marginBottom: 12 }}>System Capabilities</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
              Every component engineered for reliability, accuracy, and real-world deployment.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {features.map((f) => (
              <div key={f.title} className="glass glass-hover" style={{ padding: '28px 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section style={{ padding: '72px 24px', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 40 }}>How It Works</h2>
          <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { n: '01', label: 'Log In', sub: 'Create a free account' },
              { n: '02', label: 'Open Dashboard', sub: 'Your command centre' },
              { n: '03', label: 'Run Detector', sub: 'Start the camera AI' },
              { n: '04', label: 'Map Updates', sub: 'Live pothole markers' },
            ].map((step, i) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '24px 28px', textAlign: 'center',
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '2rem',
                    color: 'rgba(168,85,247,0.25)', fontWeight: 700, marginBottom: 8,
                  }}>{step.n}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{step.sub}</div>
                </div>
                {i < 3 && (
                  <div style={{ padding: '0 12px', color: 'rgba(168,85,247,0.3)', fontSize: 20, fontWeight: 300 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section style={{ padding: '72px 24px', background: 'var(--bg-surface)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Start protecting roads today</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          Free, open-source, and runs entirely on your local machine.
        </p>
        <button
          className="btn btn-primary"
          style={{ fontSize: 15, padding: '14px 40px' }}
          onClick={() => navigate(user ? '/dashboard' : '/register')}
        >
          {user ? 'Open Dashboard' : 'Create Free Account'}
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          PathAegis · AI Road Monitoring · Built with YOLOv8 + React + Flask
        </p>
      </footer>
    </div>
  )
}
