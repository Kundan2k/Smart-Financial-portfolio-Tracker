import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyticsApi } from '../api'
import Navbar from '../components/Navbar'
import DashboardCard from '../components/DashboardCard'
import MonthlyBarChart from '../components/MonthlyBarChart'
import CategoryPieChart from '../components/CategoryPieChart'
import CategorySpendingTable from '../components/CategorySpendingTable'
import './Dashboard.css'

const fmtINR = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })

const fmtINRShort = (v) => {
  const n = Number(v)
  if (n >= 100_000) return '₹' + (n / 100_000).toFixed(1) + 'L'
  if (n >= 1_000)   return '₹' + (n / 1_000).toFixed(1) + 'k'
  return '₹' + n.toFixed(0)
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default function Dashboard() {
  const { user } = useAuth()
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await analyticsApi.dashboard(year)
      setData(res.data)
    } catch {
      setError('Failed to load analytics. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const curMonthName = new Date().toLocaleString('en-US', { month: 'long' })

  return (
    <div className="db-page">
      <Navbar />

      <div className="db-inner">

        {/* ── Page header ── */}
        <div className="db-page-header">
          <div>
            <span className="db-eyebrow">Overview · Phase 4</span>
            <h1 className="db-heading">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="db-subtitle">Here's how your finances look for {year}.</p>
          </div>
          <div className="db-controls">
            <div className="db-year-tabs">
              {YEAR_OPTIONS.map(y => (
                <button
                  key={y}
                  className={`db-year-btn ${year === y ? 'active' : ''}`}
                  onClick={() => setYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
            <Link to="/expenses" className="db-add-link">+ Add transaction</Link>
          </div>
        </div>

        {error && <div className="db-error">{error}</div>}

        {/* ── Summary cards (6-up) ── */}
        <div className="db-cards-grid">
          <DashboardCard
            label="Net balance (all time)"
            value={loading ? '—' : fmtINR(data?.balance ?? 0)}
            accent={!loading && Number(data?.balance) >= 0 ? 'green' : 'red'}
            loading={loading}
          />
          <DashboardCard
            label="Total income (all time)"
            value={loading ? '—' : fmtINRShort(data?.total_income ?? 0)}
            sub="cumulative earnings"
            accent="green"
            loading={loading}
          />
          <DashboardCard
            label="Total expenses (all time)"
            value={loading ? '—' : fmtINRShort(data?.total_expense ?? 0)}
            sub="cumulative spending"
            accent="red"
            loading={loading}
          />
          <DashboardCard
            label={`${curMonthName} income`}
            value={loading ? '—' : fmtINR(data?.month_income ?? 0)}
            accent="blue"
            loading={loading}
          />
          <DashboardCard
            label={`${curMonthName} expenses`}
            value={loading ? '—' : fmtINR(data?.month_expense ?? 0)}
            accent="red"
            loading={loading}
          />
          <DashboardCard
            label="Total entries"
            value={loading ? '—' : String(data?.total_entries ?? 0)}
            sub="all transactions"
            accent="amber"
            loading={loading}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="db-charts-grid">
          <div className="db-chart-wide">
            <MonthlyBarChart data={data?.monthly} loading={loading} />
          </div>
          <div className="db-chart-narrow">
            <CategoryPieChart data={data?.by_category} loading={loading} />
          </div>
        </div>

        {/* ── Category spending table ── */}
        <CategorySpendingTable data={data?.by_category} loading={loading} />

        {/* ── Quick links ── */}
        <div className="db-footer-links">
          <Link to="/expenses" className="db-footer-link">
            View all transactions →
          </Link>
          <button className="db-footer-link" onClick={load}>
            Refresh data ↻
          </button>
        </div>

      </div>
    </div>
  )
}