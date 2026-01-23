import { useState } from 'react'
import { setDevAuthToken } from '../../utils/auth'
import { useAppDispatch } from '../../store/hooks'
import { setDevAuthToken as setDevAuthTokenAction } from '../../store/slices/telegramSlice'
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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const loginUrl = import.meta.env.DEV
    ? 'http://localhost:3000/api/auth/dev/login'
    : `${apiBaseUrl}/auth/dev/login`

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

      setDevAuthToken(payload.token)
      dispatch(setDevAuthTokenAction({ token: payload.token }))
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
        <h2>Development Login</h2>
        <p className="text-hint">
          Running outside Telegram. Use dev credentials to get a JWT.
        </p>

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
