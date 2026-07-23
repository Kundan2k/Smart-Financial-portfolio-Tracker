import { useState, useEffect } from 'react'
import './ExpenseForm.css'

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Healthcare',
  'Shopping', 'Entertainment', 'Education', 'Investment',
  'Income', 'Other',
]

const CATEGORY_ICONS = {
  'Food & Dining':  '🍜',
  'Transport':      '🚌',
  'Housing':        '🏠',
  'Healthcare':     '💊',
  'Shopping':       '🛍',
  'Entertainment':  '🎬',
  'Education':      '📚',
  'Investment':     '📈',
  'Income':         '💰',
  'Other':          '📋',
}

const EMPTY = { amount: '', category: 'Other', description: '', date: '', type: 'expense' }

export default function ExpenseForm({ onSave, onClose, initial = null }) {
  const editing = !!initial
  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) {
      const isIncome = Number(initial.amount) > 0
      setForm({
        amount:      String(Math.abs(initial.amount)),
        category:    initial.category,
        description: initial.description || '',
        date:        initial.date,
        type:        isIncome ? 'income' : 'expense',
      })
    }
  }, [initial])

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(er => ({ ...er, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      errs.amount = 'Enter a positive amount'
    if (!form.date)
      errs.date = 'Date is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const signed = form.type === 'expense'
      ? -Math.abs(Number(form.amount))
      :  Math.abs(Number(form.amount))

    setSaving(true)
    try {
      await onSave({
        amount:      signed,
        category:    form.category,
        description: form.description || null,
        date:        form.date,
      })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      setErrors({ api: Array.isArray(detail) ? detail[0].msg : (detail || 'Save failed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ef-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ef-modal">

        <div className="ef-header">
          <div>
            <p className="ef-eyebrow">{editing ? 'Edit entry' : 'New entry'}</p>
            <h2 className="ef-title">{editing ? 'Update transaction' : 'Add transaction'}</h2>
          </div>
          <button className="ef-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {errors.api && <div className="ef-api-error">{errors.api}</div>}

        <form className="ef-form" onSubmit={handleSubmit} noValidate>

          {/* Type toggle */}
          <div className="ef-type-toggle">
            {['expense', 'income'].map(t => (
              <button
                key={t}
                type="button"
                className={`ef-type-btn ${form.type === t ? 'active' : ''} ${t}`}
                onClick={() => setForm(f => ({ ...f, type: t }))}
              >
                {t === 'expense' ? '↓ Expense' : '↑ Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="ef-field">
            <label>Amount</label>
            <div className="ef-amount-wrap">
              <span className="ef-currency">₹</span>
              <input
                type="number" min="0.01" step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={set('amount')}
                className={errors.amount ? 'error' : ''}
              />
            </div>
            {errors.amount && <span className="ef-err">{errors.amount}</span>}
          </div>

          {/* Category */}
          <div className="ef-field">
            <label>Category</label>
            <div className="ef-cat-grid">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`ef-cat-btn ${form.category === cat ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                >
                  <span className="ef-cat-icon">{CATEGORY_ICONS[cat]}</span>
                  <span className="ef-cat-name">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="ef-field">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className={errors.date ? 'error' : ''}
            />
            {errors.date && <span className="ef-err">{errors.date}</span>}
          </div>

          {/* Description */}
          <div className="ef-field">
            <label>Description <span className="ef-optional">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Swiggy order, Metro pass…"
              value={form.description}
              onChange={set('description')}
              maxLength={255}
            />
          </div>

          <div className="ef-actions">
            <button type="button" className="ef-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="ef-btn-save" disabled={saving}>
              {saving ? 'Saving…' : (editing ? 'Update' : 'Add entry')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}