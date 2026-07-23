import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const redirectTo   = location.state?.from?.pathname || '/'

  const [form, setForm]         = useState({ email: '', password: '' })
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
    if (!form.email)    errs.email    = 'Email is required'
    if (!form.password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please try again.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      {/* Left decorative panel */}
      <div className="auth-panel-left">
        <div className="auth-brand">
          <span className="auth-brand-mark">◈</span>
          PORTFOLIO
        </div>
        <div className="auth-panel-tagline">
          <h2>Your wealth,<br /><span>Clearly visible.</span></h2>
          <p>Track every position, monitor real-time P&amp;L, and stay on top of your financial goals in one place.</p>
        </div>
        <div className="auth-stats">
          <div className="auth-stat-item">
            <span className="auth-stat-num">$0</span>
            <span className="auth-stat-label">Tracked today</span>
          </div>
          <div className="auth-stat-item">
            <span className="auth-stat-num">0</span>
            <span className="auth-stat-label">Active users</span>
          </div>
          <div className="auth-stat-item">
            <span className="auth-stat-num">0ms</span>
            <span className="auth-stat-label">Avg latency</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <p className="auth-form-eyebrow">Welcome back</p>
            <h1 className="auth-form-title">Sign in</h1>
            <p className="auth-form-subtitle">
              No account?{' '}
              <Link to="/register">Create one free →</Link>
            </p>
          </div>

          {apiError && <div className="auth-error">{apiError}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                id="password" type="password" autoComplete="current-password"
                placeholder="••••••••"
                value={form.password} onChange={set('password')}
                className={errors.password ? 'error-field' : ''}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}