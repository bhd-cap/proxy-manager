import { Server } from 'lucide-react'

interface FrontendsProps {
  frontends: any[]
  stats: any
}

export default function Frontends({ frontends, stats }: FrontendsProps) {
  const getFrontendStats = (name: string) => {
    if (!stats || !stats.frontends) return null
    return stats.frontends.find((f: any) => f.name === name)
  }

  if (!frontends || frontends.length === 0) {
    return (
      <div style={{
        background: '#1e293b',
        padding: '3rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        textAlign: 'center'
      }}>
        <Server size={48} color="#475569" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
          No frontends configured
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {frontends.map((frontend, index) => {
        const frontendStats = getFrontendStats(frontend.name)
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                {frontend.name}
              </h3>
              {frontendStats && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: frontendStats.status === 'OPEN' ? '#065f4620' : '#7f1d1d20',
                  color: frontendStats.status === 'OPEN' ? '#10b981' : '#ef4444',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {frontendStats.status}
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Bind Addresses
                </div>
                {frontend.binds && frontend.binds.length > 0 ? (
                  frontend.binds.map((bind: string, i: number) => (
                    <div key={i} style={{
                      color: '#e2e8f0',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem'
                    }}>
                      {bind}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    No binds configured
                  </div>
                )}
              </div>

              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Default Backend
                </div>
                <div style={{
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  {frontend.default_backend || 'None'}
                </div>
              </div>

              {frontendStats && (
                <>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Current / Total Sessions
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {frontendStats.sessions_current} / {frontendStats.sessions_total.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Request Rate
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {frontendStats.rate}/s
                    </div>
                  </div>
                </>
              )}
            </div>

            {frontendStats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #334155'
              }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Total Requests
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {frontendStats.requests_total?.toLocaleString() || 0}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Data In
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {(frontendStats.bytes_in / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Data Out
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 'bold' }}>
                    {(frontendStats.bytes_out / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
