import { Database, Power, PowerOff } from 'lucide-react'

interface BackendsProps {
  backends: any[]
  stats: any
  onServerToggle: (backend: string, server: string, enable: boolean) => void
}

export default function Backends({ backends, stats, onServerToggle }: BackendsProps) {
  const getBackendStats = (name: string) => {
    if (!stats || !stats.backends) return null
    return stats.backends.find((b: any) => b.name === name)
  }

  const getServerStats = (backendName: string, serverName: string) => {
    if (!stats || !stats.servers) return null
    return stats.servers.find((s: any) => s.backend === backendName && s.name === serverName)
  }

  if (!backends || backends.length === 0) {
    return (
      <div style={{
        background: '#1e293b',
        padding: '3rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        textAlign: 'center'
      }}>
        <Database size={48} color="#475569" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
          No backends configured
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {backends.map((backend, index) => {
        const backendStats = getBackendStats(backend.name)
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
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {backend.name}
                </h3>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Balance: {backend.balance || 'roundrobin'}
                </span>
              </div>
              {backendStats && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: backendStats.status === 'UP' ? '#065f4620' : '#7f1d1d20',
                  color: backendStats.status === 'UP' ? '#10b981' : '#ef4444',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {backendStats.status}
                </span>
              )}
            </div>

            {backendStats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Current / Total Sessions
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {backendStats.sessions_current} / {backendStats.sessions_total.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Active / Backup Servers
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {backendStats.active_servers} / {backendStats.backup_servers}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Queue
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {backendStats.queue_current}
                  </div>
                </div>
              </div>
            )}

            {/* Servers */}
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '500',
                marginBottom: '0.75rem',
                color: '#94a3b8'
              }}>
                Servers
              </h4>

              {backend.servers && backend.servers.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Name
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Address
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Status
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Sessions
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Weight
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {backend.servers.map((server: any, serverIndex: number) => {
                        const serverStats = getServerStats(backend.name, server.name)
                        const isUp = serverStats?.status?.includes('UP')
                        return (
                          <tr key={serverIndex} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '0.75rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                              {server.name}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                              {server.host}:{server.port}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {serverStats ? (
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  background: isUp ? '#065f4620' : '#7f1d1d20',
                                  color: isUp ? '#10b981' : '#ef4444',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500'
                                }}>
                                  {serverStats.status}
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>N/A</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e2e8f0' }}>
                              {serverStats ? `${serverStats.sessions_current}/${serverStats.sessions_total}` : 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#e2e8f0' }}>
                              {serverStats?.weight || 1}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {serverStats && (
                                <button
                                  onClick={() => onServerToggle(backend.name, server.name, !isUp)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.5rem 0.75rem',
                                    background: isUp ? '#7f1d1d' : '#065f46',
                                    color: '#ffffff',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}
                                  title={isUp ? 'Disable server' : 'Enable server'}
                                >
                                  {isUp ? <PowerOff size={14} /> : <Power size={14} />}
                                  {isUp ? 'Disable' : 'Enable'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  No servers configured
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
