import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import StatCard from '../components/StatCard.jsx'
import './Home.css'

const MOCK_STATS = [
  { label: 'Total Value',    value: '$0.00',  change: null },
  { label: 'Today\'s P&L',  value: '$0.00',  change: '0.00%', positive: true },
  { label: 'Total Return',  value: '0.00%',  change: null },
  { label: 'Assets Tracked', value: '0',     change: null },
]

const MOCK_HOLDINGS = [
  { ticker: 'AAPL', name: 'Apple Inc.',       qty: 0, avg: 0, current: 0 },
  { ticker: 'TSLA', name: 'Tesla Inc.',        qty: 0, avg: 0, current: 0 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.',      qty: 0, avg: 0, current: 0 },
]

export default function Home() {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="home">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-grid" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" style={{ background: apiStatus === 'online' ? 'var(--accent-green)' : apiStatus === 'offline' ? '#f87171' : 'var(--accent-amber)' }} />
            <span className="badge-text">API {apiStatus}</span>
          </div>
          <h1 className="hero-title">
            Track Your<br />
            <span className="hero-title-accent">Financial Portfolio</span><br />
            In Real Time
          </h1>
          <p className="hero-subtitle">
            Monitor holdings, track performance, and gain insights across all your investments in one unified dashboard.
          </p>
          <div className="hero-actions">
            <button className="btn-primary">Get Started</button>
            <button className="btn-ghost">View Demo →</button>
          </div>
        </div>
        <div className="hero-ticker-tape">
          {['AAPL +0.00%', 'TSLA +0.00%', 'NVDA +0.00%', 'MSFT +0.00%', 'AMZN +0.00%', 'GOOGL +0.00%'].map((t, i) => (
            <span key={i} className="ticker-item">{t}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Overview</span>
            <h2 className="section-title">Portfolio Summary</h2>
          </div>
          <div className="stats-grid">
            {MOCK_STATS.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Holdings Table */}
      <section className="holdings-section">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Holdings</span>
            <h2 className="section-title">Your Positions</h2>
            <button className="btn-add">+ Add Position</button>
          </div>
          <div className="table-wrap">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Avg Cost</th>
                  <th>Current</th>
                  <th>P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HOLDINGS.map(h => (
                  <tr key={h.ticker}>
                    <td><span className="ticker-badge">{h.ticker}</span></td>
                    <td className="name-cell">{h.name}</td>
                    <td className="mono">{h.qty}</td>
                    <td className="mono">${h.avg.toFixed(2)}</td>
                    <td className="mono">${h.current.toFixed(2)}</td>
                    <td className="mono empty">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-hint">Connect your API to start tracking live prices.</p>
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 Folio · Phase 1 Build</span>
        <span className="footer-stack">React + Vite · FastAPI · PostgreSQL</span>
      </footer>
    </div>
  )
}
