# Cookibud Front

Front end of the Cookibud Web App to help plan your meals.

## Features

- Recipe browsing and detailed recipe view
- Authentication (login / register) backed by the Cookibud API
- Create, edit and save personal recipes (when connected to API)
- Offline caching for recently viewed recipes (IndexedDB)
- Responsive UI with dark mode support

## Stack

- Vite + React + TypeScript
- Tailwind CSS (or utility-first CSS via the component library)
- @soilhat/react-components (shared UI primitives)
- i18next for translations
- Local IndexedDB for offline caching
- Cookibud API (FastAPI) as the backend

## Install + Run

### Prerequisites
- Node 18+ and npm (or pnpm/yarn)
- Python 3.10+ and the Cookibud API running locally (see `../cookibud-api`)

### Install dependencies

Make sure you added `.npmrc` file based on template inside `cookibud-front`

Open a terminal at the `cookibud-front` folder and run:

```cmd
cd cookibud-front
npm install
```

### Run in development

The project uses Vite. To start the dev server:

```cmd
npm run dev
```

This starts the frontend on http://localhost:5173 by default.

### Environment

To override the API base URL create a `.env` file in `cookibud-front` with:

```
VITE_API_BASE_URL=http://localhost:8000
```

Restart the dev server after editing environment variables.

## Deploy + Release

### Build for production

```cmd
npm run build
```

The built files are produced in `dist/`. You can serve them with any static web server, CDN or integrate into a deploy pipeline (Netlify, Vercel, static hosting behind a reverse proxy).

### Recommended static serve (example)

```cmd
npm install -g serve
serve -s dist
```

### Release notes
- Use semantic commits / changelog tooling to track releases.
- Tag releases in git and publish the deployment artifact from CI.

## Architecture

The frontend is a single-page application built with React and Vite. Key responsibilities:

- Routing: `react-router` provides routes for authentication and recipe pages.
- State & data: small, local state for form inputs and IndexedDB (via `src/services/idb.ts`) for offline caching; API calls are centralized in `src/services/api.ts`.
- Components: UI primitives are provided by `@soilhat/react-components` and local wrappers live under `src/pages` and `src/routing`.
- Internationalization: `i18next` is configured in `src/i18n.ts` with strings under `public/i18n`.

### Development notes
- Keep API access logic in `src/services` and small focused components in `src/pages` to simplify testing and future refactors.
