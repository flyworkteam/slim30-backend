# Slim30 Auth Strategy (Phase 1)

## Goal
- Use JWT as the production-ready auth path.
- Keep development productivity high with temporary dev-header fallback.
- Stay compatible with future Firebase integration.

## Modes

### `AUTH_MODE=auto`
- Development default.
- If `Authorization: Bearer <token>` is provided, JWT verification is used.
- If no bearer token is provided and environment is not production, `x-user-id` fallback is used.

### `AUTH_MODE=jwt`
- Recommended for production.
- Requires `JWT_SECRET` and a bearer token.
- Accepts `sub` or `userId` claim (must be numeric).

### `AUTH_MODE=dev`
- Temporary development mode.
- Uses `x-user-id` request header (or `DEFAULT_DEV_USER_ID`).
- Rejected in production.

## JWT Claim Contract
- Required:
  - `sub` or `userId` (numeric user id)
- Optional:
  - `firebase_uid` (reserved for Firebase-compatible identity mapping)

## Security Notes
- Do not keep `AUTH_MODE=dev` in production.
- Rotate JWT secret if exposed.
- Keep secrets only in `.env`, never in repository templates.

## Next Phase (Firebase)
- Add Firebase Admin SDK verification path.
- Map Firebase UID to local `users` row via `users.firebase_uid`.
- Keep route middleware contract unchanged (`req.userId` remains required).
