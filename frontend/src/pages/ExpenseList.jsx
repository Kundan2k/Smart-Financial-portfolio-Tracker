import { useState, useEffect, useCallback } from 'react'
import { expensesApi } from '../api'
import ExpenseForm from '../components/ExpenseForm'
import Navbar from '../components/Navbar'
import './ExpenseList.css'

const CATEGORIES = [
  'All', 'Food & Dining', 'Transport', 'Housing', 'Healthcare',
  'Shopping', 'Entertainment', 'Education', 'Investment', 'Income', 'Other',
]

const CATEGORY_ICONS = {
  'Food & Dining': '🍜', 'Transport': '🚌', 'Housing': '🏠', 'Healthcare': '💊',
  'Shopping': '🛍', 'Entertainment': '🎬', 'Education': '📚', 'Investment': '📈',
  'Income': '💰', 'Other': '📋',
}

function fmt(amount) {
  const n = Number(amount)
  return (n < 0 ? '−' : '+') + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ExpenseList() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = catFilter !== 'All' ? { category: catFilter } : {}
      const res = await expensesApi.list(params)
      setData(res.data)
    } catch {
      setError('Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }, [catFilter])

  useEffect(() => { load() }, [load])

  const handleSave = async (body) => {
    if (editing) {
      await expensesApi.update(editing.id, body)
    } else {
      await expensesApi.create(body)
    }
    await load()
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await expensesApi.remove(id)
      await load()
    } catch {
      setError('Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const openEdit  = (tx) => { setEditing(tx); setShowForm(true) }
  const closeForm = ()   => { setShowForm(false); setEditing(null) }

  const summary = data || { income: 0, expense: 0, balance: 0, total: 0 }

  return (
    <div className="el-page">
      <Navbar />

      <div className="el-inner">

        {/* Page header */}
        <div className="el-page-header">
          <div>
            <span className="el-eyebrow">Expenses · Phase 3</span>
            <h1 className="el-heading">Transactions</h1>
          </div>
          <button className="el-btn-add" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Add entry
          </button>
        </div>

        {/* Summary cards */}
        <div className="el-summary">
          <div className="el-summary-card income">
            <span className="el-summary-label">Income</span>
            <span className="el-summary-value">
              +₹{Number(summary.income).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="el-summary-card expense">
            <span className="el-summary-label">Expenses</span>
            <span className="el-summary-value">
              −₹{Math.abs(Number(summary.expense)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`el-summary-card balance ${Number(summary.balance) >= 0 ? 'pos' : 'neg'}`}>
            <span className="el-summary-label">Balance</span>
            <span className="el-summary-value">
              {Number(summary.balance) >= 0 ? '+' : '−'}₹{Math.abs(Number(summary.balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="el-summary-card neutral">
            <span className="el-summary-label">Entries</span>
            <span className="el-summary-value">{summary.total}</span>
          </div>
        </div>

        {/* Category filter */}
        <div className="el-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`el-filter-btn ${catFilter === cat ? 'active' : ''}`}
              onClick={() => setCatFilter(cat)}
            >
              {cat !== 'All' && <span>{CATEGORY_ICONS[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="el-error">{error}</div>}

        {/* List */}
        {loading ? (
          <div className="el-loading">
            {[...Array(5)].map((_, i) => <div key={i} className="el-skeleton" />)}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="el-empty">
            <span className="el-empty-icon">📭</span>
            <p>No transactions yet.</p>
            <button className="el-btn-add-sm" onClick={() => setShowForm(true)}>
              Add your first entry
            </button>
          </div>
        ) : (
          <div className="el-list">
            {data?.items?.map(tx => (
              <div key={tx.id} className={`el-row ${Number(tx.amount) >= 0 ? 'income-row' : 'expense-row'}`}>
                <div className="el-row-icon">
                  {CATEGORY_ICONS[tx.category] || '📋'}
                </div>
                <div className="el-row-meta">
                  <span className="el-row-category">{tx.category}</span>
                  {tx.description && <span className="el-row-desc">{tx.description}</span>}
                  <span className="el-row-date">{fmtDate(tx.date)}</span>
                </div>
                <div className="el-row-amount">
                  <span className={Number(tx.amount) >= 0 ? 'pos' : 'neg'}>{fmt(tx.amount)}</span>
                </div>
                <div className="el-row-actions">
                  <button className="el-action-btn" onClick={() => openEdit(tx)} title="Edit">✎</button>
                  <button
                    className="el-action-btn danger"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    title="Delete"
                  >
                    {deleting === tx.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          initial={editing}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}