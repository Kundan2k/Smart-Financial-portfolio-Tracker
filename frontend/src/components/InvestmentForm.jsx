import { useState, useEffect } from 'react'
import './InvestmentForm.css'

const ASSET_TYPES = [
  { label: 'Stock',       icon: '📈' },
  { label: 'Crypto',      icon: '₿'  },
  { label: 'ETF',         icon: '🗂' },
  { label: 'Mutual Fund', icon: '💼' },
  { label: 'Bond',        icon: '🏛' },
  { label: 'Real Estate', icon: '🏠' },
  { label: 'Commodity',   icon: '🥇' },
  { label: 'Other',       icon: '📋' },
]

const EMPTY = {
  asset_name:     '',
  asset_type:     'Stock',
  ticker:         '',
  quantity:       '',
  purchase_price: '',
  purchase_date:  '',
  notes:          '',
}

export default function InvestmentForm({ initial = null, onSave, onClose }) {
  const editing = !!initial
  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        asset_name:     initial.asset_name     ?? '',
        asset_type:     initial.asset_type     ?? 'Stock',
        ticker:         initial.ticker         ?? '',
        quantity:       String(initial.quantity ?? ''),
        purchase_price: String(initial.purchase_price ?? ''),
        purchase_date:  initial.purchase_date  ?? '',
        notes:          initial.notes          ?? '',
      })
    }
  }, [initial])

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(er => ({ ...er, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.asset_name.trim())
      errs.asset_name = 'Asset name is required'
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) <= 0)
      errs.quantity = 'Enter a positive quantity'
    if (!form.purchase_price || isNaN(form.purchase_price) || Number(form.purchase_price) <= 0)
      errs.purchase_price = 'Enter a positive price'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      await onSave({
        asset_name:     form.asset_name.trim(),
        asset_type:     form.asset_type,
        ticker:         form.ticker.trim().toUpperCase() || null,
        quantity:       Number(form.quantity),
        purchase_price: Number(form.purchase_price),
        purchase_date:  form.purchase_date || null,
        notes:          form.notes.trim() || null,
      })
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail
      setErrors({ api: Array.isArray(detail) ? detail[0].msg : (detail || 'Save failed') })
    } finally {
      setSaving(false)
    }
  }

  const selectedType = ASSET_TYPES.find(t => t.label === form.asset_type)

  return (
    <div className="if-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="if-modal">

        <div className="if-header">
          <div>
            <p className="if-eyebrow">{editing ? 'Edit holding' : 'New holding'}</p>
            <h2 className="if-title">{editing ? 'Update investment' : 'Add investment'}</h2>
          </div>
          <button className="if-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {errors.api && <div className="if-api-error">{errors.api}</div>}

        <form className="if-form" onSubmit={handleSubmit} noValidate>

          {/* Asset type picker */}
          <div className="if-field">
            <label>Asset type</label>
            <div className="if-type-grid">
              {ASSET_TYPES.map(t => (
                <button
                  key={t.label}
                  type="button"
                  className={`if-type-btn ${form.asset_type === t.label ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, asset_type: t.label }))}
                >
                  <span className="if-type-icon">{t.icon}</span>
                  <span className="if-type-name">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Ticker */}
          <div className="if-row">
            <div className="if-field if-field-grow">
              <label>Asset name</label>
              <input
                type="text"
                placeholder={
                  form.asset_type === 'Crypto' ? 'e.g. Bitcoin' :
                  form.asset_type === 'Stock'  ? 'e.g. Reliance Industries' :
                  'Asset name'
                }
                value={form.asset_name}
                onChange={set('asset_name')}
                className={errors.asset_name ? 'error' : ''}
              />
              {errors.asset_name && <span className="if-err">{errors.asset_name}</span>}
            </div>

            <div className="if-field if-field-ticker">
              <label>Ticker <span className="if-optional">(optional)</span></label>
              <input
                type="text"
                placeholder="RELIANCE"
                value={form.ticker}
                onChange={set('ticker')}
                maxLength={20}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Quantity + Price */}
          <div className="if-row">
            <div className="if-field if-field-half">
              <label>Quantity</label>
              <div className="if-input-wrap">
                <span className="if-prefix">×</span>
                <input
                  type="number" min="0" step="any"
                  placeholder="10"
                  value={form.quantity}
                  onChange={set('quantity')}
                  className={errors.quantity ? 'error' : ''}
                />
              </div>
              {errors.quantity && <span className="if-err">{errors.quantity}</span>}
            </div>

            <div className="if-field if-field-half">
              <label>Purchase price <span className="if-optional">(per unit)</span></label>
              <div className="if-input-wrap">
                <span className="if-prefix">₹</span>
                <input
                  type="number" min="0" step="any"
                  placeholder="2500.00"
                  value={form.purchase_price}
                  onChange={set('purchase_price')}
                  className={errors.purchase_price ? 'error' : ''}
                />
              </div>
              {errors.purchase_price && <span className="if-err">{errors.purchase_price}</span>}
            </div>
          </div>

          {/* Live cost basis preview */}
          {form.quantity && form.purchase_price
            && !isNaN(form.quantity) && !isNaN(form.purchase_price) && (
            <div className="if-cost-preview">
              <span className="if-cost-label">Total cost basis</span>
              <span className="if-cost-value">
                ₹{(Number(form.quantity) * Number(form.purchase_price))
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Purchase date */}
          <div className="if-field">
            <label>Purchase date <span className="if-optional">(optional)</span></label>
            <input type="date" value={form.purchase_date} onChange={set('purchase_date')} />
          </div>

          {/* Notes */}
          <div className="if-field">
            <label>Notes <span className="if-optional">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Long-term hold, part of SIP…"
              value={form.notes}
              onChange={set('notes')}
              maxLength={255}
            />
          </div>

          <div className="if-actions">
            <button type="button" className="if-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="if-btn-save" disabled={saving}>
              {saving
                ? 'Saving…'
                : editing
                  ? 'Update holding'
                  : `Add ${selectedType?.icon ?? ''} ${form.asset_type}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}