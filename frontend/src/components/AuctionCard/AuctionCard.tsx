import { Link } from 'react-router-dom'
import type { Auction } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'
import './AuctionCard.css'

interface AuctionCardProps {
  auction: Auction
}

export const AuctionCard = ({ auction }: AuctionCardProps) => {
  const statusColors = {
    draft: '#ff9800',
    active: '#4caf50',
    completed: '#707579',
    cancelled: '#b0bec5'
  }

  const statusLabels = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  return (
    <Link to={`/auctions/${auction.id}`} className="auction-card">
      <div className="auction-header">
        <h3 className="auction-title">{auction.title}</h3>
        <span
          className="auction-status"
          style={{ backgroundColor: statusColors[auction.status] }}
        >
          {statusLabels[auction.status]}
        </span>
      </div>

      <div className="auction-details">
        <div className="auction-detail">
          <span className="detail-label">Total Gifts:</span>
          <span className="detail-value">{auction.totalGifts}</span>
        </div>
        <div className="auction-detail">
          <span className="detail-label">Current Round:</span>
          <span className="detail-value">{auction.currentRound}/{auction.giftsPerRound.length}</span>
        </div>
        {auction.totalBids !== undefined && (
          <div className="auction-detail">
            <span className="detail-label">Total Bids:</span>
            <span className="detail-value">{auction.totalBids}</span>
          </div>
        )}
        {auction.totalAmount !== undefined && (
          <div className="auction-detail">
            <span className="detail-label">Total Amount:</span>
            <span className="detail-value">{formatCurrency(auction.totalAmount)}</span>
          </div>
        )}
      </div>

      <div className="auction-footer">
        <span className="auction-date">
          {new Date(auction.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
