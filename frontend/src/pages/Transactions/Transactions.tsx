import { useState } from 'react'
import { useGetTransactionsQuery } from '../../store/api/apiSlice'
import { Loading } from '../../components/Loading/Loading'
import type { Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatCurrency'
import './Transactions.css'

export const Transactions = () => {
  const { data: transactions = [], isLoading } = useGetTransactionsQuery()
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all')

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true
    return tx.type === filter
  })

  if (isLoading) {
    return <Loading />
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'topup':
        return '💰'
      case 'reserve':
        return '🎯'
      case 'charge':
        return '🏆'
      case 'refund':
        return '↩️'
      default:
        return '💳'
    }
  }

  const getTransactionLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'topup':
        return 'Top Up'
      case 'reserve':
        return 'Bid Reserved'
      case 'charge':
        return 'Charge'
      case 'refund':
        return 'Refund'
      default:
        return type
    }
  }

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'topup':
      case 'refund':
        return '#4caf50'
      case 'charge':
        return '#e53935'
      case 'reserve':
        return '#e53935'
      default:
        return 'var(--tg-text-color)'
    }
  }

  return (
    <div className="transactions-page">
      <h2>Transaction History</h2>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'topup' ? 'active' : ''}`}
          onClick={() => setFilter('topup')}
        >
          Top Up
        </button>
        <button
          className={`filter-tab ${filter === 'reserve' ? 'active' : ''}`}
          onClick={() => setFilter('reserve')}
        >
          Reserve
        </button>
        <button
          className={`filter-tab ${filter === 'charge' ? 'active' : ''}`}
          onClick={() => setFilter('charge')}
        >
          Charge
        </button>
        <button
          className={`filter-tab ${filter === 'refund' ? 'active' : ''}`}
          onClick={() => setFilter('refund')}
        >
          Refunds
        </button>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <p className="text-hint">No transactions found</p>
        </div>
      ) : (
        <div className="transactions-list">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="transaction-item card">
              <div className="tx-icon">{getTransactionIcon(tx.type)}</div>
              <div className="tx-details">
                <div className="tx-type">{getTransactionLabel(tx.type)}</div>
                <div className="tx-date text-hint">
                  {new Date(tx.createdAt).toLocaleString()}
                </div>
                {tx.metadata && (
                  <div className="tx-meta text-hint">
                    {Object.entries(tx.metadata).map(([key, value]) => (
                      <span key={key}>
                        {key}: {JSON.stringify(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="tx-amount-section">
                <div
                  className="tx-amount"
                  style={{ color: getTransactionColor(tx.type) }}
                >
                  {tx.type === 'topup' || tx.type === 'refund' ? '+' : '-'}
                  {formatCurrency(Math.abs(tx.amount))}
                </div>
                {tx.balanceAfter !== undefined && (
                  <div className="tx-balance text-hint">
                    Balance: {formatCurrency(tx.balanceAfter)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
