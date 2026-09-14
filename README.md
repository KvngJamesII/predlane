# PredLane

**Trade the future on Solana.** Perpetuals + prediction markets in one mobile-friendly desk.

Built for the [Perps and Prediction Markets](https://hackathons.solana.com/hackathons/perps-and-prediction-markets) hackathon ($100K · deadline 25 Sep 2026).

## Live demo

**https://kvngjamesii.github.io/predlane/**

## Problem

Perps and prediction markets are booming — but traders bounce between venues, wallets, and UIs. PredLane is a unified Solana-native desk: browse event markets and crypto perps, size trades with leverage/margin previews, and track open positions — all in demo mode with zero wallet required.

## What it does

| Feature | How |
|---------|-----|
| Market list | Mock event markets (macro, crypto, Solana, policy) + live crypto marks via public APIs |
| Trade ticket | YES/NO (predictions) or Long/Short (perps) with size, mock leverage, margin & PnL preview |
| Positions | Open/close positions with unrealized PnL; optional **Seed judge demo** |
| Portfolio | Demo USDC + equity + closed PnL; export/import JSON; `localStorage` |
| Market rows | Mark, 24h %, volume; size/leverage quick chips on the ticket |
| Judge docs | [`docs/JUDGES.md`](docs/JUDGES.md) · submit draft [`docs/SUBMIT.md`](docs/SUBMIT.md) |
| Demo mode | Full UX without connecting a wallet |
| Optional wallet | `@solana/wallet-adapter` (Phantom / Solflare) — never required for demo |

## Why Solana

- Sub-second settlement and cents-level fees for high-frequency risk management
- Shared liquidity + composability (collateral, oracles, keepers on one L1)
- Same Phantom / Solflare wallets traders already use
- 24/7 markets — no traditional exchange clock

## Quick start

```bash
cd web
npm install
npm run dev
```

```bash
npm run build    # dist/ for GitHub Pages (base /predlane/)
npm run deploy   # gh-pages → kvngjamesii.github.io/predlane/
```

## Stack

- Vite + React + TypeScript
- Dark, mobile-friendly UI
- Optional `@solana/wallet-adapter`
- Public price APIs for live crypto marks (falls back to mocks)

## Hackathon

- Listing: https://hackathons.solana.com/hackathons/perps-and-prediction-markets
- Owner: IdleDev / KvngJamesII
- Payout wallet (docs): `2Uup61Xjcqpyh9jfSNKBfHr4J1Ju7qjzDyUzFpdmduwW`

## Disclaimer

Demo only — not financial advice. Positions and balances are local mocks for product UX. Production would wire oracles, matching, and on-chain settlement.

## License

MIT
