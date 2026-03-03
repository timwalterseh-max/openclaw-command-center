# OpenClaw Command Center

Command Center GUI scaffold for managing OpenClaw sessions, tools, and jobs through a typed local bridge.

## Repository Layout

- `gui/` React + Vite frontend
- `bridge/` Fastify + WebSocket backend bridge
- `docs/` architecture and contract docs
- `WEEK1.md` execution board
- `PHASE0.md` intake/alignment checklist

## Quick Start

1. Install dependencies:
```bash
cd gui && npm install
cd ../bridge && npm install
```
2. Run bridge:
```bash
cd bridge
npm run dev
```
3. Run GUI:
```bash
cd gui
npm run dev
```

## Current Status

Day 1 closeout and Day 2 contract/stub work are complete.
- GUI and bridge dependencies installed
- Build verified for both apps
- Dev servers verified (`gui` on 5173, `bridge` on 4000)
See `WEEK1.md` for next milestones.
