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

- **Amplitude (ψ)** is the one resource. Tap the orb to observe, or buy buildings.
- **Four buildings.** Qubits (Σ) add ψ. Superposition Gates (×), Entanglement Lattices (⊗) and Reality Branches (∥) each create the tier below, so growth compounds. Owning 10, 25 and 50 of a building doubles its output.
- **Ten upgrades** are one-time boosts for the current reality.
- **Superposition Surge** is the active ability: ×5 output for 12 s, 60 s recharge.
- **Collapse** (prestige) resets the reality for Echoes (ε). Each Echo gives +10% production and 0.5% off building costs (max 30%). Echoes earned = floor(sqrt(run ψ / 1,000,000)).
- **Offline progress** runs for up to 8 hours at 50% efficiency (80% with Persistent State).
- **Save, export and import** are in the System tab. Export gives a `NUMERIC1:` code you can paste on another device.

## Code map

```
src/game/      pure game logic: data, engine, reducer, save, store, audio, tutorial
src/hooks/     React bindings for the store and small UI hooks
src/components UI: stage (orb, equation, surge) and one panel per tab
public/        manifest, service worker, icons
```

`engine.ts` integrates production in closed form, so one call is exact for any time step. That is what makes offline progress a single calculation. Numbers are plain doubles (ceiling about 1.8e308); all formatting and clamping goes through `src/game/math.ts` so an arbitrary-precision type can be swapped in later.

## Tuning

Everything balance-related is in `src/game/data.ts`: building costs and rates, upgrade costs, Surge, Echo formula, offline caps.
