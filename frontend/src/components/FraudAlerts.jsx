import { useState } from 'react'
import './FraudAlerts.css'

/* ── constants ────────────────────────────────────────────────────────────── */
const SEV_CONFIG = {
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.35)', icon: '🚨' },
  high:     { label: 'High',     color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.35)',  icon: '⚠'  },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)',   icon: '⚡' },
  low:      { label: 'Low',      color: '#7a9aaa', bg: 'rgba(122,154,170,0.08)',border: 'rgba(122,154,170,0.25)', icon: '📌' },
  normal:   { label: 'Normal',   color: '#3d5a69', bg: 'transparent',           border: 'var(--border)',          icon: '✓'  },
}

const CATEGORY_ICONS = {
  'Food & Dining':'🍜','Transport':'🚌','Housing':'🏠','Healthcare':'💊',
  'Shopping':'🛍','Entertainment':'🎬','Education':'📚','Investment':'📈',
  'Income':'💰','Other':'📋',
}

const fmtINR  = (v) =>
  '₹' + Math.abs(Number(v)).toLocaleString('en-IN', { minimumFractionDigits: 2 })

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

/* ── severity badge ───────────────────────────────────────────────────────── */
function SeverityBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.normal
  return (
    <span className="fa-sev-badge" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

/* ── score bar ────────────────────────────────────────────────────────────── */
function ScoreBar({ score }) {
  const pct   = Math.min(Math.max(score / 0.6, 0), 1) * 100
  const color = score > 0.4 ? '#f87171' : score > 0.2 ? '#fb923c' : score > 0.1 ? '#f59e0b' : '#7a9aaa'
  return (
    <div className="fa-score-bar-wrap" title={`Anomaly score: ${score.toFixed(4)}`}>
      <div className="fa-score-bar-track">
        <div className="fa-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="fa-score-num" style={{ color }}>{score.toFixed(3)}</span>
    </div>
  )
}

/* ── single alert card ────────────────────────────────────────────────────── */
function AlertCard({ alert, index }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.normal

  return (
    <div
      className={`fa-card ${alert.severity}`}
      style={{ borderLeftColor: cfg.color }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="fa-card-main">
        <div className="fa-card-left">
          <span className="fa-card-rank">#{index + 1}</span>
          <span className="fa-cat-icon">{CATEGORY_ICONS[alert.category] ?? '📋'}</span>
          <div className="fa-card-meta">
            <span className="fa-card-category">{alert.category}</span>
            {alert.description && <span className="fa-card-desc">{alert.description}</span>}
            <span className="fa-card-date">{fmtDate(alert.date)}</span>
          </div>
        </div>
        <div className="fa-card-right">
          <span className="fa-card-amount">{fmtINR(alert.amount)}</span>
          <SeverityBadge severity={alert.severity} />
          <ScoreBar score={alert.anomaly_score} />
          <button
            className="fa-expand-btn"
            onClick={e => { e.stopPropagation(); setExpanded(ex => !ex) }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fa-card-detail">
          <div className="fa-detail-grid">
            <div className="fa-detail-item">
              <span className="fa-di-key">Reason</span>
              <span className="fa-di-val fa-di-reason">{alert.reason ?? 'Pattern deviates from norms'}</span>
            </div>
            <div className="fa-detail-item">
              <span className="fa-di-key">Z-score</span>
              <span className="fa-di-val" style={{ color: alert.zscore > 3 ? '#f87171' : 'var(--text-primary)' }}>
                {alert.zscore.toFixed(2)}σ
              </span>
            </div>
            <div className="fa-detail-item">
              <span className="fa-di-key">vs. category avg</span>
              <span className="fa-di-val" style={{ color: alert.amount_vs_avg > 3 ? '#f87171' : 'var(--text-primary)' }}>
                {alert.amount_vs_avg.toFixed(2)}×
              </span>
            </div>
            <div className="fa-detail-item">
              <span className="fa-di-key">Anomaly score</span>
              <span className="fa-di-val">{alert.anomaly_score.toFixed(6)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── summary bar ──────────────────────────────────────────────────────────── */
function SummaryBar({ scanned, anomalies, summary }) {
  const sevCounts = summary?.by_severity ?? {}
  const sevOrder  = ['critical','high','medium','low']

  return (
    <div className="fa-summary-bar">
      <div className="fa-sum-stat">
        <span className="fa-sum-val">{scanned}</span>
        <span className="fa-sum-label">Transactions scanned</span>
      </div>
      <div className="fa-sum-divider" />
      <div className="fa-sum-stat">
        <span className="fa-sum-val" style={{ color: anomalies > 0 ? '#f87171' : 'var(--accent-green)' }}>
          {anomalies}
        </span>
        <span className="fa-sum-label">Anomalies detected</span>
      </div>
      <div className="fa-sum-divider" />
      <div className="fa-sum-stat">
        <span className="fa-sum-val">{summary?.anomaly_rate_pct ?? 0}%</span>
        <span className="fa-sum-label">Anomaly rate</span>
      </div>
      <div className="fa-sum-divider" />
      <div className="fa-sev-breakdown">
        {sevOrder.map(s => {
          const cnt = sevCounts[s] ?? 0
          if (!cnt) return null
          const cfg = SEV_CONFIG[s]
          return (
            <span key={s} className="fa-sev-chip"
              style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
              {cfg.icon} {cnt} {cfg.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ── main component ───────────────────────────────────────────────────────── */
export default function FraudAlerts({
  alerts    = [],
  scanned   = 0,
  anomalies = 0,
  summary   = {},
  loading   = false,
  error     = '',
  onRefresh,
}) {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [sortBy, setSortBy]                 = useState('score')

  const FILTERS = ['all','critical','high','medium','low']

  const filtered = alerts
    .filter(a => severityFilter === 'all' || a.severity === severityFilter)
    .slice()
    .sort((a, b) => {
      if (sortBy === 'score')  return b.anomaly_score - a.anomaly_score
      if (sortBy === 'amount') return Math.abs(b.amount) - Math.abs(a.amount)
      return new Date(b.date) - new Date(a.date)
    })

  return (
    <div className="fa-root">

      {/* ── Header ── */}
      <div className="fa-header">
        <div>
          <span className="fa-eyebrow">Anomaly Detection · Isolation Forest</span>
          <h2 className="fa-title">Fraud Alerts</h2>
        </div>
        <div className="fa-header-right">
          <div className="fa-sort-tabs">
            {[['score','Score'],['amount','Amount'],['date','Date']].map(([v,l]) => (
              <button key={v} className={`fa-sort-btn ${sortBy === v ? 'active' : ''}`}
                onClick={() => setSortBy(v)}>
                {l}
              </button>
            ))}
          </div>
          {onRefresh && (
            <button className="fa-refresh-btn" onClick={onRefresh}
              disabled={loading} aria-label="Refresh">
              {loading ? '⟳' : '↻'} Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ── */}
      {!loading && scanned > 0 && (
        <SummaryBar scanned={scanned} anomalies={anomalies} summary={summary} />
      )}

      {/* ── Error ── */}
      {error && <div className="fa-error"><span>⚠</span> {error}</div>}

      {/* ── Loading ── */}
      {loading && (
        <div className="fa-loading">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="fa-skeleton" style={{ opacity: 1 - i * 0.25 }} />
          ))}
          <p className="fa-loading-label">Running Isolation Forest…</p>
        </div>
      )}

      {/* ── Clean (no anomalies) ── */}
      {!loading && !error && scanned > 0 && anomalies === 0 && (
        <div className="fa-clean">
          <span className="fa-clean-icon">✅</span>
          <p>No anomalies detected across {scanned} transactions.</p>
          <span className="fa-clean-sub">All expenses are within normal patterns.</span>
        </div>
      )}

      {/* ── Severity filter + list ── */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="fa-filters">
            {FILTERS.map(f => {
              const cnt = f === 'all'
                ? alerts.length
                : alerts.filter(a => a.severity === f).length
              if (f !== 'all' && cnt === 0) return null
              const cfg = f === 'all' ? null : SEV_CONFIG[f]
              return (
                <button
                  key={f}
                  className={`fa-filter-btn ${severityFilter === f ? 'active' : ''}`}
                  style={severityFilter === f && cfg
                    ? { borderColor: cfg.color, color: cfg.color }
                    : {}}
                  onClick={() => setSeverityFilter(f)}
                >
                  {f !== 'all' && cfg?.icon} {f === 'all' ? 'All' : SEV_CONFIG[f].label} ({cnt})
                </button>
              )
            })}
          </div>
          <div className="fa-list">
            {filtered.map((alert, i) => (
              <AlertCard key={alert.transaction_id} alert={alert} index={i} />
            ))}
          </div>
        </>
      )}

      {/* ── Not scanned yet ── */}
      {!loading && !error && scanned === 0 && (
        <div className="fa-empty">
          <span className="fa-empty-icon">🔍</span>
          <p>Run a scan to detect unusual expense patterns.</p>
          <span className="fa-empty-sub">
            Uses Isolation Forest — an unsupervised anomaly detection algorithm.
          </span>
        </div>
      )}

    </div>
  )
}