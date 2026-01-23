# Telegram Mini App Auth & Dev Flow

## Overview
The backend supports **two** authentication paths:

1. **Telegram WebApp (production-safe)** — validates `initData` signed by Telegram.
2. **Dev Login (non-production only)** — issues a short-lived JWT for local browser use.

The middleware always:

* **Prefers** `Authorization: Bearer <token>` when present (only allowed outside production).
* Otherwise uses `x-telegram-init-data` with **raw** `initData` from Telegram WebApp.

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
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Local dev flow (browser / localhost)
1. Start backend and frontend.
2. Open the frontend in a browser (not inside Telegram).
3. The **Dev Login** form will appear. Enter credentials from `DEV_AUTH_USERS` (or `DEV_AUTH_LOGIN` / `DEV_AUTH_PASSWORD`).
4. The frontend stores the JWT in `localStorage` and sends it as `Authorization: Bearer <token>`.

### curl example
```
curl -X POST http://localhost:3000/api/auth/dev/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Then:
```
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>"
```

## Telegram WebApp flow (inside Telegram)
1. Open the Mini App **inside Telegram**.
2. The frontend uses **raw** `window.Telegram.WebApp.initData` and sends it as:
   * `x-telegram-init-data: <initDataRaw>`
3. The backend verifies the signature and TTL.

### curl example
```
curl http://localhost:3000/api/me \
  -H "x-telegram-init-data: <initDataRaw>"
```

> ⚠️ Do **not** URL-decode or reconstruct the query string manually. Use the raw `initData` from Telegram.
