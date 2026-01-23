import { ToastContainer } from './components/Toast/Toast'
import { DevLogin } from './components/DevLogin/DevLogin'
import { useAppSelector } from './store/hooks'

function App() {
  const { devToken } = useAppSelector((state) => state.auth)
  const isLoggedIn = Boolean(devToken)

  return (
    <>
      {!isLoggedIn ? (
        <DevLogin />
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
