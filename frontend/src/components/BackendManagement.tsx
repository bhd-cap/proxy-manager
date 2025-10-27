import { useState, useEffect } from 'react'
import { Database, Plus, Edit2, Trash2, Server } from 'lucide-react'
import { api } from '../utils/api'

interface BackendServer {
  id: number
  server_name: string
  address: string
  port: number
  enabled: number
  weight: number
  maxconn: number
  check_enabled: number
}

interface Backend {
  id: number
  name: string
  mode: string
  balance: string
  enabled: number
  servers: BackendServer[]
  created_at: string
  updated_at: string
}

interface BackendManagementProps {
  onNotification: (message: string, type: 'success' | 'error') => void
}

export default function BackendManagement({ onNotification }: BackendManagementProps) {
  const [backends, setBackends] = useState<Backend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBackendModal, setShowBackendModal] = useState(false)
  const [showServerModal, setShowServerModal] = useState(false)
  const [editingBackend, setEditingBackend] = useState<Backend | null>(null)
  const [selectedBackend, setSelectedBackend] = useState<string>('')
  const [backendFormData, setBackendFormData] = useState({
    name: '',
    mode: 'tcp',
    balance: 'roundrobin',
    enabled: 1
  })
  const [serverFormData, setServerFormData] = useState({
    server_name: '',
    address: '',
    port: 80,
    enabled: 1,
    weight: 1,
    maxconn: 32,
    check_enabled: 1
  })

  const loadBackends = async () => {
    try {
      setIsLoading(true)
      const data = await api.getBackends()
      setBackends(data.backends)
    } catch (error: any) {
      onNotification(error.message || 'Failed to load backends', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBackends()
  }, [])

  const handleBackendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingBackend) {
        await api.updateBackend(editingBackend.id, backendFormData)
        onNotification('Backend updated successfully', 'success')
      } else {
        await api.createBackend(backendFormData)
        onNotification('Backend created successfully', 'success')
      }

      setShowBackendModal(false)
      setEditingBackend(null)
      setBackendFormData({ name: '', mode: 'tcp', balance: 'roundrobin', enabled: 1 })
      await loadBackends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to save backend', 'error')
    }
  }

  const handleServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await api.addBackendServer(selectedBackend, serverFormData)
      onNotification('Server added successfully', 'success')
      setShowServerModal(false)
      setServerFormData({ server_name: '', address: '', port: 80, enabled: 1, weight: 1, maxconn: 32, check_enabled: 1 })
      await loadBackends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to add server', 'error')
    }
  }

  const handleDeleteBackend = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete backend ${name}? This will delete all its servers.`)) {
      return
    }

    try {
      await api.deleteBackend(id)
      onNotification('Backend deleted successfully', 'success')
      await loadBackends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to delete backend', 'error')
    }
  }

  const handleDeleteServer = async (backendName: string, serverId: number, serverName: string) => {
    if (!confirm(`Are you sure you want to delete server ${serverName}?`)) {
      return
    }

    try {
      await api.deleteBackendServer(backendName, serverId)
      onNotification('Server deleted successfully', 'success')
      await loadBackends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to delete server', 'error')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.375rem',
    color: '#e2e8f0',
    fontSize: '0.875rem'
  }

  const buttonStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer'
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
          <Database size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Backend Servers</h2>
        </div>
        <button
          onClick={() => {
            setEditingBackend(null)
            setBackendFormData({ name: '', mode: 'tcp', balance: 'roundrobin', enabled: 1 })
            setShowBackendModal(true)
          }}
          style={{
            ...buttonStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#059669',
            color: '#ffffff'
          }}
        >
          <Plus size={16} />
          Add Backend
        </button>
      </div>

      {/* Backend Modal */}
      {showBackendModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {editingBackend ? 'Edit Backend' : 'Add New Backend'}
            </h3>
            <form onSubmit={handleBackendSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={backendFormData.name}
                  onChange={(e) => setBackendFormData({ ...backendFormData, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Mode
                  </label>
                  <select
                    value={backendFormData.mode}
                    onChange={(e) => setBackendFormData({ ...backendFormData, mode: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="tcp">TCP</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Balance
                  </label>
                  <select
                    value={backendFormData.balance}
                    onChange={(e) => setBackendFormData({ ...backendFormData, balance: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="roundrobin">Round Robin</option>
                    <option value="leastconn">Least Connections</option>
                    <option value="source">Source IP</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={backendFormData.enabled === 1}
                    onChange={(e) => setBackendFormData({ ...backendFormData, enabled: e.target.checked ? 1 : 0 })}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Enabled</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowBackendModal(false)}
                  style={{ ...buttonStyle, background: '#475569', color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...buttonStyle, background: '#059669', color: '#ffffff' }}
                >
                  {editingBackend ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Modal */}
      {showServerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '600px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Add Server to {selectedBackend}
            </h3>
            <form onSubmit={handleServerSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={serverFormData.server_name}
                    onChange={(e) => setServerFormData({ ...serverFormData, server_name: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={serverFormData.address}
                    onChange={(e) => setServerFormData({ ...serverFormData, address: e.target.value })}
                    style={inputStyle}
                    placeholder="192.168.1.100"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={serverFormData.port}
                    onChange={(e) => setServerFormData({ ...serverFormData, port: parseInt(e.target.value) })}
                    style={inputStyle}
                    min={1}
                    max={65535}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Weight
                  </label>
                  <input
                    type="number"
                    value={serverFormData.weight}
                    onChange={(e) => setServerFormData({ ...serverFormData, weight: parseInt(e.target.value) })}
                    style={inputStyle}
                    min={1}
                    max={256}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Max Connections
                  </label>
                  <input
                    type="number"
                    value={serverFormData.maxconn}
                    onChange={(e) => setServerFormData({ ...serverFormData, maxconn: parseInt(e.target.value) })}
                    style={inputStyle}
                    min={1}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.75rem' }}>
                    <input
                      type="checkbox"
                      checked={serverFormData.check_enabled === 1}
                      onChange={(e) => setServerFormData({ ...serverFormData, check_enabled: e.target.checked ? 1 : 0 })}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Health Check</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.75rem' }}>
                    <input
                      type="checkbox"
                      checked={serverFormData.enabled === 1}
                      onChange={(e) => setServerFormData({ ...serverFormData, enabled: e.target.checked ? 1 : 0 })}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Enabled</span>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  style={{ ...buttonStyle, background: '#475569', color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...buttonStyle, background: '#059669', color: '#ffffff' }}
                >
                  Add Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading backends...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {backends.map((backend) => (
            <div
              key={backend.id}
              style={{
                background: '#1e293b',
                borderRadius: '0.5rem',
                border: '1px solid #334155',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {backend.name}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    Mode: {backend.mode} | Balance: {backend.balance} | Status: {backend.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setSelectedBackend(backend.name)
                      setShowServerModal(true)
                    }}
                    style={{
                      ...buttonStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: '#059669',
                      color: '#ffffff',
                      padding: '0.375rem 0.75rem'
                    }}
                  >
                    <Server size={14} />
                    Add Server
                  </button>
                  <button
                    onClick={() => handleDeleteBackend(backend.id, backend.name)}
                    style={{
                      ...buttonStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: '#dc2626',
                      color: '#ffffff',
                      padding: '0.375rem 0.75rem'
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              {backend.servers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No servers configured
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Server</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Address</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Weight</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Max Conn</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Health Check</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backend.servers.map((server) => (
                      <tr key={server.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{server.server_name}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                          {server.address}:{server.port}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>{server.weight}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>{server.maxconn}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: server.check_enabled ? '#065f46' : '#475569',
                            color: '#ffffff'
                          }}>
                            {server.check_enabled ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: server.enabled ? '#065f46' : '#475569',
                            color: '#ffffff'
                          }}>
                            {server.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteServer(backend.name, server.id, server.server_name)}
                            style={{
                              ...buttonStyle,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: '#dc2626',
                              color: '#ffffff',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
