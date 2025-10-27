import { useState, useEffect } from 'react'
import { LogOut, Activity, Settings, Server, Database, Users, History, Wrench } from 'lucide-react'
import { api } from '../utils/api'
import Overview from './Overview'
import FrontendManagement from './FrontendManagement'
import BackendManagement from './BackendManagement'
import Configuration from './Configuration'
import UserManagement from './UserManagement'
import ConnectionHistory from './ConnectionHistory'
import ConfigManagement from './ConfigManagement'

interface DashboardProps {
  onLogout: () => void
}

type Tab = 'overview' | 'frontends' | 'backends' | 'configuration' | 'users' | 'connections' | 'config-management'

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [statsData, configData] = await Promise.all([
        api.getStats(),
        api.getConfig()
      ])

      setStats(statsData)
      setConfig(configData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      if (err.message === 'Unauthorized') {
        onLogout()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleConfigUpdate = async (newConfig: any) => {
    try {
      await api.updateConfig(newConfig)
      await api.reloadHAProxy()
      await loadData()
      showNotification('Configuration updated successfully', 'success')
    } catch (err: any) {
      showNotification(err.message || 'Failed to update configuration', 'error')
    }
  }

  const handleServerToggle = async (backend: string, server: string, enable: boolean) => {
    try {
      await api.toggleServer(backend, server, enable)
      await loadData()
      showNotification(`Server ${enable ? 'enabled' : 'disabled'} successfully`, 'success')
    } catch (err: any) {
      showNotification(err.message || 'Failed to toggle server', 'error')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'frontends', label: 'Frontends', icon: Server },
    { id: 'backends', label: 'Backends', icon: Database },
    { id: 'connections', label: 'Connections', icon: History },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'config-management', label: 'Config Management', icon: Wrench },
    { id: 'users', label: 'Users', icon: Users },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '1rem 2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            HAProxy Manager
          </h1>
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#dc2626',
              color: '#ffffff',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: 'transparent',
                    color: isActive ? '#3b82f6' : '#94a3b8',
                    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '1rem',
          background: notification.type === 'success' ? '#065f46' : '#7f1d1d',
          border: `1px solid ${notification.type === 'success' ? '#059669' : '#991b1b'}`,
          borderRadius: '0.375rem',
          color: notification.type === 'success' ? '#a7f3d0' : '#fca5a5',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}>
          {notification.message}
        </div>
      )}

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {isLoading && !stats ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '1.25rem', color: '#94a3b8' }}>
              Loading...
            </div>
          </div>
        ) : error ? (
          <div style={{
            padding: '1rem',
            background: '#7f1d1d',
            border: '1px solid #991b1b',
            borderRadius: '0.375rem',
            color: '#fca5a5'
          }}>
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <Overview stats={stats} />}
            {activeTab === 'frontends' && (
              <FrontendManagement
                onNotification={showNotification}
              />
            )}
            {activeTab === 'backends' && (
              <BackendManagement
                onNotification={showNotification}
              />
            )}
            {activeTab === 'connections' && (
              <ConnectionHistory
                onNotification={showNotification}
              />
            )}
            {activeTab === 'configuration' && (
              <Configuration
                config={config}
                onUpdate={handleConfigUpdate}
              />
            )}
            {activeTab === 'config-management' && (
              <ConfigManagement
                onNotification={showNotification}
              />
            )}
            {activeTab === 'users' && (
              <UserManagement
                onNotification={showNotification}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
