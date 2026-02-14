import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartDef } from '../../types'

interface ChartViewProps {
  charts: ChartDef[]
  chartImage?: string
  className?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ChartView({ charts, chartImage, className = '' }: ChartViewProps) {
  if (chartImage) {
    return (
      <div className={`flex items-center justify-center bg-surface-light p-4 ${className}`}>
        <img src={`data:image/png;base64,${chartImage}`} alt="Chart" className="max-h-80 max-w-full object-contain" />
      </div>
    )
  }

  if (charts.length === 0) return null

  return (
    <div className={`space-y-4 bg-surface-light p-4 ${className}`}>
      {charts.map((chart, idx) => (
        <ChartSingle key={idx} chart={chart} />
      ))}
    </div>
  )
}

function ChartSingle({ chart }: { chart: ChartDef }) {
  const { type, title, series, categories } = chart

  const data = series[0]?.data?.map((_v, i) => ({
    name: categories[i] ?? `${i + 1}`,
    ...series.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, [s.name]: s.data[i] }), {}),
  })) ?? []

  const commonProps = {
    data,
    margin: { top: 8, right: 8, left: 8, bottom: 8 },
  }

  if (type === 'pie') {
    const pieData = series.flatMap((s) => s.data.map((val, i) => ({ name: categories[i] ?? `${i + 1}`, value: val })))
    return (
      <div className="h-64 w-full">
        <p className="mb-2 text-sm font-medium text-gray-300">{title}</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart {...commonProps}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const chartContent = (() => {
    switch (type) {
      case 'bar':
      case 'column':
        return (
          <BarChart {...commonProps} layout={type === 'bar' ? 'vertical' : undefined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type={type === 'bar' ? 'number' : 'category'} dataKey={type === 'bar' ? (series[0]?.name ?? 'value') : 'name'} stroke="#888" />
            <YAxis type={type === 'bar' ? 'category' : 'number'} dataKey={type === 'bar' ? 'name' : undefined} stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }} />
            <Legend />
            {series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }} />
            <Legend />
            {series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} dot={{ r: 3 }} />
            ))}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }} />
            <Legend />
            {series.map((s, i) => (
              <Area key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        )
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }} />
            <Legend />
            {series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        )
    }
  })()

  return (
    <div className="h-64 w-full">
      <p className="mb-2 text-sm font-medium text-gray-300">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        {chartContent}
      </ResponsiveContainer>
    </div>
  )
}
