# Slim30 Backend

Node.js backend API for Slim30.

## Quick Start

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Run migrations:

```bash
npm run migrate
```

4. Start development server:

```bash
npm run dev
```

## Current MVP Endpoints

- `GET /api/health`
- `GET /api/users/profile` (requires `x-user-id` header in dev)
- `PUT /api/users/profile` (requires `x-user-id` header in dev)
- `POST /api/uploads/avatar` (multipart, field: `avatar`, requires `x-user-id`)
- `GET /api/onboarding/answers` (auth required)
- `PUT /api/onboarding/answers` (auth required)
- `DELETE /api/onboarding/answers/:questionKey` (auth required)
- `GET /api/workouts/program` (auth required)
- `GET /api/workouts/program/:day` (auth required)
- `GET /api/progress/days` (auth required)
- `PUT /api/progress/days/:day` (auth required)
- `GET /api/progress/summary` (auth required)
- `GET /api/notifications/settings` (auth required)
- `PUT /api/notifications/settings` (auth required)
- `GET /api/notifications` (auth required)
- `POST /api/notifications` (auth required)
- `PUT /api/notifications/read-all` (auth required)
- `PUT /api/notifications/:id/read` (auth required)
- `GET /api/premium/status` (auth required)
- `POST /api/premium/trial/start` (auth required)
- `POST /api/premium/activate` (internal/admin only, requires `x-premium-admin-secret`)
- `POST /api/premium/webhook` (RevenueCat server-to-server)

## Auth

- `AUTH_MODE=auto` (default in development):
	- Uses Bearer JWT when provided.
	- Falls back to `x-user-id` in non-production.
- `AUTH_MODE=jwt`:
	- Requires `Authorization: Bearer <token>`.
	- Token must contain numeric `sub` or `userId`.
- `AUTH_MODE=dev`:
	- Uses `x-user-id`.
	- Disabled in production.

## Notes

- Firebase integration is intentionally deferred for now.
- Secrets must only be provided using environment variables.