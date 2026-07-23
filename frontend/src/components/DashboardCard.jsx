import './DashboardCard.css'

/**
 * @param {string}  label
 * @param {string}  value        - formatted string shown large
 * @param {string}  [sub]        - small line below value
 * @param {string}  [accent]     - 'green' | 'red' | 'blue' | 'amber' | ''
 * @param {boolean} [loading]
 */
export default function DashboardCard({ label, value, sub, accent = '', loading = false }) {
  return (
    <div className={`dc-card ${accent}`}>
      <span className="dc-label">{label}</span>
      {loading ? (
        <span className="dc-skeleton" />
      ) : (
        <>
          <span className="dc-value">{value}</span>
          {sub && <span className="dc-sub">{sub}</span>}
        </>
      )}
    </div>
  )
}