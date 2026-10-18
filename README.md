# Numeric

A quantum idle strategy game about parallel realities. Built mobile-first with React, TypeScript, Tailwind CSS v4 and Vite. It is a PWA, so it installs to the home screen and runs offline.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, also reachable from your phone on the same Wi-Fi
npm run build      # type-checks, then builds to dist/
npm run preview
```

Requires Node 20.19 or newer.

## Deploy to Vercel

Import the repository in Vercel. The Vite preset is detected automatically (build command `npm run build`, output `dist`). No environment variables are needed: saves live in the browser's `localStorage`.

On a phone, open the deployed URL and use "Add to Home Screen" to install.

## How the game works

Framing: ψ is a research budget, buildings are research projects, taps are observation, and Collapse means publishing the lab.

- **Amplitude (ψ)** is the one resource. Tap the orb to observe, or fund projects.
- **Four projects.** Qubits (Σ) add ψ. Superposition Gates (×), Entanglement Lattices (⊗) and Reality Branches (∥) each create the tier below. Cost growth is 1.22 / 1.65 / 1.85 / 2.05. Owning 10, 25 and 50 doubles output; Qubits and Gates also have a 100 milestone.
- **Ten upgrades** are one-time boosts for the current lab.
- **Research trees** (Upgrades tab, once a lab has produced 2,000 ψ or after any Collapse) are three lines: Grant Optimization (funds), Deep Observation (observation) and Experiment Calibration (experiments). Each has a Main upgrade with 3 stages and two Sub-upgrades. A Main stage unlocks when both Subs are at the current cap, which grows 4, 6, 8. Main stages give flat bonuses and each costs 5x the stage before. Sub ranks get dearer with every rank, and 5x dearer again for each Main stage already bought. All are paid in ψ. Research resets when the lab closes. Fully ranking all three lines in one lab is the Fabric completion condition and is tracked for it.
- **Autobuyers** (Collapse tab) unlock after 10 Echoes earned in total. One per project, paid for in Echoes. The Qubit one costs 10 and each later project's costs 4x the one before (10, 40, 160, 640). Each ladder step costs 10x the previous. Install, then upgrade through ×1, ×2, ×4, ×16, ×32 and Max. Each triggers every second, buys the highest project first, waits while an experiment forbids a purchase, and can be paused from the Projects tab. They persist through Collapse and do not run offline. Spending Echoes does not weaken the Echo bonuses, which follow Echoes earned.
- **Surge** is ×2 output for 10 s, 45 s recharge. While it runs you can observe any experiment instantly.
- **Experiments are manual tasks.** Every project above Qubits starts a task with a clock: *earn* some ψ (sometimes without funding one tier), *fund* a project, *tap* the orb, or *hold* and fund nothing. Complete it for 15 s of production and +5 stability. Miss the clock or break the condition and the lab loses 8-15% of current ψ and 10-20 stability. Surge lets you observe any experiment, which completes its task instantly.
- **Stability** is never shown as a number. Zones: Stable (70+), Strained (40-69), Critical (15-39), Collapse imminent (0-14). The background, orb, vignette and notebook change with the zone.
- **Neutralize** a failure within 90 s for 50% of your current ψ; it restores 15 stability. Ignored failures keep draining.
- **Log.** Dr. Vey narrates in a single `[ LOG: ... ]` line: the old text deletes backward, a static burst plays, the new line types at about 30 characters per second, and a tap skips to the full text. A short opening plays once on a new game.
- **Flavour.** Numbers pick up a faint double image when the lab is Strained or worse, and a `|ψ⟩` glyph appears beside the counter at very large values.
- **Black hole.** After 20 s at zero stability the lab collapses and pays 0.5x Echoes.
- **Collapse** publishes the lab for Echoes (ε): +10% production and 0.5% off costs each (max 30%). Echoes = floor(sqrt(run ψ / 2e11)) x a risk multiplier (1.0 up to 1.5x for surviving risky experiments).
- **Legacy.** Banked Echoes give a capped starting ψ grant in the next lab, and the riskiest experiment you survived makes that project tier visible one tier earlier.
- **Offline progress** runs up to 8 hours at 50% efficiency (80% with Persistent State). Experiments pause while away.
- **Save, export and import** are in the System tab (`NUMERIC1:` code). Version 1 saves migrate automatically.

## Echo divisor guide

`ECHO_DIVISOR` in `src/game/data.ts` sets how long a first Echo takes with optimal play (simulated, attentive player):

| Divisor | Run ψ for 1 Echo | Approx. time |
| ------- | ---------------- | ------------ |
| 2e11    | 2e11             | ~41-44 min   |
| 1e12    | 1e12             | ~52 min      |
| 1e13    | 1e13             | ~1 h 14 min  |
| 1e14    | 1e14             | ~1 h 56 min  |
| 1e15    | 1e15             | ~3 h 09 min  |

Times for a player who skips experiments are similar until stability collapses (about 23-30 min with no neutralizing).

## Code map

```
src/game/      pure game logic: data, engine, lab (experiments, stability), research, autobuyers, autorun, narrative, sim, reducer, save, store, audio, tutorial
src/hooks/     React bindings for the store and small UI hooks
src/components UI: stage (orb, equation, surge) and one panel per tab
public/        manifest, service worker, icons
```

`engine.ts` integrates production in closed form, so one call is exact for any time step. That is what makes offline progress a single calculation. Numbers are plain doubles (ceiling about 1.8e308); all formatting and clamping goes through `src/game/math.ts` so an arbitrary-precision type can be swapped in later.

## Tuning

Everything balance-related is in `src/game/data.ts`: project costs and rates, upgrade costs, research tree costs and effects, autobuyer costs, Surge, experiment and stability constants, Echo formula, offline caps.
