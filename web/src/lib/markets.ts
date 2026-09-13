export type MarketKind = 'prediction' | 'perp'

export type Market = {
  id: string
  kind: MarketKind
  symbol: string
  title: string
  category: string
  /** Mid / last mark. For predictions: YES price in [0,1]. For perps: USD. */
  mark: number
  change24h?: number
  volumeUsd: number
  /** Prediction expiry or perp funding label */
  meta: string
  /** CoinGecko id for live marks (perps only) */
  cgId?: string
}

export const SEED_MARKETS: Market[] = [
  {
    id: 'pred-fed-cut',
    kind: 'prediction',
    symbol: 'FEDCUT',
    title: 'Fed cuts rates before Dec 2026?',
    category: 'Macro',
    mark: 0.62,
    change24h: 3.2,
    volumeUsd: 1_240_000,
    meta: 'Resolves Dec 31, 2026',
  },
  {
    id: 'pred-sol-500',
    kind: 'prediction',
    symbol: 'SOL500',
    title: 'SOL above $500 by EOY 2026?',
    category: 'Crypto',
    mark: 0.41,
    change24h: -1.8,
    volumeUsd: 890_000,
    meta: 'Resolves Dec 31, 2026',
  },
  {
    id: 'pred-btc-etf',
    kind: 'prediction',
    symbol: 'BTCFLOWS',
    title: 'BTC ETF net inflows positive this month?',
    category: 'Crypto',
    mark: 0.71,
    change24h: 5.1,
    volumeUsd: 2_100_000,
    meta: 'Resolves month-end',
  },
  {
    id: 'pred-ai-reg',
    kind: 'prediction',
    symbol: 'AIREG',
    title: 'US passes major AI regulation in 2026?',
    category: 'Policy',
    mark: 0.28,
    change24h: 0.4,
    volumeUsd: 420_000,
    meta: 'Resolves Dec 31, 2026',
  },
  {
    id: 'pred-eth-etf',
    kind: 'prediction',
    symbol: 'ETHETF',
    title: 'ETH staking ETF approved in 2026?',
    category: 'Crypto',
    mark: 0.55,
    change24h: 2.0,
    volumeUsd: 670_000,
    meta: 'Resolves Dec 31, 2026',
  },
  {
    id: 'perp-sol',
    kind: 'perp',
    symbol: 'SOL-PERP',
    title: 'SOL / USD Perpetual',
    category: 'Perps',
    mark: 185,
    change24h: 1.2,
    volumeUsd: 48_000_000,
    meta: 'Funding ~0.01%/8h',
    cgId: 'solana',
  },
  {
    id: 'perp-btc',
    kind: 'perp',
    symbol: 'BTC-PERP',
    title: 'BTC / USD Perpetual',
    category: 'Perps',
    mark: 95_000,
    change24h: 0.6,
    volumeUsd: 210_000_000,
    meta: 'Funding ~0.008%/8h',
    cgId: 'bitcoin',
  },
  {
    id: 'perp-eth',
    kind: 'perp',
    symbol: 'ETH-PERP',
    title: 'ETH / USD Perpetual',
    category: 'Perps',
    mark: 3_450,
    change24h: -0.4,
    volumeUsd: 92_000_000,
    meta: 'Funding ~0.012%/8h',
    cgId: 'ethereum',
  },
  {
    id: 'perp-jup',
    kind: 'perp',
    symbol: 'JUP-PERP',
    title: 'JUP / USD Perpetual',
    category: 'Perps',
    mark: 0.85,
    change24h: 4.5,
    volumeUsd: 12_000_000,
    meta: 'Funding ~0.02%/8h',
    cgId: 'jupiter-exchange-solana',
  },
]

/** Fetch live USD marks from CoinGecko (public, no key). Falls back silently. */
export async function fetchLivePerpMarks(
  markets: Market[],
): Promise<Partial<Record<string, { mark: number; change24h?: number }>>> {
  const ids = markets
    .filter((m) => m.kind === 'perp' && m.cgId)
    .map((m) => m.cgId!)
  if (!ids.length) return {}

  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}` +
    `&vs_currencies=usd&include_24hr_change=true`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Price API ${res.status}`)
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >

  const out: Partial<Record<string, { mark: number; change24h?: number }>> = {}
  for (const m of markets) {
    if (!m.cgId || !data[m.cgId]?.usd) continue
    out[m.id] = {
      mark: data[m.cgId].usd!,
      change24h: data[m.cgId].usd_24h_change,
    }
  }
  return out
}

export function driftPredictionMarks(markets: Market[]): Market[] {
  return markets.map((m) => {
    if (m.kind !== 'prediction') return m
    const jitter = (Math.random() - 0.5) * 0.01
    const next = Math.min(0.95, Math.max(0.05, m.mark + jitter))
    return { ...m, mark: next }
  })
}
