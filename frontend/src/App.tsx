import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { ToastContainer } from './components/Toast/Toast'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Auctions } from './pages/Auctions/Auctions'
import { CreateAuction } from './pages/CreateAuction/CreateAuction'
import { AuctionDetail } from './pages/AuctionDetail/AuctionDetail'
import { Transactions } from './pages/Transactions/Transactions'
import { Login } from './pages/Login/Login'
import { useAppSelector } from './store/hooks'

const RequireAuth = () => {
  const authToken = useAppSelector((state) => state.auth.token)
  const location = useLocation()

  if (!authToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter
        future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route
            path="/"
            element={(
              <Layout>
                <Dashboard />
              </Layout>
            )}
          />
          <Route
            path="/auctions"
            element={(
              <Layout>
                <Auctions />
              </Layout>
            )}
          />
          <Route
            path="/auctions/new"
            element={(
              <Layout>
                <CreateAuction />
              </Layout>
            )}
          />
          <Route
            path="/auctions/:id"
            element={(
              <Layout>
                <AuctionDetail />
              </Layout>
            )}
          />
          <Route
            path="/transactions"
            element={(
              <Layout>
                <Transactions />
              </Layout>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
