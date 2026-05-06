import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim() || !form.password) {
      setError('Both fields are required.')
      return
    }
    setLoading(true)
    try {
      await login({ username: form.username.trim(), password: form.password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-void)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'linear-gradient(var(--border-glow) 1px, transparent 1px), linear-gradient(90deg, var(--border-glow) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow blobs */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', top: '10%', left: '5%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)', bottom: '15%', right: '10%', filter: 'blur(60px)' }} />

      {/* Card */}
      <div className="glass fade-in" style={{
        width: '100%', maxWidth: 420, padding: '48px 40px',
        position: 'relative', boxShadow: 'var(--shadow-purple)',
      }}>
        <div className="scan-line" />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--purple-core), var(--neon-cyan))',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, boxShadow: '0 0 32px rgba(124,58,237,0.5)',
          }}>🛣️</div>
          <h1 className="glow-text" style={{ fontSize: '2.4rem', marginBottom: 4 }}>PathAegis</h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em' }}>
            PROTECTING THE ROAD AHEAD
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              Username
            </label>
            <input
              className="input"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              Password
            </label>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 6, color: 'var(--neon-red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 22px' }}>
            {loading ? 'Authenticating…' : 'Access System'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          New user?{' '}
          <span
            onClick={() => navigate('/register')}
            style={{ color: 'var(--neon-cyan)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Create account
          </span>
        </p>
      </div>
    </div>
  )
}
