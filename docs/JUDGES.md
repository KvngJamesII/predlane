# PredLane — judge walkthrough

**Live demo:** https://kvngjamesii.github.io/predlane/  
**Repo:** https://github.com/KvngJamesII/predlane  
**Hackathon:** [Perps and Prediction Markets](https://hackathons.solana.com/hackathons/perps-and-prediction-markets) · $100K · due Sep 25, 2026  
**Payout wallet (docs):** `2Uup61Xjcqpyh9jfSNKBfHr4J1Ju7qjzDyUzFpdmduwW`  
**Owner:** IdleDev / KvngJamesII · MIT · no secrets

## 60-second path (no wallet)

1. Open the live demo — **Demo mode** is on by default; do **not** connect Phantom.
2. Optional shortcut: hero card **Seed judge demo (YES + LONG)** opens a sample prediction + SOL perp, then jumps to **Positions**.
3. **Markets & Trade** — browse prediction markets (YES/NO) and crypto perps (Long/Short). Rows show mark, 24h %, and volume. Live perp marks come from CoinGecko (falls back to mocks + toast if offline).
4. Select a market → pick **YES/NO** or **LONG/SHORT** → use size/leverage chips or type values → **Open … (demo)**.
5. **Positions** — mark, margin, uPnL, ROE → **Close** to realize PnL.
6. **Portfolio** — equity / cash / uPnL + closed history; **Export JSON** / **Import JSON** for handoff; reset restores $10k.

Wallet connect is optional and never required to evaluate UX.

## What to look for

| Angle | PredLane |
|-------|----------|
| Unified desk | Event markets + perps in one mobile-friendly UI |
| Trade ticket | Clear YES/NO vs Long/Short; margin / notional / approx. liq preview |
| Persistence | Open + closed positions + cash in `predlane.portfolio.v1` |
| Resilience | Skeleton while loading; toast + mock marks if price API fails |
| Handoff | Portfolio export/import JSON; seed judge demo for empty books |
| Why Solana | Sub-second risk updates, composable collateral/oracles, same Phantom UX |

## Local

```bash
cd web && npm i && npm run dev
npm run build    # dist/ for GitHub Pages (base /predlane/)
npm run deploy   # gh-pages → kvngjamesii.github.io/predlane/
```

## Disclaimer

Demo only — not financial advice. Balances and fills are local mocks for product UX.
