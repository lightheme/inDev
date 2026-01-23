# Auth (JWT)

## Overview
The backend supports a single authentication path:

1. **JWT login** — `/auth/login` accepts `login`/`password`, auto-creates the user on first
   login, and returns a JWT.

All protected endpoints require `Authorization: Bearer <token>` in every environment.

## Environment variables

### Backend (`backend/.env`)
```
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

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
