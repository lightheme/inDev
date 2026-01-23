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
import { useAppSelector } from './store/hooks'

function App() {
  const authToken = useAppSelector((state) => state.auth.token)
  const [showDevLogin, setShowDevLogin] = useState(false)

  useEffect(() => {
    setShowDevLogin(!authToken)
  }, [authToken])

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
