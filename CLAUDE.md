# Hour Power (trainerME): working notes

A personal training app for Anthony: hour power (best 60-min power) as the headline metric, a plan built around a time-crunched week, and a goal event (2027 GO4 Bathurst Cycling Festival, 147 km, 2,200 m, 18 April 2027).

## Workflow
- Develop on a working branch and open a pull request into `main`. Merge it yourself once tests, lint and the build pass. Anthony has said to merge whenever it makes sense.
- The app runs in Anthony's GitHub Codespace on the working branch. He gets updates with the **Update Hour Power** button on Today, which pulls that branch.
- Before pushing, run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npx next build`. Check UI changes in a browser at 390 px wide.

## Never
- Write the Strava Client Secret, the Intervals.icu API key or any token into the repo. They live in Codespaces secrets or `.env.local`.
- Commit anything in `data/`. That's personal Strava data, and it's git-ignored.
- Touch the AnthBuhagiar/nfl-draft-assistant repository. It is unrelated and must stay unaffected.

## Where things are
- `docs/product-strategy.md`: positioning, feature IDs (A1, B2, …) and the roadmap. Update it when scope changes.
- `docs/training-science.md`: evidence (E1–E8) that workouts and plans cite.
- `src/lib/engine`: hour-power estimate. `src/lib/plan`: weeks, phases, check-ins and targets. `src/lib/goals`: goals, finish time and fuel. `src/lib/route`: GPX and pacing. `src/lib/player`: Bluetooth trainer control. `src/lib/strava` and `src/lib/intervals`: integrations.
- `npm run inspect` runs the real-data inspection scripts in `scripts/` (needs a synced `data/`).
