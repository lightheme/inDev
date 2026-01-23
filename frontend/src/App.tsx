import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { ToastContainer } from './components/Toast/Toast'
import { DevLogin } from './components/DevLogin/DevLogin'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Auctions } from './pages/Auctions/Auctions'
import { CreateAuction } from './pages/CreateAuction/CreateAuction'
import { AuctionDetail } from './pages/AuctionDetail/AuctionDetail'
import { Transactions } from './pages/Transactions/Transactions'
import { initTelegramWebApp, getTelegramTheme, getTelegramInitData } from './utils/telegram'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { updateThemeParams } from './store/slices/telegramSlice'

function App() {
  const dispatch = useAppDispatch()
  const { isInTelegram, devToken } = useAppSelector((state) => state.telegram)
  const [showDevLogin, setShowDevLogin] = useState(false)

  useEffect(() => {
    initTelegramWebApp()

    // Check if we need to show dev login
    const initData = getTelegramInitData()
    if (!isInTelegram && !devToken && !initData) {
      setShowDevLogin(true)
    }

    const themeParams = getTelegramTheme()
    if (Object.keys(themeParams).length > 0) {
      dispatch(updateThemeParams(themeParams))

      // Apply theme colors to CSS variables
      const root = document.documentElement
      if (themeParams.bg_color) root.style.setProperty('--tg-bg-color', themeParams.bg_color)
      if (themeParams.text_color) root.style.setProperty('--tg-text-color', themeParams.text_color)
      if (themeParams.hint_color) root.style.setProperty('--tg-hint-color', themeParams.hint_color)
      if (themeParams.link_color) root.style.setProperty('--tg-link-color', themeParams.link_color)
      if (themeParams.button_color) root.style.setProperty('--tg-button-color', themeParams.button_color)
      if (themeParams.button_text_color) root.style.setProperty('--tg-button-text-color', themeParams.button_text_color)
      if (themeParams.secondary_bg_color) root.style.setProperty('--tg-secondary-bg-color', themeParams.secondary_bg_color)
    }
  }, [dispatch, devToken, isInTelegram])

  return (
    <BrowserRouter
        future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        }}
    >
      {showDevLogin && <DevLogin onLogin={() => setShowDevLogin(false)} />}
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/auctions/new" element={<CreateAuction />} />
          <Route path="/auctions/:id" element={<AuctionDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
