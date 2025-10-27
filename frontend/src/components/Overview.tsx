import { Activity, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface OverviewProps {
  stats: any
}

export default function Overview({ stats }: OverviewProps) {
  if (!stats || stats.error) {
    return (
      <div style={{
        padding: '1rem',
        background: '#7f1d1d',
        border: '1px solid #991b1b',
        borderRadius: '0.375rem',
        color: '#fca5a5'
      }}>
        {stats?.error || 'No statistics available'}
      </div>
    )
  }

  const summary = stats.summary || {
    total_sessions: 0,
    current_sessions: 0,
    bytes_in: 0,
    bytes_out: 0
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getServerCount = () => {
    const servers = stats.servers || []
    const up = servers.filter((s: any) => s.status === 'UP').length
    const down = servers.length - up
    return { up, down, total: servers.length }
  }

  const serverCount = getServerCount()

  const metrics = [
    {
      title: 'Total Sessions',
      value: summary.total_sessions.toLocaleString(),
      icon: Activity,
      color: '#3b82f6'
    },
    {
      title: 'Current Sessions',
      value: summary.current_sessions.toLocaleString(),
      icon: Users,
      color: '#8b5cf6'
    },
    {
      title: 'Data In',
      value: formatBytes(summary.bytes_in),
      icon: ArrowDownRight,
      color: '#10b981'
    },
    {
      title: 'Data Out',
      value: formatBytes(summary.bytes_out),
      icon: ArrowUpRight,
      color: '#f59e0b'
    }
  ]

  return (
    <div>
      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div
              key={index}
              style={{
                background: '#1e293b',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #334155'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  {metric.title}
                </span>
                <div style={{
                  padding: '0.5rem',
                  background: `${metric.color}20`,
                  borderRadius: '0.375rem'
                }}>
                  <Icon size={20} color={metric.color} />
                </div>
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#e2e8f0'
              }}>
                {metric.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Server Status */}
      <div style={{
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Server Status
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Total Servers
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e2e8f0' }}>
              {serverCount.total}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Servers Up
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
              {serverCount.up}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Servers Down
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
              {serverCount.down}
            </div>
          </div>
        </div>
      </div>

      {/* Frontends Overview */}
      <div style={{
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Frontends
        </h2>
        {stats.frontends && stats.frontends.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Name
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Sessions
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Requests
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.frontends.map((frontend: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem', color: '#e2e8f0' }}>
                      {frontend.name}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: frontend.status === 'OPEN' ? '#065f4620' : '#7f1d1d20',
                        color: frontend.status === 'OPEN' ? '#10b981' : '#ef4444',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {frontend.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e2e8f0' }}>
                      {frontend.sessions_current}/{frontend.sessions_total}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e2e8f0' }}>
                      {frontend.requests_total?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e2e8f0' }}>
                      {frontend.rate}/s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
            No frontends configured
          </p>
        )}
      </div>
    </div>
  )
}
