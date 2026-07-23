import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { mlApi } from '../api'
import Navbar from '../components/Navbar'
import './Forecast.css'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtINR = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const fmtINRFull = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })

const fmtINRShort = (v) => {
  const n = Number(v)
  if (n >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(2) + ' Cr'
  if (n >= 100_000)    return '₹' + (n / 100_000).toFixed(2) + ' L'
  if (n >= 1_000)      return '₹' + (n / 1_000).toFixed(1) + 'k'
  return '₹' + n.toFixed(0)
}

const fmtK = (v) => {
  if (v >= 10_000_000) return '₹' + (v / 10_000_000).toFixed(1) + 'Cr'
  if (v >= 100_000)    return '₹' + (v / 100_000).toFixed(1) + 'L'
  if (v >= 1_000)      return '₹' + (v / 1_000).toFixed(0) + 'k'
  return '₹' + v
}

const INITIAL = {
  monthly_income:    '',
  monthly_savings:   '',
  current_portfolio: '',
}

/* ── custom tooltip ───────────────────────────────────────────────────────── */
const ForecastTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="fc-tooltip">
      <span className="fc-tt-month">{label}</span>
      <span className="fc-tt-value">{fmtINR(val)}</span>
    </div>
  )
}

/* ── metric card ──────────────────────────────────────────────────────────── */
function ForecastCard({ label, value, sub, accent, icon, loading }) {
  return (
    <div className={`fc-metric-card ${accent ?? ''}`}>
      <div className="fc-mc-top">
        <span className="fc-mc-icon">{icon}</span>
        <span className="fc-mc-label">{label}</span>
      </div>
      {loading
        ? <span className="fc-mc-skeleton" />
        : <>
            <span className="fc-mc-value">{value}</span>
            {sub && <span className="fc-mc-sub">{sub}</span>}
          </>}
    </div>
  )
}

/* ── model badge ──────────────────────────────────────────────────────────── */
function ModelBadge({ label, metrics }) {
  if (!metrics) return null
  return (
    <div className="fc-model-badge">
      <span className="fc-mb-label">{label}</span>
      <div className="fc-mb-stats">
        <div className="fc-mb-stat">
          <span className="fc-mbs-key">R²</span>
          <span className="fc-mbs-val">{metrics.r2?.toFixed(4)}</span>
        </div>
        <div className="fc-mb-stat">
          <span className="fc-mbs-key">MAE</span>
          <span className="fc-mbs-val">{fmtINRShort(metrics.mae)}</span>
        </div>
        <div className="fc-mb-stat">
          <span className="fc-mbs-key">RMSE</span>
          <span className="fc-mbs-val">{fmtINRShort(metrics.rmse)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────────────────── */
export default function Forecast() {
  const [form,       setForm]       = useState(INITIAL)
  const [errors,     setErrors]     = useState({})
  const [apiError,   setApiError]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [modelReady, setModelReady] = useState(null)  // null=checking, true, false
  const [modelInfo,  setModelInfo]  = useState(null)

  /* check model status on mount */
  useEffect(() => {
    mlApi.status()
      .then(r => setModelReady(r.data.ready))
      .catch(() => setModelReady(false))
  }, [])

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(er => ({ ...er, [field]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.monthly_income || Number(form.monthly_income) <= 0)
      errs.monthly_income = 'Enter a positive monthly income'
    if (form.monthly_savings === '' || Number(form.monthly_savings) < 0)
      errs.monthly_savings = 'Enter monthly savings (0 or more)'
    if (!form.current_portfolio || Number(form.current_portfolio) < 0)
      errs.current_portfolio = 'Enter current portfolio value (0 or more)'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setApiError('')
    setResult(null)

    try {
      const [predRes, infoRes] = await Promise.all([
        mlApi.predict({
          monthly_income:    Number(form.monthly_income),
          monthly_savings:   Number(form.monthly_savings),
          current_portfolio: Number(form.current_portfolio),
        }),
        mlApi.modelInfo().catch(() => null),
      ])
      setResult(predRes.data)
      if (infoRes) setModelInfo(infoRes.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      setApiError(typeof detail === 'string' ? detail : 'Prediction failed. Is the model trained?')
    } finally {
      setLoading(false)
    }
  }

  /* build chart data — prepend current (M0) */
  const chartData = result
    ? [
        { label: 'Now', forecast_value: Number(form.current_portfolio), isCurrent: true },
        ...result.monthly_breakdown.map(p => ({ ...p, isCurrent: false })),
      ]
    : []

  /* radar data for savings health */
  const savingsRate = form.monthly_income > 0
    ? (Number(form.monthly_savings) / Number(form.monthly_income)) * 100
    : 0

  const radarData = result
    ? [
        { metric: 'Savings Rate',   value: Math.min(savingsRate, 45) / 45 * 100 },
        { metric: 'Portfolio Size', value: Math.min(Number(form.current_portfolio) / 5_000_000, 1) * 100 },
        { metric: '6M Growth',      value: Math.min(Math.max(result.gain_pct_6m, 0), 20) / 20 * 100 },
        { metric: '12M Growth',     value: Math.min(Math.max(result.gain_pct_12m, 0), 40) / 40 * 100 },
        { metric: 'Income Level',   value: Math.min(Number(form.monthly_income) / 300_000, 1) * 100 },
      ]
    : []

  return (
    <div className="fc-page">
      <Navbar />

      <div className="fc-inner">

        {/* ── Header ── */}
        <div className="fc-page-header">
          <div>
            <span className="fc-eyebrow">ML · Phase 6 · Linear Regression</span>
            <h1 className="fc-heading">Portfolio Forecast</h1>
            <p className="fc-subtitle">
              Enter your financial inputs to predict portfolio growth over the next 6 and 12 months.
            </p>
          </div>
          <div className="fc-header-links">
            <Link to="/"          className="fc-header-link">← Dashboard</Link>
            <Link to="/portfolio" className="fc-header-link">Investments →</Link>
          </div>
        </div>

        {/* ── Model status banner ── */}
        {modelReady === false && (
          <div className="fc-status-warn">
            <span className="fc-sw-icon">⚠</span>
            <div>
              <strong>Model not trained.</strong> Run the training script first:
              <code className="fc-sw-code">python -m backend.ml.train</code>
            </div>
          </div>
        )}
        {modelReady === true && (
          <div className="fc-status-ok">
            <span>●</span> ML model ready — Linear Regression · 2,000 synthetic profiles
          </div>
        )}

        <div className="fc-layout">

          {/* ── Left: Input form ── */}
          <div className="fc-form-panel">
            <div className="fc-form-header">
              <span className="fc-form-eyebrow">Inputs</span>
              <h2 className="fc-form-title">Your financial data</h2>
            </div>

            {apiError && <div className="fc-api-error">{apiError}</div>}

            <form className="fc-form" onSubmit={handleSubmit} noValidate>

              <div className="fc-field">
                <label>Monthly income</label>
                <div className="fc-input-wrap">
                  <span className="fc-prefix">₹</span>
                  <input
                    type="number" min="1" step="1000"
                    placeholder="50,000"
                    value={form.monthly_income}
                    onChange={set('monthly_income')}
                    className={errors.monthly_income ? 'error' : ''}
                  />
                </div>
                {errors.monthly_income && <span className="fc-err">{errors.monthly_income}</span>}
                <span className="fc-hint">Your gross monthly salary / revenue</span>
              </div>

              <div className="fc-field">
                <label>Monthly savings</label>
                <div className="fc-input-wrap">
                  <span className="fc-prefix">₹</span>
                  <input
                    type="number" min="0" step="500"
                    placeholder="15,000"
                    value={form.monthly_savings}
                    onChange={set('monthly_savings')}
                    className={errors.monthly_savings ? 'error' : ''}
                  />
                </div>
                {errors.monthly_savings && <span className="fc-err">{errors.monthly_savings}</span>}
                {form.monthly_income > 0 && form.monthly_savings >= 0 && (
                  <span className="fc-savings-rate">
                    Savings rate:&nbsp;
                    <strong>{savingsRate.toFixed(1)}%</strong>
                    &nbsp;
                    <span className={savingsRate >= 20 ? 'rate-good' : savingsRate >= 10 ? 'rate-ok' : 'rate-low'}>
                      {savingsRate >= 20 ? '● Excellent' : savingsRate >= 10 ? '● Good' : '● Low'}
                    </span>
                  </span>
                )}
              </div>

              <div className="fc-field">
                <label>Current portfolio value</label>
                <div className="fc-input-wrap">
                  <span className="fc-prefix">₹</span>
                  <input
                    type="number" min="0" step="10000"
                    placeholder="5,00,000"
                    value={form.current_portfolio}
                    onChange={set('current_portfolio')}
                    className={errors.current_portfolio ? 'error' : ''}
                  />
                </div>
                {errors.current_portfolio && <span className="fc-err">{errors.current_portfolio}</span>}
                <span className="fc-hint">Total value of all your investments today</span>
              </div>

              {/* Derived features preview */}
              {form.monthly_income > 0 && form.current_portfolio > 0 && (
                <div className="fc-derived">
                  <span className="fc-derived-title">Derived features (passed to model)</span>
                  <div className="fc-derived-grid">
                    <div className="fc-derived-item">
                      <span className="fc-di-key">Savings rate</span>
                      <span className="fc-di-val">{savingsRate.toFixed(2)}%</span>
                    </div>
                    <div className="fc-derived-item">
                      <span className="fc-di-key">Income / Portfolio</span>
                      <span className="fc-di-val">
                        {(Number(form.monthly_income) / Number(form.current_portfolio)).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="fc-submit"
                disabled={loading || modelReady === false}
              >
                {loading
                  ? <><span className="fc-spinner" /> Running model…</>
                  : '▶ Run forecast'}
              </button>

            </form>

            {/* Model metadata */}
            {modelInfo && (
              <div className="fc-model-info">
                <span className="fc-mi-title">Model performance (test set)</span>
                <ModelBadge label="6-Month model"  metrics={modelInfo.metrics_6m} />
                <ModelBadge label="12-Month model" metrics={modelInfo.metrics_12m} />
                <div className="fc-mi-features">
                  <span className="fc-mi-feat-title">Feature inputs</span>
                  {modelInfo.features?.map(f => (
                    <span key={f} className="fc-mi-feat">{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Results panel ── */}
          <div className="fc-results-panel">

            {!result && !loading && (
              <div className="fc-placeholder">
                <div className="fc-ph-graphic">
                  <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="5,70 25,50 45,55 65,30 85,20 115,10"
                      stroke="var(--accent-green)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                    <polyline points="5,70 25,50 45,55 65,30 85,20 115,10"
                      stroke="var(--accent-green)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="4 4" opacity="0.6"/>
                    {[5,25,45,65,85,115].map((x, i) => (
                      <circle key={i} cx={x} cy={[70,50,55,30,20,10][i]} r="3"
                        fill="var(--accent-green)" opacity="0.5"/>
                    ))}
                  </svg>
                </div>
                <p className="fc-ph-text">
                  Enter your financial data and run the forecast to see predictions.
                </p>
                <span className="fc-ph-sub">Linear Regression · 5 features · 2 targets</span>
              </div>
            )}

            {loading && (
              <div className="fc-loading-state">
                <div className="fc-loading-bars">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="fc-lb" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
                <p>Running Linear Regression models…</p>
              </div>
            )}

            {result && !loading && (
              <div className="fc-result-content">

                {/* ── Forecast metric cards ── */}
                <div className="fc-metrics-grid">
                  <ForecastCard
                    label="Current value"
                    value={fmtINRShort(form.current_portfolio)}
                    sub="your baseline today"
                    icon="🏦"
                    accent="neutral"
                  />
                  <ForecastCard
                    label="6-month forecast"
                    value={fmtINRShort(result.forecast_6m)}
                    sub={`${result.gain_pct_6m >= 0 ? '+' : ''}${result.gain_pct_6m.toFixed(2)}% gain`}
                    icon="📈"
                    accent={result.gain_pct_6m >= 0 ? 'green' : 'red'}
                  />
                  <ForecastCard
                    label="12-month forecast"
                    value={fmtINRShort(result.forecast_12m)}
                    sub={`${result.gain_pct_12m >= 0 ? '+' : ''}${result.gain_pct_12m.toFixed(2)}% gain`}
                    icon="🎯"
                    accent={result.gain_pct_12m >= 0 ? 'green' : 'red'}
                  />
                  <ForecastCard
                    label="Projected gain (12M)"
                    value={fmtINRShort(Math.abs(result.gain_12m))}
                    sub={result.gain_12m >= 0 ? 'net profit' : 'net loss'}
                    icon={result.gain_12m >= 0 ? '💰' : '📉'}
                    accent={result.gain_12m >= 0 ? 'amber' : 'red'}
                  />
                </div>

                {/* ── Area chart ── */}
                <div className="fc-chart-card">
                  <div className="fc-chart-header">
                    <span className="fc-chart-eyebrow">12-Month Projection</span>
                    <h3 className="fc-chart-title">Portfolio growth trajectory</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}
                      margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fcGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#1e2c35" strokeDasharray="3 0" />
                      <XAxis dataKey="label"
                        tick={{ fill: '#3d5a69', fontSize: 11, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis tickFormatter={fmtK}
                        tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false} width={60}
                      />
                      <Tooltip content={<ForecastTooltip />} />
                      <ReferenceLine x="M6" stroke="#0ea5e9" strokeDasharray="4 3"
                        label={{ value: '6M', fill: '#0ea5e9', fontSize: 10, fontFamily: 'DM Mono' }}
                      />
                      <Area dataKey="forecast_value" name="Portfolio Value"
                        stroke="#00e5a0" strokeWidth={2}
                        fill="url(#fcGradient)"
                        dot={(props) => {
                          const { cx, cy, payload } = props
                          if (payload.label === 'M6' || payload.label === 'Now') {
                            return <circle key={cx} cx={cx} cy={cy} r={5}
                              fill="#00e5a0" stroke="#080c0f" strokeWidth={2} />
                          }
                          return <circle key={cx} cx={cx} cy={cy} r={2.5}
                            fill="#00e5a0" opacity={0.6} />
                        }}
                        activeDot={{ r: 6, fill: '#00e5a0', stroke: '#080c0f', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Radar + breakdown ── */}
                <div className="fc-lower-row">

                  {/* Radar */}
                  <div className="fc-radar-card">
                    <div className="fc-chart-header">
                      <span className="fc-chart-eyebrow">Health score</span>
                      <h3 className="fc-chart-title">Financial profile</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1e2c35" />
                        <PolarAngleAxis dataKey="metric"
                          tick={{ fill: '#7a9aaa', fontSize: 10, fontFamily: 'DM Mono' }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="profile" dataKey="value"
                          stroke="#00e5a0" fill="#00e5a0" fillOpacity={0.15}
                          strokeWidth={1.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monthly breakdown table */}
                  <div className="fc-breakdown-card">
                    <div className="fc-chart-header">
                      <span className="fc-chart-eyebrow">Detail</span>
                      <h3 className="fc-chart-title">Month-by-month</h3>
                    </div>
                    <div className="fc-breakdown-table">
                      <div className="fc-bt-head">
                        <span>Month</span>
                        <span>Forecast value</span>
                        <span>Change</span>
                      </div>
                      {result.monthly_breakdown.map((p, i) => {
                        const prev = i === 0
                          ? Number(form.current_portfolio)
                          : result.monthly_breakdown[i - 1].forecast_value
                        const chg = p.forecast_value - prev
                        const pct = prev > 0 ? (chg / prev) * 100 : 0
                        return (
                          <div
                            key={p.month}
                            className={`fc-bt-row ${p.month === 6 ? 'milestone' : ''} ${p.month === 12 ? 'milestone final' : ''}`}
                          >
                            <span className="fc-bt-month">
                              {p.month === 6  && <span className="fc-bt-badge blue">6M</span>}
                              {p.month === 12 && <span className="fc-bt-badge green">12M</span>}
                              {p.label}
                            </span>
                            <span className="fc-bt-val">{fmtINRFull(p.forecast_value)}</span>
                            <span className={`fc-bt-chg ${chg >= 0 ? 'pos' : 'neg'}`}>
                              {chg >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* ── Disclaimer ── */}
                <p className="fc-disclaimer">
                  ⚠ These forecasts are generated by a Linear Regression model trained on
                  synthetic data. They are for informational purposes only and do not
                  constitute financial advice. Actual returns depend on market conditions
                  and individual circumstances.
                </p>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}