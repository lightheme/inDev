import { useState } from 'react'
import { setDevTelegramData } from '../../utils/telegram'
import { useAppDispatch } from '../../store/hooks'
import { setDevMode } from '../../store/slices/telegramSlice'
import './DevLogin.css'

interface DevLoginProps {
  onLogin: () => void
}

export const DevLogin = ({ onLogin }: DevLoginProps) => {
  const dispatch = useAppDispatch()
  const [userId, setUserId] = useState('12345')
  const [firstName, setFirstName] = useState('Dev User')
  const [username, setUsername] = useState('dev_user')

  const handleLogin = () => {
    const initData = `user=${encodeURIComponent(
      JSON.stringify({
        id: parseInt(userId),
        first_name: firstName,
        username: username
      })
    )}`

    const user = {
      id: parseInt(userId),
      first_name: firstName,
      username: username
    }

    setDevTelegramData(initData, user)
    dispatch(setDevMode({ initData, user }))
    onLogin()
  }

  return (
    <div className="dev-login">
      <div className="dev-login-modal">
        <h2>Development Login</h2>
        <p className="text-hint">
          Enter mock user data for development
        </p>

        <div className="form-group">
          <label className="label">User ID</label>
          <input
            type="number"
            className="input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">First Name</label>
          <input
            type="text"
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Username</label>
          <input
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <button onClick={handleLogin} className="button">
          Login as Dev User
        </button>
      </div>
    </div>
  )
}
