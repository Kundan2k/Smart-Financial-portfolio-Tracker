import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
        fontSize: '0.75rem', letterSpacing: '0.1em'
      }}>
        AUTHENTICATING…
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}