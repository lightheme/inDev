# Auth (JWT) & Dev Flow

## Overview
The backend supports **two** authentication paths:

1. **JWT login (production)** — `/auth/login` accepts `login`/`password` (or `email`/`password`),
   auto-creates the user on first login, and returns a JWT.
2. **Dev Login (non-production only)** — `/auth/dev/login` issues a short-lived JWT for local
   browser use.

The middleware expects `Authorization: Bearer <token>` in production. In development, dev tokens
are still accepted.

## Environment variables

### Backend (`backend/.env`)
```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

BOT_TOKEN=your-telegram-bot-token
# or TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400

DEV_AUTH_JWT_SECRET=dev-secret
DEV_AUTH_TTL_SECONDS=604800
DEV_AUTH_USERS=[{"login":"admin","password":"admin123","userId":123,"role":"admin"}]
# DEV_AUTH_LOGIN=admin
# DEV_AUTH_PASSWORD=admin123

AUTH_JWT_SECRET=prod-secret
AUTH_JWT_TTL_SECONDS=604800
AUTH_PASSWORD_SALT_ROUNDS=10
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Production login flow
1. Send login credentials to `/auth/login`.
2. The backend returns a JWT and creates the user record if it does not exist.
3. Store the token and send it as `Authorization: Bearer <token>` for all API requests.

### curl example
```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Then:
```
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>"
```

## Local dev flow (browser / localhost)
1. Start backend and frontend.
2. Open the frontend in a browser (not inside Telegram).
3. Use `/auth/dev/login` with credentials from `DEV_AUTH_USERS`.

### curl example
```
curl -X POST http://localhost:3000/api/auth/dev/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```
