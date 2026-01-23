import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setAuthToken } from '../../utils/auth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setAuthToken as setAuthTokenAction } from '../../store/slices/authSlice'
import './Login.css'

export const Login = () => {
  const dispatch = useAppDispatch()
  const authToken = useAppSelector((state) => state.auth.token)
  const navigate = useNavigate()
  const location = useLocation()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  useEffect(() => {
    if (authToken) {
      navigate('/', { replace: true })
    }
  }, [authToken, navigate])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

      const state = location.state as { from?: Location }
      const redirectPath = state?.from?.pathname || '/'
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError('Failed to login. Please check the backend is running.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Login</h1>
        <p className="login-subtitle">Enter your credentials to continue</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="label" htmlFor="login">
              Login
            </label>
            <input
              id="login"
              type="text"
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-hint error">{error}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
