import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const PASSWORD_RULES = [
  { label: '8+ characters',   test: v => v.length >= 8 },
  { label: 'One letter',      test: v => /[A-Za-z]/.test(v) },
  { label: 'One number',      test: v => /\d/.test(v) },
]

function PasswordStrength({ password }) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  const colors = ['#f87171', '#f87171', '#f59e0b', '#00e5a0']
  if (!password) return null
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {PASSWORD_RULES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3,
            background: i < passed ? colors[passed] : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {PASSWORD_RULES.map((r, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: r.test(password) ? 'var(--accent-green)' : 'var(--text-muted)',
            letterSpacing: '0.06em', transition: 'color 0.2s',
          }}>
            {r.test(password) ? '✓' : '○'} {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading]   = useState(false)

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(er => ({ ...er, [field]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters'
    if (!form.email)
      errs.email = 'Email is required'
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = 'Password does not meet requirements'
    if (form.password !== form.confirm)
      errs.confirm = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await register(form.name.trim(), form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setApiError(detail.map(d => d.msg).join(' · '))
      } else {
        setApiError(detail || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      {/* Left panel */}
      <div className="auth-panel-left">
        <div className="auth-brand">
          <span className="auth-brand-mark">◈</span>
          FOLIO
        </div>
        <div className="auth-panel-tagline">
          <h2>Start tracking<br /><span>in seconds.</span></h2>
          <p>Create your free account and connect your first portfolio. No credit card required — ever.</p>
        </div>
        <div className="auth-stats">
          <div className="auth-stat-item">
            <span className="auth-stat-num">Free</span>
            <span className="auth-stat-label">Always</span>
          </div>
          <div className="auth-stat-item">
            <span className="auth-stat-num">∞</span>
            <span className="auth-stat-label">Holdings</span>
          </div>
          <div className="auth-stat-item">
            <span className="auth-stat-num">JWT</span>
            <span className="auth-stat-label">Secured</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <p className="auth-form-eyebrow">Get started</p>
            <h1 className="auth-form-title">Create account</h1>
            <p className="auth-form-subtitle">
              Already have one?{' '}
              <Link to="/login">Sign in →</Link>
            </p>
          </div>

          {apiError && <div className="auth-error">{apiError}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name" type="text" autoComplete="name"
                placeholder="Jane Smith"
                value={form.name} onChange={set('name')}
                className={errors.name ? 'error-field' : ''}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                value={form.email} onChange={set('email')}
                className={errors.email ? 'error-field' : ''}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="new-password"
                placeholder="••••••••"
                value={form.password} onChange={set('password')}
                className={errors.password ? 'error-field' : ''}
              />
              <PasswordStrength password={form.password} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm" type="password" autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirm} onChange={set('confirm')}
                className={errors.confirm ? 'error-field' : ''}
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}