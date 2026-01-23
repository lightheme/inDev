import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetAuctionsQuery } from '../../store/api/apiSlice'
import { AuctionCard } from '../../components/AuctionCard/AuctionCard'
import { Loading } from '../../components/Loading/Loading'
import './Auctions.css'

export const Auctions = () => {
  const { data: auctions = [], isLoading } = useGetAuctionsQuery()
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all')

  const filteredAuctions = auctions.filter(auction => {
    if (filter === 'all') return true
    return auction.status === filter
  })

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="auctions-page">
      <div className="auctions-header">
        <h2>Auctions</h2>
        <Link to="/auctions/new" className="button">
          Create New
        </Link>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({auctions.length})
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({auctions.filter(a => a.status === 'active').length})
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({auctions.filter(a => a.status === 'pending').length})
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({auctions.filter(a => a.status === 'completed').length})
        </button>
      </div>

      <div className="auctions-list">
        {filteredAuctions.length === 0 ? (
          <div className="empty-state">
            <p className="text-hint">No auctions found</p>
            {filter === 'all' && (
              <Link to="/auctions/new" className="button">
                Create First Auction
              </Link>
            )}
          </div>
        ) : (
          filteredAuctions.map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))
        )}
      </div>
    </div>
  )
}
