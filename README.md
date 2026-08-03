# Review Grader

Scores teams and individuals across the 4 capstone review checkpoints for the
Enterprise Trading Platform program (6 classes, teams of ~6, 11 sprints).
Runs as one shared instance on a host machine's local network - panelists
connect from their own devices over WiFi, and it keeps working if the WiFi
drops mid-review.

## How it's organized

- **Reviews** map onto the sprint table: R1 = Sprints 3-4 (Data Layer), R2 =
  Sprints 5-7 (Core Services & Integration), R3 = Sprints 8-9 (Security &
  Full-Stack UI), R4 = Sprints 10-11 (Capstone Extension & Deployment). Each
  review's rubric criteria (1-5 scale, Build vs. Security/OWASP) are drafted
  from that sprint range - see `src/lib/rubric-seed.ts`.
- **Scoring model**: each team gets a baseline score from the rubric
  criteria during their presentation; each student then gets a -2..+2 delta
  during their individual Q&A slot. A student's final score for a review is
  `team average + their delta`.
- **Data**: stored locally in SQLite (`data/review-grader.db`, gitignored -
  each host machine keeps its own). Client writes go through an IndexedDB
  queue first, so scoring keeps working offline and syncs automatically once
  the connection comes back (offline edits always win on sync - see
  `src/lib/api-client.ts`).

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

1. **Setup** (`/setup`) - add each class with its headcount; teams of 6 are
   generated automatically. Paste a name list per team to autofill the
   roster whenever you have it (real names aren't required to start).
2. **Score** (`/score/[classId]`) - pick a review, pick a team, score the
   rubric criteria live, then score each student's individual delta during
   their slot. Everything autosaves.
3. **Export** - each class's data exports to `.xlsx` (Panelists, Roster,
   TeamScores, IndividualScores, Summary, Overall sheets) from the class
   list or the score page.
4. **Merge** (`/merge`) - once all classes/instructors are done, upload
   everyone's exported `.xlsx` files here to get one consolidated master
   workbook with per-team and per-student scores across all 4 reviews. Runs
   entirely in the browser - nothing is uploaded to a server.

## Not built yet

An agent that reads each team's repo against the same rubric criteria to
pre-fill the team baseline score (instead of scoring from scratch) is a
planned phase 2, once repo access is sorted out.
