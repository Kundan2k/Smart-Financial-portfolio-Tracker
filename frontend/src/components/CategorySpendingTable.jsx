import './CategorySpendingTable.css'

const CATEGORY_ICONS = {
  'Food & Dining': '🍜', 'Transport': '🚌', 'Housing': '🏠',
  'Healthcare': '💊', 'Shopping': '🛍', 'Entertainment': '🎬',
  'Education': '📚', 'Investment': '📈', 'Income': '💰', 'Other': '📋',
}

const fmtINR = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })

export default function CategorySpendingTable({ data, loading }) {
  const total = data?.reduce((s, d) => s + Number(d.total), 0) || 0

  return (
    <div className="cst-card">
      <div className="cst-header">
        <span className="cst-eyebrow">Ranked</span>
        <h3 className="cst-title">Category spending</h3>
      </div>

      {loading ? (
        <div className="cst-rows">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="cst-skeleton" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="cst-empty">No expense data for this period</div>
      ) : (
        <div className="cst-rows">
          {data
            .slice()
            .sort((a, b) => Number(b.total) - Number(a.total))
            .map((row, i) => {
              const pct = total ? Math.round((Number(row.total) / total) * 100) : 0
              return (
                <div key={row.category} className="cst-row">
                  <span className="cst-rank">#{i + 1}</span>
                  <span className="cst-icon">{CATEGORY_ICONS[row.category] || '📋'}</span>
                  <div className="cst-meta">
                    <div className="cst-top">
                      <span className="cst-cat">{row.category}</span>
                      <span className="cst-amount">{fmtINR(row.total)}</span>
                    </div>
                    <div className="cst-bar-track">
                      <div className="cst-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="cst-pct">{pct}% of total</span>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}