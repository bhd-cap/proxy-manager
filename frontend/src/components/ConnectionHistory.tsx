import { useState, useEffect } from 'react'
import { Activity, Filter } from 'lucide-react'
import { api } from '../utils/api'

interface Connection {
  id: number
  server_name: string
  server_type: string
  client_ip: string
  session_id: string | null
  status: string | null
  bytes_in: number
  bytes_out: number
  connected_at: string
  disconnected_at: string | null
}

interface ConnectionHistoryProps {
  onNotification: (message: string, type: 'success' | 'error') => void
}

export default function ConnectionHistory({ onNotification }: ConnectionHistoryProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    serverName: '',
    serverType: '',
    limit: 100
  })
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  const loadConnections = async () => {
    try {
      setIsLoading(true)
      const data = showActiveOnly
        ? await api.getActiveConnections()
        : await api.getConnectionHistory(
            filter.serverName || undefined,
            filter.serverType || undefined,
            filter.limit
          )
      setConnections(data.connections)
    } catch (error: any) {
      onNotification(error.message || 'Failed to load connection history', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
    const interval = setInterval(loadConnections, 5000)
    return () => clearInterval(interval)
  }, [filter, showActiveOnly])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)

    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const inputStyle = {
    padding: '0.5rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.375rem',
    color: '#e2e8f0',
    fontSize: '0.875rem'
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Connection History</h2>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={18} style={{ color: '#94a3b8' }} />
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Filters</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Server Name
            </label>
            <input
              type="text"
              value={filter.serverName}
              onChange={(e) => setFilter({ ...filter, serverName: e.target.value })}
              placeholder="Filter by server name"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Server Type
            </label>
            <select
              value={filter.serverType}
              onChange={(e) => setFilter({ ...filter, serverType: e.target.value })}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="">All Types</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Limit
            </label>
            <input
              type="number"
              value={filter.limit}
              onChange={(e) => setFilter({ ...filter, limit: parseInt(e.target.value) })}
              min={10}
              max={1000}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              Status
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                style={{ width: '1rem', height: '1rem' }}
              />
              <span style={{ fontSize: '0.875rem' }}>Active only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Connections Table */}
      {isLoading && connections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading connection history...
        </div>
      ) : connections.length === 0 ? (
        <div style={{
          background: '#1e293b',
          borderRadius: '0.5rem',
          border: '1px solid #334155',
          padding: '2rem',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          No connections found
        </div>
      ) : (
        <div style={{
          background: '#1e293b',
          borderRadius: '0.5rem',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Client IP
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Server
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Bytes In
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Bytes Out
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Connected
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                      {conn.client_ip}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {conn.server_name}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        background: conn.server_type === 'frontend' ? '#1e40af' : '#065f46',
                        color: '#ffffff'
                      }}>
                        {conn.server_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        background: conn.disconnected_at ? '#475569' : '#059669',
                        color: '#ffffff'
                      }}>
                        {conn.disconnected_at ? 'Closed' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {formatBytes(conn.bytes_in)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {formatBytes(conn.bytes_out)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                      {new Date(conn.connected_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {formatDuration(conn.connected_at, conn.disconnected_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
