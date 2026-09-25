# HireTrack — Frontend

React + Vite single-page application for HireTrack, an AI-powered job application management system.

## Stack
- React 18, Vite, **JavaScript** (not TypeScript — intentional, see docs/DECISIONS.md ADR-002)
- Axios (HTTP client), React Router (routing)
- Vanilla CSS with design tokens per `../docs/DESIGN.md`
- No UI component library — design system is custom

## Documentation
All project documentation lives in `../docs/` (shared parent workspace):
- `../docs/PRD.md` — product requirements
- `../docs/ARCHITECTURE.md` — system architecture and layering
- `../docs/API.md` — full endpoint contract (coordination boundary with backend)
- `../docs/DESIGN.md` — design system, tokens, component rules
- `../docs/TASKS.md` — task breakdown and implementation order

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- Backend running on `http://localhost:8080` (see `../backend/README.md`)

### Setup
```bash
cp .env.example .env
# .env.example already contains the correct local dev value:
# VITE_API_BASE_URL=http://localhost:8080
```

### Run
```bash
npm run dev
```
App opens on `http://localhost:5173`.

### Build
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Source Structure
```
src/
├── api/           — Axios instance (TASK-003); auth interceptor (TASK-010)
├── auth/          — AuthContext, ProtectedRoute, Login/Register pages (TASK-009/010)
├── applications/  — Application list, form, detail, status, tags (TASK-014–017, 021)
├── interviews/    — Interview timeline (TASK-019)
├── dashboard/     — Dashboard page (TASK-023)
├── assistant/     — AI chat UI (TASK-030)
├── components/    — Shared reusable UI components
├── styles/        — Design tokens (tokens.css) — all CSS variables
├── lib/           — Constants (status/outcome enums, route paths)
├── App.jsx        — Root component with BrowserRouter and route declarations
└── main.jsx       — Vite entry point
```

## Environment Variables
| Variable | Description | Local default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL — no trailing slash | `http://localhost:8080` |
