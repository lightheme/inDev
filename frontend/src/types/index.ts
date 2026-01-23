export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface User {
  id: string
  username?: string
  firstName?: string
  lastName?: string
  balance: number
  reservedBalance?: number
  availableBalance?: number
  createdAt?: string
}

export interface UserBalance {
  balance: number
  reservedBalance: number
  availableBalance: number
}

export interface AuctionRound {
  roundNumber: number
  giftsToDistribute: number
  startTime: string
  endTime: string
  duration: number
  status: 'pending' | 'active' | 'completed'
  winnerIds?: Array<string | { id?: string; _id?: string; username?: string; firstName?: string; lastName?: string }>
}

export interface Auction {
  id: string
  title: string
  totalGifts: number
  giftsPerRound: number[]
  roundDurations: number[]
  rounds?: AuctionRound[]
  currentRound: number
  status: 'draft' | 'active' | 'completed' | 'cancelled'
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
  roundNumber: number
  amount: number
  placedAt: string
  status: 'active' | 'won' | 'refunded'
  idempotencyKey?: string
  user?: {
    username?: string
    firstName?: string
    lastName?: string
  }
}

export interface LeaderboardEntry {
  userId: string
  totalAmount: number
  rank: number
  placedAt?: string
  user?: {
    username?: string
    firstName?: string
    lastName?: string
  }
}

export interface Transaction {
  id: string
  userId: string
  type: 'topup' | 'reserve' | 'charge' | 'refund'
  amount: number
  refType?: 'auction' | 'round' | 'bid' | 'user'
  refId?: string
  commandId?: string
  metadata?: Record<string, any>
  createdAt: string
  balanceAfter?: number
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
