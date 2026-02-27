# IT Company CRM - Modern Architecture

This project has been restructured into a decoupled Frontend-Backend architecture.

## Folder Structure
- `/frontend`: React + Vite application.
- `/backend`: Node.js + Express + MongoDB application.

## Getting Started

### Frontend
1. Navigate to `frontend/`
2. Run `pnpm install`
3. Run `npm run dev`

### Backend
1. Navigate to `backend/`
2. Run `npm install`
3. Configure your MongoDB URI in `src/index.js` or a `.env` file.
4. Run `npm run dev`

## Migration Status
- [x] Removed PHP Backend (XAMPP/MySQL)
- [x] Removed Supabase APIs
- [x] Established decoupled structure
- [x] Added MongoDB (Mongoose) models for core entities
