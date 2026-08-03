# Review Grader

Scores teams and individuals across the 4 capstone review checkpoints for the
Enterprise Trading Platform program - 6 fixed classes, 4 teams of 6 per class
(144 people), 11 sprints. Runs as one shared instance on a host machine's
local network - reviewers connect from their own devices over WiFi, and it
keeps working if the WiFi drops mid-review. UI is built on shadcn/ui.

## How it's organized

- **6 classes are auto-seeded on first run** (Class A-F, 4 teams of 6 each,
  random Indian names) - there's no "add a class" flow, since the program
  never has more than 6. Rename anyone, shuffle in fresh names, or add/remove
  teams and members from `/setup` as the real roster comes in.
- **Reviews** map onto the sprint table: R1 = Sprints 3-4 (Data Layer), R2 =
  Sprints 5-7 (Core Services & Integration), R3 = Sprints 8-9 (Security &
  Full-Stack UI), R4 = Sprints 10-11 (Capstone Extension & Deployment). Each
  review's rubric criteria (1-5 scale, Build vs. Security/OWASP) are drafted
  from that sprint range - see `src/lib/rubric-seed.ts`.
- **Scoring model**: each team gets a baseline score from the rubric criteria
  during their presentation. Each student's delta is computed from their
  individual Q&A: every rated question (Answered/Middle/Unanswered) counts
  toward an average - unrated (skipped) questions don't - which becomes their
  delta; a reviewer can still override it directly. At the end of a guided
  review, a **grace mark** can be added on top as a final judgment call.
  Final score = team average + delta + grace.
- **Data**: stored locally in SQLite at `~/.review-grader/review-grader.db`
  (each host machine keeps its own) - deliberately outside the project
  folder, so `next dev`'s file watcher doesn't treat every score save as a
  source change and reload the page. Override the location with
  `REVIEW_GRADER_DATA_DIR=/some/path`. **To reset all data**, stop the server
  and delete that directory (`rm -rf ~/.review-grader`), then restart - the 6
  classes and rubric reseed automatically. Client writes also go through an
  IndexedDB queue first, so scoring keeps working offline and syncs
  automatically once the connection comes back (offline edits always win on
  sync - see `src/lib/api-client.ts`).

## Running it

```bash
npm install
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

`-H 0.0.0.0` makes it reachable from other devices on the same WiFi/LAN at
`http://<host-machine-IP>:3000`. Use `npm run dev -- -H 0.0.0.0` instead
while iterating locally.

## Workflow

1. **Setup** (`/setup`) - the 6 classes are ready with full rosters. Paste a
   whole class's real roster in one go (one name per line) and hit "Apply to
   all teams" to fill every team's slots in order. Add/remove teams and
   members, or shuffle in a fresh random roster, at any time.
2. **Score** (`/score/[classId]`) - pick a review, pick a team, score the
   rubric criteria live, then work through each student's individual Q&A.
   Each student has a **"Simulate session"** button that generates 5
   *distinct* questions (no repeats across teammates in the same review),
   weighted toward whatever the team scored low or left unscored - each comes
   with a reviewer-facing note on what a strong answer covers. Rate each
   question Answered/Middle/Unanswered; only rated ones count toward the
   student's delta. The question bank is editable at `/questions`.
3. **Guided review** (`/review/[classId]/[reviewId]/[teamId]`, linked from
   the Score page) - runs an actual review end to end: a 20-minute
   presentation timer (score the rubric live while it runs), automatic
   hand-off to individual Q&A once time's up, one student at a time, and a
   final screen to add grace marks before marking the review complete. State
   persists server-side, so a refresh mid-session resumes where it left off.
4. **Stats** (`/stats/[classId]`) - a dashboard of team and student
   comparisons: team averages, trend across R1-R4, a class-wide Build vs.
   Security breakdown, a student leaderboard, score distribution, a
   criteria x team heatmap, a per-team radar of criteria strengths/gaps, a
   team-baseline-vs-individual-delta scatter, and a raw data table. Colors
   follow the dataviz skill's validated palette (`src/lib/chart-colors.ts`).
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
