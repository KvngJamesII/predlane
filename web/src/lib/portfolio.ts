export type Side = 'yes' | 'no' | 'long' | 'short'

export type Position = {
  id: string
  marketId: string
  symbol: string
  kind: 'prediction' | 'perp'
  side: Side
  /** Contracts (prediction) or notional base size (perp) */
  size: number
  entry: number
  leverage: number
  /** Margin locked in USDC */
  margin: number
  openedAt: number
}

export type ClosedPosition = Position & {
  closedAt: number
  exitMark: number
  realizedPnl: number
}

export type PortfolioState = {
  cashUsd: number
  positions: Position[]
  closed: ClosedPosition[]
}

const KEY = 'predlane.portfolio.v1'
const DEFAULT_CASH = 10_000
const MAX_CLOSED = 40

export function loadPortfolio(): PortfolioState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { cashUsd: DEFAULT_CASH, positions: [], closed: [] }
    const parsed = JSON.parse(raw) as Partial<PortfolioState>
    if (typeof parsed.cashUsd !== 'number' || !Array.isArray(parsed.positions)) {
      return { cashUsd: DEFAULT_CASH, positions: [], closed: [] }
    }
    return {
      cashUsd: parsed.cashUsd,
      positions: parsed.positions,
      closed: Array.isArray(parsed.closed) ? parsed.closed : [],
    }
  } catch {
    return { cashUsd: DEFAULT_CASH, positions: [], closed: [] }
  }
}

export function savePortfolio(state: PortfolioState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function resetPortfolio(): PortfolioState {
  const fresh: PortfolioState = { cashUsd: DEFAULT_CASH, positions: [], closed: [] }
  savePortfolio(fresh)
  return fresh
}

/** Unrealized PnL for a position given current mark. */
export function unrealizedPnl(pos: Position, mark: number): number {
  if (pos.kind === 'prediction') {
    // Binary: YES profits when mark rises; NO when mark falls (from entry)
    if (pos.side === 'yes') return (mark - pos.entry) * pos.size
    return (pos.entry - mark) * pos.size
  }
  // Perp: size is base units; PnL = (mark - entry) * size * direction
  const dir = pos.side === 'long' ? 1 : -1
  return (mark - pos.entry) * pos.size * dir
}

export function equity(state: PortfolioState, marks: Record<string, number>): number {
  let e = state.cashUsd
  for (const p of state.positions) {
    e += p.margin + unrealizedPnl(p, marks[p.marketId] ?? p.entry)
  }
  return e
}

export function realizedPnlTotal(state: PortfolioState): number {
  return state.closed.reduce((s, c) => s + c.realizedPnl, 0)
}

export function previewTrade(opts: {
  kind: 'prediction' | 'perp'
  side: Side
  size: number
  entry: number
  leverage: number
}): { margin: number; notional: number; liqApprox: number | null } {
  const { kind, side, size, entry, leverage } = opts
  const lev = Math.max(1, Math.min(50, leverage))

  if (kind === 'prediction') {
    // Cost to buy contracts ≈ entry * size (YES) or (1-entry)*size (NO)
    const cost = side === 'yes' ? entry * size : (1 - entry) * size
    return { margin: cost, notional: cost, liqApprox: null }
  }

  const notional = size * entry
  const margin = notional / lev
  const dir = side === 'long' ? 1 : -1
  // Rough 80% margin wipe liquidation estimate
  const liqApprox = entry * (1 - dir * (0.8 / lev))
  return { margin, notional, liqApprox }
}

export function fmtUsd(n: number, digits = 2) {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const d = abs >= 1000 ? 2 : abs >= 1 ? digits : 4
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: Math.min(2, d),
  })}`
}

export function fmtPct(n?: number) {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function fmtProb(p: number) {
  return `${(p * 100).toFixed(1)}¢`
}

/** Append a closed trade; keep newest MAX_CLOSED. */
export function appendClosed(
  closed: ClosedPosition[],
  entry: ClosedPosition,
): ClosedPosition[] {
  return [entry, ...closed].slice(0, MAX_CLOSED)
}
