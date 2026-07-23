import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import './ChartCard.css'

const PALETTE = [
  '#00e5a0', '#0ea5e9', '#f59e0b', '#f87171',
  '#a78bfa', '#34d399', '#fb923c', '#60a5fa',
  '#e879f9', '#4ade80',
]

const fmtINR = (v) =>
  '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="chart-tooltip">
      <span className="ct-label">{name}</span>
      <span className="ct-value">{fmtINR(value)}</span>
    </div>
  )
}

const renderLegend = (props) => {
  const { payload } = props
  return (
    <ul className="pie-legend">
      {payload.map((entry, i) => (
        <li key={i} className="pie-legend-item">
          <span className="pie-dot" style={{ background: entry.color }} />
          <span className="pie-legend-label">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default function CategoryPieChart({ data, loading }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-eyebrow">Breakdown</span>
        <h3 className="chart-title">Spending by category</h3>
      </div>

      {loading ? (
        <div className="chart-skeleton" style={{ height: 280 }} />
      ) : !data?.length ? (
        <div className="chart-empty">No expense data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}