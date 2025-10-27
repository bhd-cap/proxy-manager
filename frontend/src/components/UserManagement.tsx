import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Key } from 'lucide-react'
import { api } from '../utils/api'

interface User {
  id: number
  username: string
  created_at: string
}

interface UserManagementProps {
  onNotification: (message: string, type: 'success' | 'error') => void
}

export default function UserManagement({ onNotification }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', confirmPassword: '' })
  const [passwordChange, setPasswordChange] = useState({ password: '', confirmPassword: '' })

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await api.getUsers()
      setUsers(data.users)
    } catch (error: any) {
      onNotification(error.message || 'Failed to load users', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newUser.password !== newUser.confirmPassword) {
      onNotification('Passwords do not match', 'error')
      return
    }

    if (newUser.password.length < 6) {
      onNotification('Password must be at least 6 characters', 'error')
      return
    }

    try {
      await api.createUser(newUser.username, newUser.password)
      onNotification(`User ${newUser.username} created successfully`, 'success')
      setNewUser({ username: '', password: '', confirmPassword: '' })
      setShowAddUser(false)
      await loadUsers()
    } catch (error: any) {
      onNotification(error.message || 'Failed to create user', 'error')
    }
  }

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
      return
    }

    try {
      await api.deleteUser(username)
      onNotification(`User ${username} deleted successfully`, 'success')
      await loadUsers()
    } catch (error: any) {
      onNotification(error.message || 'Failed to delete user', 'error')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordChange.password !== passwordChange.confirmPassword) {
      onNotification('Passwords do not match', 'error')
      return
    }

    if (passwordChange.password.length < 6) {
      onNotification('Password must be at least 6 characters', 'error')
      return
    }

    try {
      await api.changePassword(showChangePassword!, passwordChange.password)
      onNotification(`Password changed successfully for ${showChangePassword}`, 'success')
      setPasswordChange({ password: '', confirmPassword: '' })
      setShowChangePassword(null)
    } catch (error: any) {
      onNotification(error.message || 'Failed to change password', 'error')
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
          <Users size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>User Management</h2>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
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
          Add User
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
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
              Add New User
            </h3>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  style={inputStyle}
                  required
                  minLength={3}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={inputStyle}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  style={inputStyle}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false)
                    setNewUser({ username: '', password: '', confirmPassword: '' })
                  }}
                  style={{
                    ...buttonStyle,
                    background: '#475569',
                    color: '#ffffff'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...buttonStyle,
                    background: '#059669',
                    color: '#ffffff'
                  }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
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
              Change Password for {showChangePassword}
            </h3>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordChange.password}
                  onChange={(e) => setPasswordChange({ ...passwordChange, password: e.target.value })}
                  style={inputStyle}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordChange.confirmPassword}
                  onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                  style={inputStyle}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(null)
                    setPasswordChange({ password: '', confirmPassword: '' })
                  }}
                  style={{
                    ...buttonStyle,
                    background: '#475569',
                    color: '#ffffff'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...buttonStyle,
                    background: '#059669',
                    color: '#ffffff'
                  }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading users...
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
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8' }}>
                  Username
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
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                    {user.username}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowChangePassword(user.username)}
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
                        <Key size={14} />
                        Change Password
                      </button>
                      {user.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
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
                      )}
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
