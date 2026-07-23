import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fraudApi } from '../api'
import Navbar from '../components/Navbar'
import FraudAlerts from '../components/FraudAlerts'
import './FraudDetection.css'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const SEV_COLORS = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#f59e0b',
  low:      '#7a9aaa',
}

const SEV_ORDER = ['critical', 'high', 'medium', 'low']

/* ── model info panel ─────────────────────────────────────────────────────── */
function ModelInfoPanel({ info }) {
  if (!info) return null
  const m = info.metrics || {}
  return (
    <div className="fd-model-panel">
      <span className="fd-mp-title">Model · Isolation Forest</span>
      <div className="fd-mp-grid">
        <div className="fd-mp-item">
          <span className="fd-mp-key">Estimators</span>
          <span className="fd-mp-val">{info.n_estimators}</span>
        </div>
        <div className="fd-mp-item">
          <span className="fd-mp-key">Contamination</span>
          <span className="fd-mp-val">{(info.contamination * 100).toFixed(0)}%</span>
        </div>
        <div className="fd-mp-item">
          <span className="fd-mp-key">Precision</span>
          <span className="fd-mp-val">{m.precision?.toFixed(3)}</span>
        </div>
        <div className="fd-mp-item">
          <span className="fd-mp-key">Recall</span>
          <span className="fd-mp-val">{m.recall?.toFixed(3)}</span>
        </div>
        <div className="fd-mp-item">
          <span className="fd-mp-key">F1</span>
          <span className="fd-mp-val">{m.f1?.toFixed(3)}</span>
        </div>
        <div className="fd-mp-item">
          <span className="fd-mp-key">ROC-AUC</span>
          <span className="fd-mp-val">{m.roc_auc?.toFixed(3)}</span>
        </div>
      </div>
      <div className="fd-mp-features">
        <span className="fd-mp-feat-title">Features</span>
        {info.features?.map(f => (
          <span key={f} className="fd-mp-feat">{f.replace(/_/g, ' ')}</span>
        ))}
      </div>
    </div>
  )
}

/* ── severity bar chart ───────────────────────────────────────────────────── */
function SeverityChart({ bySeverity }) {
  if (!bySeverity || Object.keys(bySeverity).length === 0) return null

  const data = SEV_ORDER
    .filter(s => bySeverity[s] > 0)
    .map(s => ({
      name:  s.charAt(0).toUpperCase() + s.slice(1),
      count: bySeverity[s],
      color: SEV_COLORS[s],
    }))

  if (!data.length) return null

  return (
    <div className="fd-chart-card">
      <span className="fd-cc-eye">Breakdown</span>
      <h3 className="fd-cc-title">Anomalies by severity</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1e2c35" strokeDasharray="3 0" />
          <XAxis dataKey="name"
            tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false} allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: '#0e1418', border: '1px solid #2a3f4d', fontFamily: 'DM Mono', fontSize: '11px' }}
            labelStyle={{ color: '#7a9aaa' }}
            itemStyle={{ color: '#e8f4f0' }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="count" name="Count" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── category breakdown chart ─────────────────────────────────────────────── */
function CategoryChart({ byCategory }) {
  if (!byCategory || Object.keys(byCategory).length === 0) return null

  const data = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.split(' ')[0], count }))

  if (!data.length) return null

  return (
    <div className="fd-chart-card">
      <span className="fd-cc-eye">Hotspots</span>
      <h3 className="fd-cc-title">Anomalies by category</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1e2c35" strokeDasharray="3 0" />
          <XAxis dataKey="name"
            tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
            axisLine={false} tickLine={false} allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: '#0e1418', border: '1px solid #2a3f4d', fontFamily: 'DM Mono', fontSize: '11px' }}
            labelStyle={{ color: '#7a9aaa' }}
            itemStyle={{ color: '#e8f4f0' }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="count" name="Count" fill="#fb923c" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────────────────── */
export default function FraudDetection() {
  const [modelReady, setModelReady] = useState(null)   // null | true | false
  const [modelInfo,  setModelInfo]  = useState(null)
  const [scanData,   setScanData]   = useState(null)
  const [scanning,   setScanning]   = useState(false)
  const [error,      setError]      = useState('')
  const [limit,      setLimit]      = useState(100)
  const [catFilter,  setCatFilter]  = useState('')
  const [hasScanned, setHasScanned] = useState(false)

  /* check model on mount */
  useEffect(() => {
    fraudApi.status()
      .then(r => setModelReady(r.data.ready))
      .catch(() => setModelReady(false))
  }, [])

  /* run scan */
  const runScan = useCallback(async () => {
    if (!modelReady) return
    setScanning(true)
    setError('')
    try {
      const params = { limit }
      if (catFilter) params.category = catFilter
      const [scanRes, infoRes] = await Promise.all([
        fraudApi.scanExpenses(params),
        modelInfo ? Promise.resolve(null) : fraudApi.modelInfo().catch(() => null),
      ])
      setScanData(scanRes.data)
      if (infoRes) setModelInfo(infoRes.data)
      setHasScanned(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Scan failed. Is the model trained?')
    } finally {
      setScanning(false)
    }
  }, [modelReady, limit, catFilter, modelInfo])

  const CATEGORIES = [
    '', 'Food & Dining', 'Transport', 'Housing', 'Healthcare',
    'Shopping', 'Entertainment', 'Education', 'Investment', 'Other',
  ]

  const alerts    = scanData?.alerts    ?? []
  const summary   = scanData?.summary   ?? {}
  const scanned   = scanData?.scanned   ?? 0
  const anomalies = scanData?.anomalies ?? 0
  const topScore  = summary.top_anomaly_score ?? 0

  return (
    <div className="fd-page">
      <Navbar />

      <div className="fd-inner">

        {/* ── Page header ── */}
        <div className="fd-page-header">
          <div>
            <span className="fd-eyebrow">AI · Phase 7 · Isolation Forest</span>
            <h1 className="fd-heading">Fraud Detection</h1>
            <p className="fd-subtitle">
              Unsupervised anomaly detection on your expense transactions.
              Isolation Forest isolates unusual patterns without labelled data.
            </p>
          </div>
          <div className="fd-header-links">
            <Link to="/"         className="fd-hlink">← Dashboard</Link>
            <Link to="/expenses" className="fd-hlink">Expenses →</Link>
          </div>
        </div>

        {/* ── Status banner ── */}
        {modelReady === false && (
          <div className="fd-status-warn">
            <span>⚠</span>
            <div>
              <strong>Model not trained.</strong> Run:
              <code className="fd-code">python -m backend.fraud.train</code>
            </div>
          </div>
        )}
        {modelReady === true && !hasScanned && (
          <div className="fd-status-ok">
            <span>●</span> Isolation Forest ready — {modelInfo?.n_estimators ?? 200} estimators · {((modelInfo?.contamination ?? 0.08) * 100).toFixed(0)}% contamination rate
          </div>
        )}

        {/* ── Controls + model info ── */}
        <div className="fd-controls-row">
          <div className="fd-controls-panel">
            <span className="fd-cp-eye">Scan settings</span>
            <h2 className="fd-cp-title">Configure detection</h2>

            <div className="fd-ctrl-grid">
              <div className="fd-ctrl-field">
                <label>Transactions to scan</label>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
                  {[25, 50, 100, 200, 500].map(n => (
                    <option key={n} value={n}>{n} most recent</option>
                  ))}
                </select>
              </div>
              <div className="fd-ctrl-field">
                <label>Filter by category</label>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c || 'All categories'}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="fd-scan-btn"
              onClick={runScan}
              disabled={scanning || modelReady === false}
            >
              {scanning
                ? <><span className="fd-spinner" /> Scanning…</>
                : '🔍 Run anomaly detection'}
            </button>

            {hasScanned && scanData && (
              <div className="fd-scan-meta">
                <span>Last scan: {scanned} transactions · {anomalies} anomalies · top score {topScore.toFixed(4)}</span>
              </div>
            )}
          </div>

          <ModelInfoPanel info={modelInfo} />
        </div>

        {/* ── Charts row ── */}
        {hasScanned && !scanning && anomalies > 0 && (
          <div className="fd-charts-row">
            <SeverityChart bySeverity={summary.by_severity} />
            <CategoryChart byCategory={summary.by_category} />
          </div>
        )}

        {/* ── Alert component ── */}
        <div className="fd-alerts-wrap">
          <FraudAlerts
            alerts={alerts}
            scanned={scanned}
            anomalies={anomalies}
            summary={summary}
            loading={scanning}
            error={error}
            onRefresh={runScan}
          />
        </div>

        {/* ── How it works explainer ── */}
        <div className="fd-explainer">
          <span className="fd-exp-eye">How it works</span>
          <h3 className="fd-exp-title">Isolation Forest algorithm</h3>
          <div className="fd-exp-grid">
            <div className="fd-exp-item">
              <span className="fd-exp-num">01</span>
              <span className="fd-exp-label">Feature extraction</span>
              <span className="fd-exp-desc">Each transaction is encoded into 7 features: amount, day of week, day of month, hour, category z-score, category encoding, and is-weekend flag.</span>
            </div>
            <div className="fd-exp-item">
              <span className="fd-exp-num">02</span>
              <span className="fd-exp-label">Isolation trees</span>
              <span className="fd-exp-desc">200 random decision trees are built. Anomalies are isolated faster (fewer splits needed) because they occupy sparse, low-density regions of the feature space.</span>
            </div>
            <div className="fd-exp-item">
              <span className="fd-exp-num">03</span>
              <span className="fd-exp-label">Anomaly score</span>
              <span className="fd-exp-desc">Each transaction gets a score from 0–1. Score above threshold (≈8% contamination rate) → flagged. Higher score = more isolated = more suspicious.</span>
            </div>
            <div className="fd-exp-item">
              <span className="fd-exp-num">04</span>
              <span className="fd-exp-label">Severity + reason</span>
              <span className="fd-exp-desc">Flagged transactions are graded (low / medium / high / critical) and a human-readable reason is generated from the feature values that drove the anomaly.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}