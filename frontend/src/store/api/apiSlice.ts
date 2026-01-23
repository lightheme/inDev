import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../store'
import { addToast } from '../slices/uiSlice'
import { generateIdempotencyKey } from '../../utils/uuid'
import type {
  User,
  Auction,
  Bid,
  LeaderboardEntry,
  Transaction,
  CreateAuctionRequest,
  PlaceBidRequest,
  IncreaseBidRequest,
  TopUpRequest
} from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as RootState
    const initData = state.telegram.initData
    const devToken = state.telegram.devToken

    if (devToken) {
      headers.set('Authorization', `Bearer ${devToken}`)
    } else if (initData) {
      headers.set('x-telegram-init-data', initData)
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
    const errorMessage =
      errorData?.error ||
      errorData?.message ||
      (result.error.status === 'FETCH_ERROR'
        ? 'Network error. Please check your connection.'
        : 'An error occurred. Please try again.')

    api.dispatch(addToast({
      message: errorMessage,
      type: 'error'
    }))
  }

  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ['User', 'Auctions', 'Auction', 'Leaderboard', 'Transactions'],
  endpoints: (builder) => ({
    // User endpoints
    getMe: builder.query<User, void>({
      query: () => '/me',
      providesTags: ['User']
    }),

    // Balance endpoints
    topUpBalance: builder.mutation<User, TopUpRequest>({
      query: (body) => ({
        url: '/balance/topup',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User', 'Transactions']
    }),

    // Auction endpoints
    getAuctions: builder.query<Auction[], void>({
        query: () => '/auctions',
        transformResponse: (response: any) => {
            if (Array.isArray(response)) return response
            if (Array.isArray(response?.auctions)) return response.auctions
            if (Array.isArray(response?.items)) return response.items
            return []
        },
        providesTags: ['Auctions'],
    }),

    createAuction: builder.mutation<Auction, CreateAuctionRequest>({
      query: (body) => ({
        url: '/auctions/create',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Auctions']
    }),

    getAuction: builder.query<Auction, string>({
      query: (id) => `/auctions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Auction', id }]
    }),

    placeBid: builder.mutation<Bid, { auctionId: string; body: PlaceBidRequest }>({
      query: ({ auctionId, body }) => ({
        url: `/auctions/${auctionId}/place-bid`,
        method: 'POST',
        body
      }),
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
      providesTags: ['Leaderboard']
    }),

    // Transactions endpoint (custom implementation if needed)
    getTransactions: builder.query<Transaction[], void>({
      query: () => '/transactions',
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
