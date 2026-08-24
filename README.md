# Baker's Diary v0.1

Chef Kats' private digital cookbook and culinary journal.

> Your Recipes. Your Journey. Your Story.

## Product overview

Baker's Diary is a single-user (Chef Kats only, v0.1) recipe library with a
core distinction: a **Master Recipe** (the canonical, current version of a
recipe) is separate from a **Bake/Session** (what actually happened during
one attempt at cooking it). A recipe isn't just stored — its development
over repeated bakes is preserved, without silently overwriting the master
recipe.

Core features: recipe authoring (Basics → Ingredients → Method → Review),
interactive Cook/Bake Mode with autosave and resumable sessions, a
chronological Journal of past bakes, an ingredient-density-aware Unit
Converter, USDA/Open Food Facts-backed Nutrition calculation, and a modest
Grocery List. Two themes — Night Kitchen (default) and Day Kitchen.

## Architecture

```
bakers-diary/
├── backend/     Node.js + Express + Prisma + PostgreSQL
│   ├── prisma/schema.prisma      All 11 domain models
│   ├── src/controllers/          One file per domain area
│   ├── src/routes/               Thin route -> controller wiring
│   ├── src/services/             conversionService, nutritionProvider, mediaService
│   ├── src/middleware/           auth, error handling
│   └── scripts/                  seed.js (one-time initial data)
└── frontend/    React (Vite) + React Router, no CSS framework
    ├── src/theme/                tokens.css (both themes), ThemeContext
    ├── src/api/client.js         Every backend call goes through here
    ├── src/context/AuthContext   Login state, ProtectedRoute
    ├── src/components/           Nav, Timer, PhotoUpload, StarRating, ProgressBar
    └── src/pages/                One file per screen
```

**Where things live** (per the build spec's request to identify this
explicitly):
- Theme tokens: `frontend/src/theme/tokens.css`
- Nutrition provider abstraction: `backend/src/services/nutritionProvider.js`
- Conversion logic: `backend/src/services/conversionService.js`
- Authentication logic: `backend/src/middleware/auth.js` + `backend/src/controllers/authController.js`

## Requirements

- Node.js 20+
- A PostgreSQL database (Neon, Supabase, or local Postgres all work)
- A free Cloudinary account (media storage)
- A free USDA FoodData Central API key (nutrition) — optional; nutrition
  degrades to "unmatched" gracefully without it, per the provider
  abstraction's design

## Installation

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Environment variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/`, and fill
in real values. **Never commit `.env`.** See `backend/.env.example` for the
full list with explanations of what each one is for.

## Database setup

```bash
cd backend
npm run db:push       # applies prisma/schema.prisma to your database
npm run db:generate   # regenerates the Prisma client
```

## Seed instructions

```bash
cd backend
SEED_ADMIN_PASSWORD="choose-a-real-password" npm run seed
```

This creates the single Chef Kats account and four demo recipes (Chocolate
Babka with an in-progress Bake, Classic Croissants, Sourdough Country Loaf,
Lemon Blueberry Cake with one completed, rated Bake). Re-running the seed
script after a user already exists is a safe no-op.

## Development commands

```bash
# backend
cd backend && npm run dev      # nodemon-style watch on server.js

# frontend
cd frontend && npm run dev     # Vite dev server on :5173
```

## Production build

```bash
cd frontend && npm run build   # outputs frontend/dist
cd backend && npm start        # runs server.js directly
```

## Testing instructions

There is no automated test suite in v0.1. See `PROVE.md` for the manual verification procedure to run against a controlled environment.

## Nutrition provider setup

1. Get a free key at https://api.data.gov/signup/
2. Set `USDA_FDC_API_KEY` in `backend/.env`
3. Open Food Facts needs no key (public API), used as a supplementary
   fallback for branded products.

Without a USDA key, nutrition resolution returns `unmatched` for every
ingredient rather than failing — see `nutritionProvider.js`'s
`unavailable` handling.

## Media setup

Cloudinary, chosen for its free tier and built-in upload-time
resize/compression (see `backend/src/services/mediaService.js` for the
full rationale). Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET` in `backend/.env`. Credentials never reach the
browser — uploads go through `/api/media`, which is the only thing
holding the API secret.

## Deployment considerations

- `CORS_ORIGIN` in backend `.env` must match wherever the frontend is
  actually deployed.
- `JWT_SECRET` must be a real random value in production, not the
  placeholder.
- This version has **not** been deployed. See `PROVE.md` for the documented verification scope and current limitations.


---

## About KELBRIC Technologies

We turn practical ideas and operational needs into focused digital products through rapid prototyping and evidence-based iteration.

**Public product process:** DISCOVER → DESIGN → BUILD → PROVE

© 2026 KELBRIC Technologies.
