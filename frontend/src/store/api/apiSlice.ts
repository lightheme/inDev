import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../store'
import { addToast } from '../slices/uiSlice'
import { clearAuthToken } from '../../utils/auth'
import { clearAuthToken as clearAuthTokenAction } from '../slices/authSlice'
import { generateIdempotencyKey } from '../../utils/uuid'
import { getApiBaseUrl } from '../../utils/apiBase'
import type {
  ApiResponse,
  User,
  UserBalance,
  Auction,
  Bid,
  LeaderboardEntry,
  Transaction,
  CreateAuctionRequest,
  PlaceBidRequest,
  IncreaseBidRequest,
  TopUpRequest
} from '../../types'

const API_BASE_URL = getApiBaseUrl()

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as RootState
    const authToken = state.auth.token

    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    // Add Idempotency-Key for all POST requests
    if (endpoint && !headers.has('Idempotency-Key')) {
      const meta = (endpoint as any)
      if (meta && typeof meta === 'string') {
        // Check if this is a mutation (typically POST)
        headers.set('Idempotency-Key', generateIdempotencyKey())
      }
    }

    return headers
  }
})

const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Add Idempotency-Key for POST requests
  if (typeof args === 'object' && args.method === 'POST') {
    args.headers = {
      ...args.headers,
      'Idempotency-Key': generateIdempotencyKey()
    }
  }

  const result = await baseQuery(args, api, extraOptions)

  if (result.error) {
    const errorData = result.error.data as any
    const errorMessage = errorData?.error || errorData?.message || (
      result.error.status === 'FETCH_ERROR'
        ? 'Network error. Please check your connection.'
        : 'An error occurred. Please try again.'
    )

    if (result.error.status === 401 || result.error.status === 403) {
      clearAuthToken()
      api.dispatch(clearAuthTokenAction())
    }

    api.dispatch(addToast({
      message: errorMessage,
      type: 'error'
    }))
  }

  return result
}

const unwrapApiResponse = <T,>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data
  }

  return response as T
}

const normalizeAuctionStatus = (status?: string): Auction['status'] => {
  if (status === 'draft') return 'draft'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'active') return 'active'
  if (status === 'completed') return 'completed'
  return 'draft'
}

const normalizeAuction = (auction: any): Auction => {
  const rounds = Array.isArray(auction?.rounds) ? auction.rounds : []
  const currentRoundIndex = typeof auction?.currentRound === 'number' ? auction.currentRound : 0
  const currentRound = currentRoundIndex + 1

  return {
    id: auction?.id ?? auction?._id ?? '',
    title: auction?.title ?? '',
    totalGifts: auction?.totalGifts ?? 0,
    giftsPerRound: rounds.map((round: any) => round.giftsToDistribute ?? 0),
    roundDurations: rounds.map((round: any) => round.duration ?? 0),
    rounds,
    currentRound,
    status: normalizeAuctionStatus(auction?.status),
    createdAt: auction?.createdAt ?? new Date().toISOString(),
    totalBids: auction?.totalBids,
    totalAmount: auction?.totalAmount
  }
}

const normalizeBid = (bid: any): Bid => ({
  id: bid?.id ?? bid?._id ?? '',
  auctionId: bid?.auctionId ?? '',
  userId: bid?.userId ?? '',
  roundNumber: bid?.roundNumber ?? 0,
  amount: bid?.amount ?? 0,
  placedAt: bid?.placedAt ?? bid?.createdAt ?? new Date().toISOString(),
  status: bid?.status ?? 'active',
  idempotencyKey: bid?.idempotencyKey,
  user: bid?.user
})

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ['User', 'Auctions', 'Auction', 'Leaderboard', 'Transactions'],
  endpoints: (builder) => ({
    // User endpoints
    getMe: builder.query<User, void>({
      query: () => '/me',
      transformResponse: (response: ApiResponse<User>) => unwrapApiResponse(response),
      providesTags: ['User']
    }),

    // Balance endpoints
    topUpBalance: builder.mutation<UserBalance, TopUpRequest>({
      query: (body) => ({
        url: '/balance/topup',
        method: 'POST',
        body
      }),
      transformResponse: (response: ApiResponse<UserBalance>) => unwrapApiResponse(response),
      invalidatesTags: ['User', 'Transactions']
    }),

    // Auction endpoints
    getAuctions: builder.query<Auction[], void>({
        query: () => '/auctions',
        transformResponse: (response: ApiResponse<any[]>) => {
            const data = unwrapApiResponse(response)
            if (!Array.isArray(data)) return []
            return data.map(normalizeAuction)
        },
        providesTags: ['Auctions'],
    }),

    createAuction: builder.mutation<Auction, CreateAuctionRequest>({
      query: (body) => ({
        url: '/auctions/create',
        method: 'POST',
        body
      }),
      transformResponse: (response: ApiResponse<any>) => normalizeAuction(unwrapApiResponse(response)),
      invalidatesTags: ['Auctions']
    }),

    getAuction: builder.query<Auction, string>({
      query: (id) => `/auctions/${id}`,
      transformResponse: (response: ApiResponse<any>) => normalizeAuction(unwrapApiResponse(response)),
      providesTags: (result, error, id) => [{ type: 'Auction', id }]
    }),

    placeBid: builder.mutation<Bid, { auctionId: string; body: PlaceBidRequest }>({
      query: ({ auctionId, body }) => ({
        url: `/auctions/${auctionId}/place-bid`,
        method: 'POST',
        body
      }),
      transformResponse: (response: ApiResponse<any>) => normalizeBid(unwrapApiResponse(response)),
      invalidatesTags: (result, error, { auctionId }) => [
        { type: 'Auction', id: auctionId },
        'User',
        'Leaderboard',
        'Transactions'
      ]
    }),

    increaseBid: builder.mutation<Bid, { auctionId: string; body: IncreaseBidRequest }>({
      query: ({ auctionId, body }) => ({
        url: `/auctions/${auctionId}/increase-bid`,
        method: 'POST',
        body
      }),
      transformResponse: (response: ApiResponse<any>) => normalizeBid(unwrapApiResponse(response)),
      invalidatesTags: (result, error, { auctionId }) => [
        { type: 'Auction', id: auctionId },
        'User',
        'Leaderboard',
        'Transactions'
      ]
    }),

    getLeaderboard: builder.query<LeaderboardEntry[], { auctionId: string; round?: number }>({
      query: ({ auctionId, round }) => ({
        url: `/auctions/${auctionId}/leaderboard`,
        params: round ? { round } : undefined
      }),
      transformResponse: (response: ApiResponse<any[]>) => {
        const data = unwrapApiResponse(response)
        if (!Array.isArray(data)) return []
        return data.map((entry: any) => ({
          rank: entry.rank ?? 0,
          userId: entry.userId ?? entry.user?._id ?? '',
          totalAmount: entry.totalAmount ?? 0,
          placedAt: entry.placedAt,
          user: entry.user
        }))
      },
      providesTags: ['Leaderboard']
    }),

    // Transactions endpoint (custom implementation if needed)
    getTransactions: builder.query<Transaction[], void>({
      query: () => '/transactions',
      transformResponse: (response: ApiResponse<any[]>) => {
        const data = unwrapApiResponse(response)
        if (!Array.isArray(data)) return []
        return data.map((entry: any) => ({
          id: entry.id ?? entry._id ?? '',
          userId: entry.userId ?? '',
          type: entry.type,
          amount: entry.amount ?? 0,
          refType: entry.refType,
          refId: entry.refId,
          commandId: entry.commandId,
          createdAt: entry.createdAt,
          balanceAfter: entry.balanceAfter
        }))
      },
      providesTags: ['Transactions']
    })
  })
})

export const {
  useGetMeQuery,
  useTopUpBalanceMutation,
  useGetAuctionsQuery,
  useCreateAuctionMutation,
  useGetAuctionQuery,
  usePlaceBidMutation,
  useIncreaseBidMutation,
  useGetLeaderboardQuery,
  useGetTransactionsQuery
} = apiSlice
