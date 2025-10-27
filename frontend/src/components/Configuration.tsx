import { Settings, Download, RefreshCw } from 'lucide-react'

interface ConfigurationProps {
  config: any
  onUpdate: (config: any) => void
}

export default function Configuration({ config, onUpdate }: ConfigurationProps) {
  if (!config) {
    return (
      <div style={{
        background: '#1e293b',
        padding: '3rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        textAlign: 'center'
      }}>
        <Settings size={48} color="#475569" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
          No configuration available
        </p>
      </div>
    )
  }

  const generateConfigText = () => {
    let text = '# HAProxy Configuration\n\n'

    // Global section
    if (config.global) {
      text += 'global\n'
      config.global.split('\n').forEach((line: string) => {
        if (line.trim()) text += `    ${line.trim()}\n`
      })
      text += '\n'
    }

    // Defaults section
    if (config.defaults) {
      text += 'defaults\n'
      config.defaults.split('\n').forEach((line: string) => {
        if (line.trim()) text += `    ${line.trim()}\n`
      })
      text += '\n'
    }

    // Frontends
    if (config.frontends && config.frontends.length > 0) {
      config.frontends.forEach((frontend: any) => {
        text += `frontend ${frontend.name}\n`
        if (frontend.binds) {
          frontend.binds.forEach((bind: string) => {
            text += `    bind ${bind}\n`
          })
        }
        if (frontend.default_backend) {
          text += `    default_backend ${frontend.default_backend}\n`
        }
        text += '\n'
      })
    }

    // Backends
    if (config.backends && config.backends.length > 0) {
      config.backends.forEach((backend: any) => {
        text += `backend ${backend.name}\n`
        text += `    balance ${backend.balance || 'roundrobin'}\n`
        if (backend.servers) {
          backend.servers.forEach((server: any) => {
            text += `    server ${server.name} ${server.host}:${server.port}`
            if (server.options) {
              text += ` ${server.options}`
            }
            text += '\n'
          })
        }
        text += '\n'
      })
    }

    return text
  }

  const handleDownload = () => {
    const configText = generateConfigText()
    const blob = new Blob([configText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'haproxy.cfg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          HAProxy Configuration
        </h2>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: '#ffffff',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <Download size={16} />
          Download Config
        </button>
      </div>

      <div style={{
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155'
      }}>
        <pre style={{
          color: '#e2e8f0',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          overflow: 'auto',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {generateConfigText()}
        </pre>
      </div>

      {/* Configuration Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        <div style={{
          background: '#1e293b',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #334155'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Frontends
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {config.frontends?.length || 0}
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #334155'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Backends
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {config.backends?.length || 0}
          </div>
        </div>

        <div style={{
          background: '#1e293b',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #334155'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Total Servers
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {config.backends?.reduce((total: number, backend: any) => {
              return total + (backend.servers?.length || 0)
            }, 0) || 0}
          </div>
        </div>
      </div>

      {/* Warning Note */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#78350f20',
        border: '1px solid #92400e',
        borderRadius: '0.5rem',
        color: '#fbbf24'
      }}>
        <strong>Note:</strong> This is a read-only view of the HAProxy configuration.
        To modify the configuration, edit the HAProxy config file directly at
        <code style={{
          padding: '0.125rem 0.375rem',
          background: '#0f172a',
          borderRadius: '0.25rem',
          margin: '0 0.25rem'
        }}>
          /etc/haproxy/haproxy.cfg
        </code>
        and reload HAProxy.
      </div>
    </div>
  )
}
