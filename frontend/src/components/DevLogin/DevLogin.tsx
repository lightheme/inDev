import { useState } from 'react'
import { setAuthToken } from '../../utils/auth'
import { getApiBaseUrl } from '../../utils/apiBase'
import { useAppDispatch } from '../../store/hooks'
import { setAuthToken as setAuthTokenAction } from '../../store/slices/authSlice'
import './DevLogin.css'

interface DevLoginProps {
  onLogin: () => void
}

export const DevLogin = ({ onLogin }: DevLoginProps) => {
  const dispatch = useAppDispatch()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const apiBaseUrl = getApiBaseUrl()

  const handleLogin = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login, password })
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.error || 'Failed to login')
        return
      }
			
			const token = payload?.data?.token ?? payload?.token

      if (!token) {
        setError('Missing token in response')
        return
      }

      setAuthToken(token)
      dispatch(setAuthTokenAction({ token }))
      onLogin()
    } catch (err) {
      setError('Failed to login. Please check the backend is running.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dev-login">
      <div className="dev-login-modal">
        <h2>Login</h2>

        <div className="form-group">
          <label className="label">Login</label>
          <input
            type="text"
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-hint error">{error}</p>}

        <button onClick={handleLogin} className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Login'}
        </button>
      </div>
    </div>
  )
}
