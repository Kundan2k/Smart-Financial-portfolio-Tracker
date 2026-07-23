import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { investmentsApi } from '../api'
import Navbar from '../components/Navbar'
import InvestmentForm from '../components/InvestmentForm'
import './Portfolio.css'

/* ── constants ─────────────────────────────────────────────────────────────── */
const ASSET_ICONS = {
  'Stock': '📈', 'Crypto': '₿',  'ETF': '🗂',
  'Mutual Fund': '💼', 'Bond': '🏛', 'Real Estate': '🏠',
  'Commodity': '🥇', 'Other': '📋',
}

const PALETTE = [
  '#0ea5e9', '#00e5a0', '#f59e0b', '#f87171',
  '#a78bfa', '#34d399', '#fb923c', '#60a5fa',
]

const TYPE_FILTERS = [
  'All', 'Stock', 'Crypto', 'ETF', 'Mutual Fund',
  'Bond', 'Real Estate', 'Commodity', 'Other',
]

const fmtINR = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtINRShort = (v) => {
  const n = Number(v)
  if (n >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(2) + 'Cr'
  if (n >= 100_000)    return '₹' + (n / 100_000).toFixed(2) + 'L'
  if (n >= 1_000)      return '₹' + (n / 1_000).toFixed(1) + 'k'
  return '₹' + n.toFixed(0)
}

const fmtQty = (v) => {
  const n = Number(v)
  return n % 1 === 0
    ? n.toLocaleString('en-IN')
    : n.toLocaleString('en-IN', { maximumFractionDigits: 8 })
}

/* ── sub-components ────────────────────────────────────────────────────────── */
function SummaryCard({ label, value, sub, accent, loading }) {
  return (
    <div className={`pf-scard ${accent}`}>
      <span className="pf-scard-label">{label}</span>
      {loading
        ? <span className="pf-scard-skeleton" />
        : <>
            <span className="pf-scard-value">{value}</span>
            {sub && <span className="pf-scard-sub">{sub}</span>}
          </>
      }
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="pf-pie-tip">
      <span className="pf-tip-label">{name}</span>
      <span className="pf-tip-value">{fmtINR(value)}</span>
    </div>
  )
}

const PieLegend = ({ payload }) => (
  <ul className="pf-pie-legend">
    {payload?.map((e, i) => (
      <li key={i} className="pf-pie-leg-item">
        <span className="pf-pie-dot" style={{ background: e.color }} />
        <span>{e.value}</span>
      </li>
    ))}
  </ul>
)

/* ── main page ─────────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [sortKey,  setSortKey]  = useState('asset_name')
  const [sortDir,  setSortDir]  = useState(1)   // 1 = asc, -1 = desc

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = filter !== 'All' ? { asset_type: filter } : {}
      const res = await investmentsApi.list(params)
      setData(res.data)
    } catch {
      setError('Failed to load portfolio. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleSave = async (body) => {
    if (editing) await investmentsApi.update(editing.id, body)
    else         await investmentsApi.create(body)
    await load()
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try { await investmentsApi.remove(id); await load() }
    catch { setError('Delete failed.') }
    finally { setDeleting(null) }
  }

  const openEdit  = (inv) => { setEditing(inv); setShowForm(true) }
  const closeForm = ()    => { setShowForm(false); setEditing(null) }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(1) }
  }

  const sorted = (data?.investments ?? []).slice().sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return av.localeCompare(bv) * sortDir
    return (Number(av) - Number(bv)) * sortDir
  })

  const pieData = data?.by_type
    ? Object.entries(data.by_type).map(([name, value]) => ({ name, value: Number(value) }))
    : []

  const s    = data || { total_invested: 0, current_value: 0, total_gain_loss: 0, total_count: 0 }
  const isUp = Number(s.total_gain_loss) >= 0

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-icon muted">↕</span>
    return <span className="sort-icon">{sortDir === 1 ? '↑' : '↓'}</span>
  }

  return (
    <div className="pf-page">
      <Navbar />

      <div className="pf-inner">

        {/* ── Page header ── */}
        <div className="pf-page-header">
          <div>
            <span className="pf-eyebrow">Portfolio · Phase 5</span>
            <h1 className="pf-heading">Investments</h1>
            <p className="pf-subtitle">Track your holdings across asset classes.</p>
          </div>
          <div className="pf-header-actions">
            <Link to="/" className="pf-link-btn">← Dashboard</Link>
            <button className="pf-add-btn" onClick={() => { setEditing(null); setShowForm(true) }}>
              + Add investment
            </button>
          </div>
        </div>

        {error && <div className="pf-error">{error}</div>}

        {/* ── Summary cards ── */}
        <div className="pf-cards">
          <SummaryCard label="Total invested"  value={fmtINRShort(s.total_invested)} sub="cost basis"           accent="blue"                      loading={loading} />
          <SummaryCard label="Current value"   value={fmtINRShort(s.current_value)}  sub="Phase 6: live prices" accent="blue"                      loading={loading} />
          <SummaryCard label="Unrealised P&L"  value={fmtINRShort(Math.abs(Number(s.total_gain_loss)))}
            sub={isUp ? 'in profit' : 'in loss'}                                     accent={isUp ? 'green' : 'red'} loading={loading} />
          <SummaryCard label="Holdings"        value={String(s.total_count)}         sub="positions"            accent="amber"                     loading={loading} />
        </div>

        {/* ── Pie + Filters ── */}
        <div className="pf-mid-row">

          <div className="pf-pie-card">
            <span className="pf-section-eyebrow">Allocation</span>
            <h3 className="pf-section-title">By asset type</h3>
            {loading ? (
              <div className="pf-pie-skeleton" />
            ) : pieData.length === 0 ? (
              <div className="pf-pie-empty">No holdings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="44%" innerRadius={52} outerRadius={82}
                    paddingAngle={3} strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend content={<PieLegend />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pf-filter-card">
            <span className="pf-section-eyebrow">Filter</span>
            <h3 className="pf-section-title">By type</h3>
            <div className="pf-type-filters">
              {TYPE_FILTERS.map(t => (
                <button
                  key={t}
                  className={`pf-type-btn ${filter === t ? 'active' : ''}`}
                  onClick={() => setFilter(t)}
                >
                  {t !== 'All' && <span className="pf-tbtn-icon">{ASSET_ICONS[t]}</span>}
                  <span>{t}</span>
                  {data && t !== 'All' && (
                    <span className="pf-tbtn-count">
                      {data.investments.filter(i => i.asset_type === t).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Portfolio table ── */}
        <div className="pf-table-wrap">
          <div className="pf-table-header">
            <span className="pf-section-eyebrow">Holdings</span>
            <h3 className="pf-section-title">
              {filter === 'All' ? 'All positions' : `${filter} positions`}
              {!loading && <span className="pf-count-badge">{sorted.length}</span>}
            </h3>
          </div>

          {loading ? (
            <div className="pf-skeletons">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="pf-row-skeleton" style={{ opacity: 1 - i * 0.18 }} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="pf-empty">
              <span className="pf-empty-icon">📭</span>
              <p>No {filter !== 'All' ? filter + ' ' : ''}investments yet.</p>
              <button className="pf-empty-add" onClick={() => setShowForm(true)}>
                Add your first holding
              </button>
            </div>
          ) : (
            <div className="pf-table-scroll">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th className="pf-th-asset">
                      <button className="pf-sort-btn" onClick={() => toggleSort('asset_name')}>
                        Asset <SortIcon col="asset_name" />
                      </button>
                    </th>
                    <th>
                      <button className="pf-sort-btn" onClick={() => toggleSort('asset_type')}>
                        Type <SortIcon col="asset_type" />
                      </button>
                    </th>
                    <th className="pf-th-right">
                      <button className="pf-sort-btn pf-sort-right" onClick={() => toggleSort('quantity')}>
                        Qty <SortIcon col="quantity" />
                      </button>
                    </th>
                    <th className="pf-th-right">
                      <button className="pf-sort-btn pf-sort-right" onClick={() => toggleSort('purchase_price')}>
                        Buy price <SortIcon col="purchase_price" />
                      </button>
                    </th>
                    <th className="pf-th-right">
                      <button className="pf-sort-btn pf-sort-right" onClick={() => toggleSort('total_invested')}>
                        Invested <SortIcon col="total_invested" />
                      </button>
                    </th>
                    <th className="pf-th-right">
                      <button className="pf-sort-btn pf-sort-right" onClick={() => toggleSort('gain_loss_pct')}>
                        P&amp;L % <SortIcon col="gain_loss_pct" />
                      </button>
                    </th>
                    <th className="pf-th-center">Date</th>
                    <th className="pf-th-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(inv => {
                    const pct    = Number(inv.gain_loss_pct)
                    const isGain = pct >= 0
                    return (
                      <tr key={inv.id} className="pf-row">
                        <td className="pf-td-asset">
                          <span className="pf-asset-icon">{ASSET_ICONS[inv.asset_type] ?? '📋'}</span>
                          <div className="pf-asset-info">
                            <span className="pf-asset-name">{inv.asset_name}</span>
                            {inv.ticker && <span className="pf-ticker">{inv.ticker}</span>}
                          </div>
                        </td>
                        <td><span className="pf-type-badge">{inv.asset_type}</span></td>
                        <td className="pf-td-right pf-mono">{fmtQty(inv.quantity)}</td>
                        <td className="pf-td-right pf-mono">{fmtINR(inv.purchase_price)}</td>
                        <td className="pf-td-right pf-mono pf-highlight">{fmtINR(inv.total_invested)}</td>
                        <td className="pf-td-right">
                          <span className={`pf-pnl ${isGain ? 'up' : 'down'}`}>
                            {isGain ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                          </span>
                        </td>
                        <td className="pf-td-center pf-mono pf-muted">
                          {inv.purchase_date
                            ? new Date(inv.purchase_date + 'T00:00:00')
                                .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—'}
                        </td>
                        <td className="pf-td-center">
                          <div className="pf-row-actions">
                            <button className="pf-act-btn" onClick={() => openEdit(inv)} title="Edit">✎</button>
                            <button
                              className="pf-act-btn danger"
                              onClick={() => handleDelete(inv.id)}
                              disabled={deleting === inv.id}
                              title="Delete"
                            >
                              {deleting === inv.id ? '…' : '✕'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="pf-tfoot-row">
                    <td colSpan={4} className="pf-tfoot-label">
                      Total ({sorted.length} holdings)
                    </td>
                    <td className="pf-td-right pf-mono pf-highlight">
                      {fmtINR(sorted.reduce((s, i) => s + Number(i.total_invested), 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <p className="pf-note">
          ⚠ Current value = cost basis in Phase 5. Live market prices will be integrated in Phase 6.
        </p>

      </div>

      {showForm && (
        <InvestmentForm
          initial={editing}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}