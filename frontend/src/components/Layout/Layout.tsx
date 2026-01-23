import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGetMeQuery } from '../../store/api/apiSlice'
import { useAppSelector } from '../../store/hooks'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { data: user } = useGetMeQuery()
  const { devToken } = useAppSelector((state) => state.auth)

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">Auction System</h1>
          {user && (
            <div className="header-balance">
              <span className="balance-label">Balance:</span>
              <span className="balance-amount">{user.balance.toFixed(2)} ₽</span>
            </div>
          )}
        </div>
        {devToken && (
          <div className="dev-mode-banner">
            Using Dev Login
          </div>
        )}
      </header>

      <main className="main">
        {children}
      </main>

      <nav className="bottom-nav">
        <Link
          to="/"
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link
          to="/auctions"
          className={`nav-item ${location.pathname.startsWith('/auctions') ? 'active' : ''}`}
        >
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Auctions</span>
        </Link>
        <Link
          to="/transactions"
          className={`nav-item ${location.pathname === '/transactions' ? 'active' : ''}`}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">History</span>
        </Link>
      </nav>
    </div>
  )
}
