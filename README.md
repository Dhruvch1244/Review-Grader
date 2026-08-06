# Review Grader

Scores teams and individuals across the 4 capstone review checkpoints for the
Enterprise Trading Platform program - 6 fixed classes, 4 teams of 6 per class
(144 people), 11 sprints. Runs as one shared instance on a host machine's
local network - reviewers connect from their own devices over WiFi, and it
keeps working if the WiFi drops mid-review.

## How it's built

An npm workspace with two apps:

- **`apps/api`** - Express + TypeScript + `better-sqlite3`. Owns the SQLite
  database, the rubric/question-bank logic, and every `/api/*` endpoint. In
  production it also serves the built Angular app as static files, so the
  whole thing runs as one process on one port.
- **`apps/web`** - Angular 17 (standalone components + signals). Talks to
  `apps/api` over `fetch()`, with an IndexedDB-backed offline queue so
  scoring keeps working if the WiFi drops mid-review (writes apply
  optimistically and sync once the connection's back).

## How it's organized

- **6 classes are auto-seeded on first run** (Class A-F, 4 teams of 6 each,
  random Indian names) - there's no "add a class" flow, since the program
  never has more than 6. Rename anyone, shuffle in fresh names, or add/remove
  teams and members from `/setup` as the real roster comes in.
- **Reviews** map onto the sprint table: R1 = Sprints 3-4 (Data Layer), R2 =
  Sprints 5-7 (Core Services & Integration), R3 = Sprints 8-9 (Security &
  Full-Stack UI), R4 = Sprints 10-11 (Capstone Extension & Deployment). Each
  review's rubric criteria (1-5 scale, Build vs. Security/OWASP) are drafted
  from that sprint range - see `apps/api/src/rubric-seed.ts`.
- **Scoring model**: each team gets a baseline score from the rubric criteria
  during their presentation. Each student's delta is computed from their
  individual Q&A: every rated question (Answered/Middle/Unanswered) counts
  toward an average - unrated (skipped) questions don't - which becomes their
  delta; a reviewer can still override it directly. At the end of a guided
  review, a **grace mark** can be added on top as a final judgment call.
  Final score = team average + delta + grace.
- **Data**: stored locally in SQLite at `~/.review-grader/review-grader.db`
  (each host machine keeps its own) - deliberately outside the project
  folder. Override the location with `REVIEW_GRADER_DATA_DIR=/some/path`.
  Client writes also go through an IndexedDB queue first, so scoring keeps
  working offline and syncs automatically once the connection comes back
  (offline edits always win on sync - see
  `apps/web/src/app/core/services/api-client.service.ts`).
- **Resetting data**: no need to touch the filesystem for this. A **"Reset
  team"** button on the Score page clears one team's scores, ratings, and
  question sessions (rosters and rubric stay put). A **"Reset all data"**
  button on `/setup` wipes every score/rating/session across all 6 classes
  the same way. To wipe everything including rosters, stop the server and
  delete `~/.review-grader` directly - the 6 classes and rubric reseed
  automatically on next start.

## Running it

```bash
npm install
npm run build
npm start
```

`npm run build` compiles the Express API and the Angular app, and copies the
Angular static build into `apps/api/public` so the API server can serve it.
`npm start` then runs one process (`apps/api`) on `PORT` (default 3001) and
`HOSTNAME` (default `localhost` - set `HOSTNAME=0.0.0.0` to make it reachable
from other devices on the same WiFi/LAN). The app opens straight to `/setup`
- that's the landing page.

While iterating locally, run the two apps separately instead:

```bash
npm run dev:api   # Express on :3001, via tsx watch
npm run dev:web   # Angular dev server on :4200, proxying /api to :3001
```

### Windows release (no install needed)

`.github/workflows/release.yml` builds a `review-grader-windows.zip`
containing one `review-grader.jar` and `scripts/windows/start.bat`. The jar
is entirely self-contained: `launcher/Main.java` (a small Java 17 program,
built on `windows-2022` so `better-sqlite3`'s native binary compiles for
Windows) is packaged together with a portable Node.js runtime and the built
Express server + Angular static assets as plain entries inside the same
jar. Running the jar extracts those next to itself once (skipped on later
runs) and spawns the bundled Node server - so there's nothing to install,
just one file to run. `start.bat` runs the jar with a portable Java 17
runtime bundled alongside it in the zip, so the end user doesn't need
Node, Java, or npm either.

The workflow runs whenever `main` is pushed/merged into the `release`
branch (tags the zip `v<package.json version>` and attaches it to a GitHub
Release), and also on publishing a Release manually or via
`workflow_dispatch`. To cut a new build: merge `main` into `release` and
push - no manual release-drafting needed. For someone who just wants to
run it:

1. Download and unzip `review-grader-windows.zip` from the
   [Releases](../../releases) page.
2. Double-click `start.bat`. It picks a random free-ish port and opens the
   app in the default browser once the server's ready. See
   `scripts/windows/README-WINDOWS.txt` (included in the zip) for how to
   stop it and where data is stored.

No Node.js, Java, npm, or any build step required on the end user's
machine.

## Workflow

1. **Setup** (`/setup`, the landing page) - the 6 classes are ready with full
   rosters. Paste a whole class's real roster in one go (one name per line)
   and hit "Apply to all teams" to fill every team's slots in order.
   Add/remove teams and members, or shuffle in a fresh random roster, at any
   time. "Reset all data" lives here too.
2. **Score** (`/score/:classId`) - pick a review, pick a team, score the
   rubric criteria live, then work through each student's individual Q&A.
   Each student's question session **generates and shows its questions
   automatically** - 5 *distinct* questions per student (no repeats across
   teammates in the same review), weighted toward whatever the team scored
   low or left unscored, each with a reviewer-facing note on what a strong
   answer covers, plus a **weak spot** badge when the question targets a
   criterion the team scored low or left unscored. Per-student progress
   (which questions are rated, and how) is stored and survives a reload;
   "Regenerate" resets that student's session. Rate each question
   Answered/Middle/Unanswered; only rated ones count toward the student's
   delta. The question bank is editable at `/questions`. A "Reset team"
   button clears one team's scores/ratings/sessions without touching the
   roster.
3. **Guided review** (`/review/:classId/:reviewId/:teamId`, linked from
   the Score page) - runs an actual review end to end: a 20-minute
   presentation timer (score the rubric live while it runs), automatic
   hand-off to individual Q&A once time's up, **all 6 teammates' question
   panels shown at once in a grid** so the whole team's Q&A can be rated in
   parallel instead of one student at a time, and a final screen to add
   grace marks before marking the review complete. State persists
   server-side, so a refresh mid-session resumes where it left off.
4. **Stats** (`/stats/:classId`) - a dashboard of team and student
   comparisons: team averages, trend across R1-R4, a class-wide Build vs.
   Security breakdown, a student leaderboard, score distribution, a
   criteria x team heatmap, a per-team radar of criteria strengths/gaps, a
   team-baseline-vs-individual-delta scatter, a **Score Health** stacked bar
   chart (Low/Mid/High criteria scores per review), and a raw data table.
   Colors follow the dataviz skill's validated palette
   (`apps/web/src/app/core/chart-colors.ts`).
5. **Normalize** (`/normalize`) - converts every student's overall score to a
   z-score against their own class's mean/spread, then to a 0-100 T-score, so
   classes graded at different levels of strictness become comparable.
6. **Export** - each class's data exports to `.xlsx` (Panelists, Roster,
   TeamScores, IndividualScores, Summary, Overall sheets) from the class
   list or the score page.
7. **Merge** (`/merge`) - once all classes/reviewers are done, upload
   everyone's exported `.xlsx` files here to get one consolidated master
   workbook with per-team and per-student scores across all 4 reviews. Runs
   entirely in the browser - nothing is uploaded to a server.

## Not built yet

An agent that reads each team's repo against the same rubric criteria to
pre-fill the team baseline score (instead of scoring from scratch) is a
planned phase 2, once repo access is sorted out.
