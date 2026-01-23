import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetAuctionQuery,
  usePlaceBidMutation,
  useIncreaseBidMutation,
  useGetLeaderboardQuery
} from '../../store/api/apiSlice'
import { useAppDispatch } from '../../store/hooks'
import { addToast } from '../../store/slices/uiSlice'
import { Loading } from '../../components/Loading/Loading'
import { formatCurrency } from '../../utils/formatCurrency'
import './AuctionDetail.css'

export const AuctionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const { data: auction, isLoading } = useGetAuctionQuery(id!)
  const { data: leaderboard = [] } = useGetLeaderboardQuery(
    { auctionId: id!, round: auction?.currentRound },
    { skip: !auction }
  )
  const [placeBid, { isLoading: placingBid }] = usePlaceBidMutation()
  const [increaseBid, { isLoading: increasingBid }] = useIncreaseBidMutation()

  const [bidAmount, setBidAmount] = useState('')
  const [selectedBidId, setSelectedBidId] = useState('')
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [activeTab, setActiveTab] = useState<'bid' | 'leaderboard'>('bid')

  useEffect(() => {
    if (!auction) return

    const interval = setInterval(() => {
      // Force refetch to get updated auction data
    }, 5000)

    return () => clearInterval(interval)
  }, [auction])

  if (isLoading) {
    return <Loading />
  }

  if (!auction) {
    return (
      <div className="error-state">
        <p>Auction not found</p>
        <button onClick={() => navigate('/auctions')} className="button">
          Back to Auctions
        </button>
      </div>
    )
  }

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(bidAmount)

    if (!amount || amount <= 0) {
      dispatch(addToast({ message: 'Please enter a valid amount', type: 'error' }))
      return
    }

    try {
      await placeBid({ auctionId: id!, body: { amount } }).unwrap()
      dispatch(addToast({ message: 'Bid placed successfully', type: 'success' }))
      setBidAmount('')
    } catch (error) {
      // Error handled by baseQuery
    }
  }

  const handleIncreaseBid = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(increaseAmount)

    if (!selectedBidId) {
      dispatch(addToast({ message: 'Please select a bid', type: 'error' }))
      return
    }

    if (!amount || amount <= 0) {
      dispatch(addToast({ message: 'Please enter a valid amount', type: 'error' }))
      return
    }

    try {
      await increaseBid({ auctionId: id!, body: { bidId: selectedBidId, amount } }).unwrap()
      dispatch(addToast({ message: 'Bid increased successfully', type: 'success' }))
      setIncreaseAmount('')
      setSelectedBidId('')
    } catch (error) {
      // Error handled by baseQuery
    }
  }

  const statusColors = {
    draft: '#ff9800',
    active: '#4caf50',
    completed: '#707579',
    cancelled: '#b0bec5'
  }

  const totalRounds = auction.giftsPerRound.length

  return (
    <div className="auction-detail-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
      </div>

      <div className="auction-info card">
        <div className="info-header">
          <h2>{auction.title}</h2>
          <span
            className="auction-status"
            style={{ backgroundColor: statusColors[auction.status] }}
          >
            {auction.status.toUpperCase()}
          </span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Total Gifts</span>
            <span className="info-value">{auction.totalGifts}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Current Round</span>
            <span className="info-value">
              {auction.currentRound}/{totalRounds}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Round Gifts</span>
            <span className="info-value">
              {auction.giftsPerRound[auction.currentRound - 1] ?? 0}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Round Duration</span>
            <span className="info-value">
              {auction.roundDurations[auction.currentRound - 1] ?? 0}s
            </span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'bid' ? 'active' : ''}`}
          onClick={() => setActiveTab('bid')}
        >
          Place Bid
        </button>
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === 'bid' ? (
        <div className="bid-section">
          {auction.status === 'active' ? (
            <>
              <div className="card">
                <h3>Place New Bid</h3>
                <form onSubmit={handlePlaceBid} className="bid-form">
                  <div className="form-group">
                    <label className="label">Amount (₽)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      step="0.01"
                      min="0"
                      disabled={placingBid}
                    />
                  </div>
                  <button type="submit" className="button" disabled={placingBid}>
                    {placingBid ? 'Placing...' : 'Place Bid'}
                  </button>
                </form>
              </div>

              <div className="card">
                <h3>Increase Existing Bid</h3>
                <form onSubmit={handleIncreaseBid} className="bid-form">
                  <div className="form-group">
                    <label className="label">Bid ID</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter bid ID"
                      value={selectedBidId}
                      onChange={(e) => setSelectedBidId(e.target.value)}
                      disabled={increasingBid}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Additional Amount (₽)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Enter amount to add"
                      value={increaseAmount}
                      onChange={(e) => setIncreaseAmount(e.target.value)}
                      step="0.01"
                      min="0"
                      disabled={increasingBid}
                    />
                  </div>
                  <button type="submit" className="button" disabled={increasingBid}>
                    {increasingBid ? 'Increasing...' : 'Increase Bid'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="card">
              <p className="text-hint">
                This auction is {auction.status}. Bidding is not available.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="leaderboard-section">
          <div className="card">
            <h3>Round {auction.currentRound} Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p className="text-hint">No bids yet</p>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <div key={entry.userId} className="leaderboard-item">
                    <div className="rank">#{entry.rank}</div>
                    <div className="user-info">
                      <div className="user-name">
                        {entry.user?.firstName || entry.user?.username || entry.userId}
                      </div>
                      <div className="user-stats text-hint">
                        {entry.user?.username && `@${entry.user.username}`}
                      </div>
                    </div>
                    <div className="amount">{formatCurrency(entry.totalAmount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
