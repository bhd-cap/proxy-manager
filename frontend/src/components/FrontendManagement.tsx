import { useState, useEffect } from 'react'
import { Server, Plus, Edit2, Trash2 } from 'lucide-react'
import { api } from '../utils/api'

interface Frontend {
  id: number
  name: string
  bind_address: string
  bind_port: number
  mode: string
  default_backend: string
  enabled: number
  created_at: string
  updated_at: string
}

interface FrontendManagementProps {
  onNotification: (message: string, type: 'success' | 'error') => void
}

export default function FrontendManagement({ onNotification }: FrontendManagementProps) {
  const [frontends, setFrontends] = useState<Frontend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFrontend, setEditingFrontend] = useState<Frontend | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    bind_address: '',
    bind_port: 80,
    mode: 'tcp',
    default_backend: '',
    enabled: 1
  })

  const loadFrontends = async () => {
    try {
      setIsLoading(true)
      const data = await api.getFrontends()
      setFrontends(data.frontends)
    } catch (error: any) {
      onNotification(error.message || 'Failed to load frontends', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFrontends()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingFrontend) {
        await api.updateFrontend(editingFrontend.id, formData)
        onNotification('Frontend updated successfully', 'success')
      } else {
        await api.createFrontend(formData)
        onNotification('Frontend created successfully', 'success')
      }

      setShowModal(false)
      setEditingFrontend(null)
      setFormData({ name: '', bind_address: '', bind_port: 80, mode: 'tcp', default_backend: '', enabled: 1 })
      await loadFrontends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to save frontend', 'error')
    }
  }

  const handleEdit = (frontend: Frontend) => {
    setEditingFrontend(frontend)
    setFormData({
      name: frontend.name,
      bind_address: frontend.bind_address,
      bind_port: frontend.bind_port,
      mode: frontend.mode,
      default_backend: frontend.default_backend,
      enabled: frontend.enabled
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete frontend ${name}?`)) {
      return
    }

    try {
      await api.deleteFrontend(id)
      onNotification('Frontend deleted successfully', 'success')
      await loadFrontends()
    } catch (error: any) {
      onNotification(error.message || 'Failed to delete frontend', 'error')
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
          <Server size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Frontend Servers</h2>
        </div>
        <button
          onClick={() => {
            setEditingFrontend(null)
            setFormData({ name: '', bind_address: '', bind_port: 80, mode: 'tcp', default_backend: '', enabled: 1 })
            setShowModal(true)
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
          Add Frontend
        </button>
      </div>

      {showModal && (
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
              {editingFrontend ? 'Edit Frontend' : 'Add New Frontend'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Mode
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="tcp">TCP</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Bind Address
                  </label>
                  <input
                    type="text"
                    value={formData.bind_address}
                    onChange={(e) => setFormData({ ...formData, bind_address: e.target.value })}
                    style={inputStyle}
                    placeholder="0.0.0.0"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Bind Port
                  </label>
                  <input
                    type="number"
                    value={formData.bind_port}
                    onChange={(e) => setFormData({ ...formData, bind_port: parseInt(e.target.value) })}
                    style={inputStyle}
                    min={1}
                    max={65535}
                    required
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Default Backend
                  </label>
                  <input
                    type="text"
                    value={formData.default_backend}
                    onChange={(e) => setFormData({ ...formData, default_backend: e.target.value })}
                    style={inputStyle}
                    placeholder="backend_name"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.enabled === 1}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked ? 1 : 0 })}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Enabled</span>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ ...buttonStyle, background: '#475569', color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...buttonStyle, background: '#059669', color: '#ffffff' }}
                >
                  {editingFrontend ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading frontends...
        </div>
      ) : (
        <div style={{
          background: '#1e293b',
          borderRadius: '0.5rem',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Bind</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Mode</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Default Backend</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {frontends.map((frontend) => (
                <tr key={frontend.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{frontend.name}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {frontend.bind_address}:{frontend.bind_port}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{frontend.mode}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    {frontend.default_backend || '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      background: frontend.enabled ? '#065f46' : '#475569',
                      color: '#ffffff'
                    }}>
                      {frontend.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(frontend)}
                        style={{
                          ...buttonStyle,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: '#3b82f6',
                          color: '#ffffff',
                          padding: '0.375rem 0.75rem'
                        }}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(frontend.id, frontend.name)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
