# HireTrack — Frontend

React + Vite single-page web application for HireTrack, an AI-powered job application management system.

## Tech Stack
- **React 19** (`^19.2.8`), **Vite** (`^8.3.0`), **JavaScript** (ESNext modules)
- **React Router v7** (`^7.18.4`) — Client-side SPA routing
- **Axios** — HTTP client with auth token interceptor and global error handling
- **PDF & Document Parsing**: `pdfjs-dist` (`^6.3.289`) for client-side PDF resume text extraction
- **Markdown Rendering**: `react-markdown` & `remark-gfm` for rendering rich AI assistant responses
- **Styling & Design System**: Custom Vanilla CSS with Design Tokens (`tokens.css`)

## Design System & Typography
The UI is built with a custom design system and aesthetic:
- **Typography**: 
  - Primary UI & Body: `JetBrains Mono`
  - Code & Timestamps: `JetBrains Mono`
  - Header Badge / Sender Stamp: `VT323` (Terminal-style character stamp)
- **Color Palette**: Warm off-white background (`#F8F7F4`), clean elevated surfaces (`#FFFFFF`), forest green brand accent (`#2A5C4B`), and structured semantic status indicators.
- **Micro-Interactions**: Custom focus indicators, smooth transitions, modal overlays, drag-and-drop dropzone, and responsive layouts.

## Key Features
- **User Authentication**: JWT-based user login and registration with automatic token persistence and session isolation.
- **Application Tracking**: Create, view, update, filter, and delete job applications with status, job role, dates, notes, and salary info.
- **Interview Timeline**: Track multi-round interview schedules, types (Technical, HR, Behavioral), notes, and outcomes (Pending, Passed, Failed).
- **Tag Management**: Custom colored tags for filtering and grouping job applications.
- **Metrics Dashboard**: Dynamic application status metrics, interview success rates, and pipeline overview.
- **Client-Side Resume Parsing**: Drag-and-drop resume upload supporting PDF (`.pdf`), text (`.txt`), and markdown (`.md`). Text extraction is performed **entirely client-side in the browser** using `pdfjs-dist`; raw binary files are never transmitted to the backend server.
- **AI Career Assistant**: Interactive Groq-backed career coach featuring conversation persistence in `localStorage`, per-user history clearing on logout, and targeted prompt scoping to specific job applications.

---

## Documentation
All project documentation lives in `../docs/`:
- `../docs/PRD.md` — Product requirements
- `../docs/ARCHITECTURE.md` — System architecture and frontend layering
- `../docs/API.md` — REST API specification
- `../docs/DESIGN.md` — Comprehensive design system rules and token specs

---

## Local Development

### Prerequisites
- **Node.js 18+**
- **npm 9+**
- HireTrack Backend running on `http://localhost:8080` (see `../backend/README.md`)

### Setup
1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   The `.env` file should set:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Development Server
```bash
npm run dev
```
Access the web application at `http://localhost:5173`.

### Production Build
Build optimized production bundle:
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

---

## Source Directory Structure

```
src/
├── api/           — Axios instance with bearer token interceptor and 401 error handler
├── auth/          — AuthContext provider, ProtectedRoute component, Login & Register pages
├── applications/  — Application list, search/filter bar, detail view, create/edit modals
├── interviews/    — Interview round timeline, create/edit interview modal
├── tags/          — Tag creation and assignment components
├── profile/       — Profile & Master Resume editor, client-side PDF dropzone parser
├── dashboard/     — Aggregated pipeline metrics, status breakdown cards, upcoming interviews
├── assistant/     — AI Chat panel, prompt builder options, localStorage chat history hook
├── lib/           — Client-side file parser (pdfjs-dist integration), status enums, constants
├── styles/        — Design tokens (tokens.css) containing all CSS custom properties
├── components/    — Shared UI components (Navbar, Modal, Alert, LoadingSpinner)
├── App.jsx        — Main application router and shell layout
└── main.jsx       — React 19 application entry point
```
