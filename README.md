# Civil Elite MERN App

## Scripts

- Install dependencies for both client and server:
  - `npm run install:all`
- Run client and server in dev mode:
  - `npm run dev`

## Ports

- Client (Vite): http://localhost:5173
- Server (Express): http://localhost:5000

## API

- Health check: `GET /api/health`

## Password Reset Email

Set one of the following in the server environment so forgot-password codes can be emailed:

- `SMTP_URL` or
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

Optional:

- `SMTP_FROM`
- `FRONTEND_URL`
