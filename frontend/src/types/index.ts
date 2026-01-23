export interface User {
  id: string
  username: string
  firstName: string
  lastName?: string
  balance: number
  createdAt: string
}

export interface Auction {
  id: string
  title: string
  totalGifts: number
  giftsPerRound: number[]
  roundDurations: number[]
  currentRound: number
  status: 'pending' | 'active' | 'completed'
  startedAt?: string
  completedAt?: string
  createdAt: string
  totalBids?: number
  totalAmount?: number
}

export interface Bid {
  id: string
  auctionId: string
  userId: string
  amount: number
  round: number
  rank?: number
  createdAt: string
  user?: {
    username: string
    firstName: string
  }
}

export interface LeaderboardEntry {
  userId: string
  username: string
  firstName: string
  totalAmount: number
  bidCount: number
  rank: number
  isWinner: boolean
}

export interface Transaction {
  id: string
  userId: string
  type: 'topup' | 'bid' | 'bid_increase' | 'refund' | 'win'
  amount: number
  balanceBefore: number
  balanceAfter: number
  auctionId?: string
  bidId?: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface CreateAuctionRequest {
  title: string
  totalGifts: number
  giftsPerRound: number[]
  roundDurations: number[]
}

export interface PlaceBidRequest {
  amount: number
}

export interface IncreaseBidRequest {
  bidId: string
  amount: number
}

export interface TopUpRequest {
  amount: number
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}
