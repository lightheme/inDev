import { ToastContainer } from './components/Toast/Toast'
import { Login } from './components/Login/Login'
import { useAppSelector } from './store/hooks'

function App() {
  const { authToken } = useAppSelector((state) => state.auth)
  const isLoggedIn = Boolean(authToken)

  return (
    <>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <main className="container">
          <div className="card">
            <h2>Logged in</h2>
            <p className="text-hint">JWT сохранен. Минимальный режим без Telegram-зависимостей.</p>
          </div>
        </main>
      )}
      <ToastContainer />
    </>
  )
}

export default App
