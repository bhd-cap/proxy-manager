import { useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '../utils/api'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await api.login(username, password)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    }}>
      <div style={{
        background: '#1e293b',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: '#3b82f6',
            borderRadius: '50%',
            marginBottom: '1rem'
          }}>
            <Lock size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            HAProxy Manager
          </h1>
          <p style={{ color: '#94a3b8' }}>
            Sign in to manage your load balancer
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.375rem',
                color: '#e2e8f0',
                fontSize: '1rem'
              }}
              required
              disabled={isLoading}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.375rem',
                color: '#e2e8f0',
                fontSize: '1rem'
              }}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#fca5a5'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#3b82f6',
              color: '#ffffff',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
