# IT Company CRM - Modern Architecture

This project has been restructured into a decoupled Frontend-Backend architecture.

## Folder Structure
- `/frontend`: React + Vite application.
- `/backend`: Node.js + Express + MongoDB application.

## Getting Started

### Frontend
1. Navigate to `frontend/`
2. Run `pnpm install`
3. Run `npm run dev` (frontend will call API at `http://localhost:5001/api` by default or whatever `VITE_API_URL` is set to)

### Backend
1. Navigate to `backend/`
2. Run `npm install`
3. Configure your MongoDB URI in `src/index.js` or a `.env` file (see `.env.example`).
4. Set `PORT` to `5001` or your desired port.
5. Run `npm run dev`

### Production
- Frontend should be built with `VITE_API_URL=https://eri.errorinfotech.in:5001/api` so it targets the live backend.
- Backend should be served on port `5001` and proxied from `https://eri.errorinfotech.in/api` by your web server.

## Migration Status
- [x] Removed PHP Backend (XAMPP/MySQL)
- [x] Removed Supabase APIs
- [x] Established decoupled structure
- [x] Added MongoDB (Mongoose) models for core entities
