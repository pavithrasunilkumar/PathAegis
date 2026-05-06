import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try { await logout() } catch (_) {}
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      height: '60px',
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, var(--purple-core), var(--neon-cyan))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>🛣️</div>
        <span
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.08em' }}
          className="glow-text"
        >PathAegis</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: 'Home', path: '/' },
          ...(user ? [{ label: 'Dashboard', path: '/dashboard' }] : []),
        ].map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: '0.06em',
              color: isActive(path) ? '#fff' : 'var(--text-secondary)',
              background: isActive(path) ? 'var(--purple-mist)' : 'transparent',
              border: isActive(path) ? '1px solid var(--border-glow)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >{label}</Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user.username}
            </span>
            <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{
              padding: '6px 16px', borderRadius: 6, textDecoration: 'none',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
              color: 'var(--text-secondary)',
              border: '1px solid transparent', transition: 'all 0.2s',
            }}>Login</Link>
            <Link to="/register">
              <button className="btn btn-primary" style={{ padding: '6px 18px', fontSize: 13 }}>
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
