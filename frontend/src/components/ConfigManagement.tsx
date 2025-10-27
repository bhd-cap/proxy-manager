import { useState, useEffect } from 'react'
import { Settings, Upload, RotateCcw, Archive, AlertTriangle } from 'lucide-react'
import { api } from '../utils/api'

interface Backup {
  id: number
  filename: string
  filepath: string
  description: string | null
  created_by: string | null
  config_hash: string | null
  created_at: string
}

interface ConfigManagementProps {
  onNotification: (message: string, type: 'success' | 'error') => void
}

export default function ConfigManagement({ onNotification }: ConfigManagementProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [showConfirmRestore, setShowConfirmRestore] = useState<number | null>(null)

  const loadBackups = async () => {
    try {
      setIsLoading(true)
      const data = await api.getBackups()
      setBackups(data.backups)
    } catch (error: any) {
      onNotification(error.message || 'Failed to load backups', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const handleApplyConfig = async () => {
    if (!confirm('This will apply the current database configuration to HAProxy and restart the service. Continue?')) {
      return
    }

    try {
      setIsApplying(true)
      const result = await api.applyConfig()
      onNotification(result.message || 'Configuration applied successfully', 'success')
      await loadBackups()
    } catch (error: any) {
      onNotification(error.message || 'Failed to apply configuration', 'error')
    } finally {
      setIsApplying(false)
    }
  }

  const handleRestoreBackup = async (backupId: number) => {
    try {
      const result = await api.restoreBackup(backupId)
      onNotification(result.message || 'Backup restored successfully', 'success')
      setShowConfirmRestore(null)
      await loadBackups()
    } catch (error: any) {
      onNotification(error.message || 'Failed to restore backup', 'error')
    }
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
          <Settings size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Configuration Management</h2>
        </div>
      </div>

      {/* Apply Configuration Section */}
      <div style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Apply Configuration
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Generate HAProxy configuration from the database and restart the service.
              A backup will be created automatically before applying changes.
            </p>
            <button
              onClick={handleApplyConfig}
              disabled={isApplying}
              style={{
                ...buttonStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: isApplying ? '#475569' : '#059669',
                color: '#ffffff',
                opacity: isApplying ? 0.5 : 1
              }}
            >
              <Upload size={16} />
              {isApplying ? 'Applying...' : 'Apply Configuration'}
            </button>
          </div>
          <div style={{
            padding: '1rem',
            background: '#7f1d1d',
            border: '1px solid #991b1b',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            maxWidth: '400px'
          }}>
            <AlertTriangle size={20} style={{ color: '#fca5a5', flexShrink: 0, marginTop: '0.125rem' }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fca5a5', marginBottom: '0.25rem' }}>
                Warning
              </div>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                This will restart HAProxy and may cause brief connection interruptions.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div style={{
        background: '#1e293b',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Archive size={20} style={{ color: '#94a3b8' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Configuration Backups</h3>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No backups found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                    Filename
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                    Description
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                    Created By
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                    Created At
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                      {backup.filename}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                      {backup.description || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                      {backup.created_by || 'System'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                      {new Date(backup.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setShowConfirmRestore(backup.id)}
                        style={{
                          ...buttonStyle,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: '#3b82f6',
                          color: '#ffffff',
                          padding: '0.375rem 0.75rem'
                        }}
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showConfirmRestore !== null && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                Confirm Restore
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Are you sure you want to restore this backup? This will replace the current HAProxy configuration
              and restart the service. A backup of the current configuration will be created before restoring.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmRestore(null)}
                style={{
                  ...buttonStyle,
                  background: '#475569',
                  color: '#ffffff'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestoreBackup(showConfirmRestore)}
                style={{
                  ...buttonStyle,
                  background: '#dc2626',
                  color: '#ffffff'
                }}
              >
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
