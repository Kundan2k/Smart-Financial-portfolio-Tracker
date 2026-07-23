import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import './ChartCard.css'

const fmtINR = (v) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtK   = (v) => v >= 1000 ? '₹' + (v / 1000).toFixed(0) + 'k' : '₹' + v

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <span className="ct-month">{label}</span>
      {payload.map((p, i) => (
        <div key={i} className="ct-row">
          <span className="ct-dot" style={{ background: p.fill || p.color }} />
          <span className="ct-label">{p.name}</span>
          <span className="ct-value">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyBarChart({ data, loading }) {
  const curMonth = new Date().toLocaleString('en-US', { month: 'short' })

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-eyebrow">Monthly</span>
        <h3 className="chart-title">Income vs expenses</h3>
      </div>

      {loading ? (
        <div className="chart-skeleton" style={{ height: 280 }} />
      ) : !data?.length ? (
        <div className="chart-empty">No data for this year</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap="30%" barGap={3}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#1e2c35" strokeDasharray="3 0" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#3d5a69', fontSize: 11, fontFamily: 'DM Mono' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fill: '#3d5a69', fontSize: 10, fontFamily: 'DM Mono' }}
              axisLine={false} tickLine={false} width={44}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'DM Mono', color: '#7a9aaa', paddingTop: '8px' }}
              iconType="square" iconSize={8}
            />
            <Bar dataKey="income" name="Income" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.month === curMonth ? '#00e5a0' : '#0f6e56'}
                />
              ))}
            </Bar>
            <Bar dataKey="expense" name="Expense" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.month === curMonth ? '#f87171' : '#7f1d1d'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}