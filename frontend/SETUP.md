# Quick Setup Guide

## Installation

```bash
# Install dependencies
npm install

# Create .env file (already exists)
# Verify VITE_API_BASE_URL in .env

# Start development server
npm run dev
```

## Login Flow

The app shows a login form that posts to `/auth/login` and stores the JWT in
`localStorage`. The backend will create the user automatically on first login.

## Testing with Telegram

To test as a Telegram WebApp:

1. Create a bot with @BotFather
2. Set up a Web App with `/newapp`
3. Point it to your development URL (use ngrok for HTTPS)
4. Open the bot and launch the Web App

## API Integration

Make sure your backend API is running at the URL specified in `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Key Features Implemented

### API Layer
- ✅ RTK Query with automatic caching
- ✅ `Idempotency-Key` (UUID v4) on all POST requests
- ✅ `Authorization: Bearer <jwt>` authentication header
- ✅ Unified error handling with toast notifications

### Pages
- ✅ Dashboard with balance top-up
- ✅ Auctions list with filtering
- ✅ Create auction with round configuration
- ✅ Auction detail with bidding and leaderboard
- ✅ Transaction history

### Features
- ✅ Mobile-first responsive design
- ✅ Telegram WebApp theme integration
- ✅ Login flow for local testing
- ✅ Real-time auction updates
- ✅ Toast notifications
- ✅ Bottom navigation

## Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── store/           # Redux store, API slice, slices
├── types/           # TypeScript types
├── utils/           # Utility functions
└── styles/          # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (required)

## Notes

- All POST requests automatically include `Idempotency-Key` header
- Authentication is handled via `Authorization: Bearer <jwt>` header
- The app uses Telegram WebApp SDK for theme and user data
