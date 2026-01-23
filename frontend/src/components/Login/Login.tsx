import { useState } from 'react'
import { setAuthToken } from '../../utils/auth'
import { useAppDispatch } from '../../store/hooks'
import { setAuthToken as setAuthTokenAction } from '../../store/slices/authSlice'
import './Login.css'

export const Login = () => {
  const dispatch = useAppDispatch()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const loginUrl = `${apiBaseUrl}/auth/login`

  const handleLogin = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(loginUrl, {
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

      if (!payload?.token) {
        setError('Missing token in response')
        return
      }

      setAuthToken(payload.token)
      dispatch(setAuthTokenAction({ token: payload.token }))
    } catch (err) {
      setError('Failed to login. Please check the backend is running.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login">
      <div className="login-modal">
        <h2>Login</h2>
        <p className="text-hint">Use your login and password to get a JWT.</p>

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
