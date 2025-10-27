import { useState, useEffect } from 'react'
import { api } from './utils/api'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has valid token
    const checkAuth = async () => {
      const token = api.getToken()
      if (token) {
        try {
          await api.healthCheck()
          setIsAuthenticated(true)
        } catch (error) {
          api.clearToken()
          setIsAuthenticated(false)
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    await api.logout()
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ fontSize: '1.5rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
