# Auction System Frontend

Frontend for the Auction System built with React, TypeScript, Redux Toolkit, and RTK Query.

## Features

- **JWT Authentication**: Login flow that stores a JWT for API access
- **Redux Toolkit & RTK Query**: State management with automatic caching and refetching
- **Idempotent API Calls**: All POST requests include unique `Idempotency-Key` headers
- **Mobile-First Design**: Optimized for mobile devices with responsive layout
- **Real-time Updates**: Automatic polling for auction status and leaderboard updates
- **Toast Notifications**: User-friendly error and success messages

## Tech Stack

- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **RTK Query** for API calls
- **React Router** for navigation
- **Vite** for fast development and building
- **CSS Variables** for theming

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # App layout with navigation
│   ├── Toast/          # Toast notification system
│   ├── AuctionCard/    # Auction card component
│   └── Loading/        # Loading spinner
├── pages/              # Page components
│   ├── Dashboard/      # Main dashboard
│   ├── Auctions/       # Auctions list
│   ├── CreateAuction/  # Create new auction
│   ├── AuctionDetail/  # Auction details with bidding
│   └── Transactions/   # Transaction history
├── store/              # Redux store
│   ├── api/           # RTK Query API slice
│   ├── slices/        # Redux slices (auth, ui)
│   ├── store.ts       # Store configuration
│   └── hooks.ts       # Typed hooks
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
│   └── uuid.ts        # UUID generation
└── styles/            # Global styles

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (default: http://localhost:3000/api)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## API Integration

All API calls are handled through RTK Query with the following features:

- **Automatic Authentication**: `Authorization: Bearer <token>` header added to all requests
- **Idempotency**: `Idempotency-Key` (UUID v4) added to all POST requests
- **Error Handling**: Unified error handling with toast notifications
- **Caching**: Automatic caching and cache invalidation
- **Polling**: Optional automatic refetching for real-time updates

### API Endpoints

- `POST /auth/login` - Login and receive JWT (`{ success: true, data: { token } }`)
- `GET /api/me` - Get current user
- `POST /api/balance/topup` - Top up balance
- `GET /api/auctions` - Get all auctions
- `POST /api/auctions/create` - Create auction
- `GET /api/auctions/:id` - Get auction details
- `POST /api/auctions/:id/place-bid` - Place bid
- `POST /api/auctions/:id/increase-bid` - Increase existing bid
- `GET /api/auctions/:id/leaderboard` - Get leaderboard
- `GET /api/transactions` - Get transaction history

## Authentication

The app uses a simple login screen to fetch a JWT from the backend and stores it in `localStorage`.
The login endpoint is `POST /auth/login` and returns `{ success: true, data: { token } }`.
All API calls attach the token via `Authorization: Bearer <token>`.

## Contributing

1. Follow the existing code style
2. Use TypeScript strict mode
3. Write meaningful commit messages
4. Test on mobile devices

## License

MIT
