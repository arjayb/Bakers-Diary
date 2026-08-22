# PROVE.md — Baker's Diary v0.1

This is not a declaration of success. It's the exact procedure to
independently verify the BUILD. Nothing in this file has been executed by
Claude — no live database, no network egress, and no browser were available
during BUILD. Every gate below is genuinely **NOT VERIFIED** until ADAM (or
Chef Kats) runs it for real.

Work through the gates in order. Stop at the first failure — later gates
generally assume earlier ones passed.

---

## P0 — Environment
**Command:** `node --version`
**Expected:** v20.x or later
**Failure meaning:** Wrong Node version — install 20+ before continuing.
**Stop/go:** STOP if wrong version.

## P1 — Dependencies
**Command:** `cd backend && npm install && cd ../frontend && npm install`
**Expected:** Both complete with no `npm error`, no `--legacy-peer-deps` needed.
**Failure meaning:** A dependency conflict — do not force-install with legacy flags; investigate the actual conflict first.
**Stop/go:** STOP on install failure.

## P2 — Secrets hygiene
**Command:** `git status` (after `git init` if not already a repo) and `cat backend/.gitignore`
**Expected:** `.env` is untracked/ignored in both backend and frontend; `.env.example` contains only placeholders (`grep -i "replace" backend/.env.example` should show every credential line).
**Failure meaning:** A real secret got committed or `.env` isn't ignored.
**Stop/go:** STOP and remove/rotate any exposed secret before continuing.

## P3 — Database
**Command:**
```
cd backend
DATABASE_URL="<real connection string>" npm run db:push
```
**Expected:** Prisma reports the schema was applied, lists the 11 new tables, **does not** ask for `--accept-data-loss`.
**Failure meaning:** If Prisma reports a data-loss operation is required, STOP — this schema was designed to be additive against a fresh database; a data-loss prompt on a fresh DB means something is wrong with the environment, not the schema.
**Stop/go:** STOP on any data-loss prompt or error.

## P4 — Backend startup
**Command:** `npm run dev` (in `backend/`, with a real `.env`)
**Expected:** Console prints `Baker's Diary API listening on port 5000` (or your configured port), no uncaught exceptions.
**Failure meaning:** Missing/invalid env var, or a require() path error.
**Stop/go:** STOP on crash.

**Command:** `curl http://localhost:5000/api/health`
**Expected:** `{"success":true,"message":"Baker's Diary API is running"}`
**Stop/go:** STOP if not reachable.

## P5 — Seed + Authentication
**Command:** `SEED_ADMIN_PASSWORD="testpass123" npm run seed`
**Expected:** Console confirms the account and 4 demo recipes were created.

**Command:**
```
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"testpass123"}'
```
**Expected:** `{"success":true,"token":"...","user":{...}}`
**Failure meaning:** Wrong password test should separately return 401 — verify that too: `-d '{"password":"wrong"}'` should give `{"success":false,"message":"That password is not right."}`.
**Stop/go:** STOP if either check fails.

## P6 — Recipe CRUD
With the token from P5 as `$TOKEN`:
**Command:** `curl http://localhost:5000/api/recipes -H "Authorization: Bearer $TOKEN"`
**Expected:** 4 seeded recipes returned.
**Command:** `curl http://localhost:5000/api/recipes/<no-token>` (omit the header)
**Expected:** 401, not the recipe data — confirms protected-route enforcement.
**Stop/go:** STOP if an unauthenticated request returns data.

## P7 — Media
**Command:** Upload a real image via `curl -F "photo=@/path/to/test.jpg" http://localhost:5000/api/media -H "Authorization: Bearer $TOKEN"`
**Expected:** `{"success":true,"asset":{"url":"https://res.cloudinary.com/...",...}}`
**Failure meaning:** Cloudinary credentials wrong/missing, or file too large.
**Stop/go:** Note failure and continue — media isn't required for P8-P13's core flow to be checkable, but flag it as a known issue if it fails.

## P8 — Converter
**Command:**
```
curl -X POST http://localhost:5000/api/conversions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"value":2.5,"fromUnit":"cup","toUnit":"g","ingredientName":"All-purpose flour"}'
```
**Expected:** A `result.value` around 313 (verified by Claude during BUILD via direct execution — see BUILD handoff).
**Command:** Same but with `"toUnit":"g"` and NO `ingredientName` and `fromUnit":"cup"`.
**Expected:** 400 error, not a guessed number.
**Stop/go:** STOP if a volume→weight conversion succeeds without an ingredient name.

## P9 — Cook Mode
**Command:** `curl -X POST http://localhost:5000/api/sessions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"recipeId":"<a real recipe id from P6>"}'`
**Expected:** New session with `bakeNumber`, `steps` array matching the recipe's step count.
**Stop/go:** STOP if steps don't match, or bakeNumber isn't sequential on a second session for the same recipe.

## P10 — Persistence / Resume
**Command:** `curl -X PATCH http://localhost:5000/api/sessions/<id>/progress ... -d '{"stepUpdates":[{"sessionStepId":"<id>","completed":true}]}'`, then `GET /api/sessions/continue`
**Expected:** The in-progress session is returned with that step's `completed: true`.
**Stop/go:** STOP if progress isn't reflected.

## P11 — Journal
**Command:** `PATCH /api/sessions/<id>/complete` with a rating, then `GET /api/journal`
**Expected:** The completed session appears, sorted most-recent-first.
**Stop/go:** STOP if it's missing or `status` isn't `completed`.

## P12 — Nutrition
**Command:** `GET /api/recipes/<id>/nutrition -H "Authorization: Bearer $TOKEN"`
**Expected (with a real USDA key configured):** Real per-serving numbers, `unmatchedIngredients` empty or minimal.
**Expected (without a USDA key):** All ingredients land in `unmatchedIngredients`, totals are 0 — this is correct honest behavior per the provider abstraction, NOT a bug.
**Stop/go:** Go either way — this gate is about confirming the honest-degradation behavior, not requiring a live key.

## P13 — Grocery List
**Command:** `POST /api/groceries/from-recipe/<id>`, then `GET /api/groceries`
**Expected:** All of that recipe's ingredients now appear as grocery items.
**Stop/go:** STOP if items are missing or malformed.

## P14 — Frontend production build
**Command:** `cd frontend && npm run build`
**Expected:** Completes with no errors, produces `frontend/dist`.
**Failure meaning:** A JSX/import error Claude's manual bracket-balance and import-resolution checks (see BUILD handoff) didn't catch — those checks are not a substitute for an actual bundler run.
**Stop/go:** STOP on build failure; this is the first genuinely authoritative frontend correctness check.

## P15 — Responsive/browser smoke test
**Manual:** Open the built app at 390×844 (mobile) and at a desktop width. Walk through: Login → Dedication → Dashboard → open a recipe → Start a Bake → complete a step with a note and photo → leave the bake → confirm it shows under Continue Your Journey → resume → complete it → find it in Journal → check its Nutrition.
**Expected:** Every step in that chain works without a console error.
**Stop/go:** This is the real acceptance test from §40 of the build spec. STOP and log specifics for anything that breaks.

## P16 — Git hygiene
**Command:** `git log --all -p | grep -iE "password|secret|api_key" ` (or equivalent secret-scan)
**Expected:** No hits outside of variable names/placeholders.
**Stop/go:** STOP and rotate credentials if a real secret is found in history.

## P17 — Release candidate
**Criteria:** P0–P16 all passed, or failures are explicitly logged as known issues in the BUILD handoff's KNOWN ISSUES section.
**Go:** Ready for POLARIS/Founder review.
