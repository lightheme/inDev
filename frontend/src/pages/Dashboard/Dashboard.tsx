import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetMeQuery, useTopUpBalanceMutation, useGetAuctionsQuery } from '../../store/api/apiSlice.ts'
import { useAppDispatch, useAppSelector } from '../../store/hooks.ts'
import { addToast } from '../../store/slices/uiSlice.ts'
import { Loading } from '../../components'
import './Dashboard.css'

export const Dashboard = () => {
  const token = useAppSelector((state) => state.auth.token)
  const { data: user, isLoading: userLoading } = useGetMeQuery(undefined, { skip: !token })
  const { data } = useGetAuctionsQuery()
  const auctions =
        Array.isArray(data) ? data :
            Array.isArray((data as any)?.auctions) ? (data as any).auctions :
            Array.isArray((data as any)?.items) ? (data as any).items :
            []

  const [topUpBalance, { isLoading: topUpLoading }] = useTopUpBalanceMutation()
  const dispatch = useAppDispatch()
  const [amount, setAmount] = useState('')

  const activeAuctions = auctions.filter(a => a.status === 'active').length
  const completedAuctions = auctions.filter(a => a.status === 'completed').length

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum <= 0) {
      dispatch(addToast({ message: 'Please enter a valid amount', type: 'error' }))
      return
    }

    try {
      await topUpBalance({ amount: amountNum }).unwrap()
      dispatch(addToast({ message: 'Balance topped up successfully', type: 'success' }))
      setAmount('')
    } catch (error) {
      // Error handled by baseQuery
    }
  }

  if (userLoading) {
    return <Loading />
  }

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h2>Welcome, {user?.firstName}!</h2>
        <p className="text-hint">@{user?.username}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{activeAuctions}</div>
          <div className="stat-label">Active Auctions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedAuctions}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="card">
        <h3>Top Up Balance</h3>
        <form onSubmit={handleTopUp} className="topup-form">
          <div>
            <label className="label">Amount (₽)</label>
            <input
              type="number"
              className="input"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              disabled={topUpLoading}
            />
          </div>
          <button
            type="submit"
            className="button"
            disabled={topUpLoading}
          >
            {topUpLoading ? 'Processing...' : 'Top Up'}
          </button>
        </form>
      </div>

      <div className="quick-actions">
        <Link to="/auctions" className="button button-secondary">
          View All Auctions
        </Link>
        <Link to="/auctions/new" className="button">
          Create Auction
        </Link>
      </div>
    </div>
  )
}
