import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  SEED_MARKETS,
  driftPredictionMarks,
  fetchLivePerpMarks,
  type Market,
} from './lib/markets'
import {
  equity,
  fmtPct,
  fmtProb,
  fmtUsd,
  loadPortfolio,
  previewTrade,
  resetPortfolio,
  savePortfolio,
  unrealizedPnl,
  type PortfolioState,
  type Position,
  type Side,
} from './lib/portfolio'

type Tab = 'trade' | 'positions' | 'portfolio'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const { connected, publicKey } = useWallet()
  const [tab, setTab] = useState<Tab>('trade')
  const [markets, setMarkets] = useState<Market[]>(SEED_MARKETS)
  const [priceErr, setPriceErr] = useState<string | null>(null)
  const [liveOk, setLiveOk] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'prediction' | 'perp'>('all')
  const [selected, setSelected] = useState<Market>(SEED_MARKETS[0])
  const [side, setSide] = useState<Side>('yes')
  const [sizeStr, setSizeStr] = useState('100')
  const [levStr, setLevStr] = useState('5')
  const [portfolio, setPortfolio] = useState<PortfolioState>(() => loadPortfolio())
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  const refreshMarks = useCallback(async () => {
    setPriceErr(null)
    try {
      const live = await fetchLivePerpMarks(SEED_MARKETS)
      setMarkets((prev) => {
        const drifted = driftPredictionMarks(prev)
        return drifted.map((m) => {
          const hit = live[m.id]
          if (!hit) return m
          return { ...m, mark: hit.mark, change24h: hit.change24h ?? m.change24h }
        })
      })
      setLiveOk(Object.keys(live).length > 0)
    } catch (e) {
      setPriceErr(e instanceof Error ? e.message : String(e))
      setLiveOk(false)
      setMarkets((prev) => driftPredictionMarks(prev))
    }
  }, [])

  useEffect(() => {
    refreshMarks()
    const t = window.setInterval(refreshMarks, 45_000)
    return () => window.clearInterval(t)
  }, [refreshMarks])

  useEffect(() => {
    savePortfolio(portfolio)
  }, [portfolio])

  // Keep selected market mark in sync
  useEffect(() => {
    const fresh = markets.find((m) => m.id === selected.id)
    if (fresh && fresh.mark !== selected.mark) setSelected(fresh)
  }, [markets, selected.id, selected.mark])

  // Default side when switching market kind
  useEffect(() => {
    setSide(selected.kind === 'prediction' ? 'yes' : 'long')
    if (selected.kind === 'prediction') {
      setSizeStr('100')
      setLevStr('1')
    } else {
      setSizeStr('1')
      setLevStr('5')
    }
  }, [selected.id, selected.kind])

  const marksMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of markets) m[x.id] = x.mark
    return m
  }, [markets])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return markets.filter((m) => {
      if (filter !== 'all' && m.kind !== filter) return false
      if (!qq) return true
      return (
        m.symbol.toLowerCase().includes(qq) ||
        m.title.toLowerCase().includes(qq) ||
        m.category.toLowerCase().includes(qq)
      )
    })
  }, [markets, q, filter])

  const size = Number(sizeStr) || 0
  const leverage = selected.kind === 'prediction' ? 1 : Number(levStr) || 1
  const preview = useMemo(
    () =>
      previewTrade({
        kind: selected.kind,
        side,
        size,
        entry: selected.mark,
        leverage,
      }),
    [selected.kind, selected.mark, side, size, leverage],
  )

  const eq = equity(portfolio, marksMap)
  const upnlTotal = portfolio.positions.reduce(
    (s, p) => s + unrealizedPnl(p, marksMap[p.marketId] ?? p.entry),
    0,
  )

  const canTrade =
    size > 0 &&
    preview.margin > 0 &&
    preview.margin <= portfolio.cashUsd + 1e-9 &&
    (selected.kind === 'prediction'
      ? side === 'yes' || side === 'no'
      : side === 'long' || side === 'short')

  function openTrade() {
    if (!canTrade) return
    const pos: Position = {
      id: uid(),
      marketId: selected.id,
      symbol: selected.symbol,
      kind: selected.kind,
      side,
      size,
      entry: selected.mark,
      leverage,
      margin: preview.margin,
      openedAt: Date.now(),
    }
    setPortfolio((prev) => ({
      cashUsd: prev.cashUsd - preview.margin,
      positions: [pos, ...prev.positions],
    }))
    showToast(`Opened ${side.toUpperCase()} ${selected.symbol} · margin ${fmtUsd(preview.margin)}`)
    setTab('positions')
  }

  function closePosition(id: string) {
    setPortfolio((prev) => {
      const pos = prev.positions.find((p) => p.id === id)
      if (!pos) return prev
      const mark = marksMap[pos.marketId] ?? pos.entry
      const pnl = unrealizedPnl(pos, mark)
      return {
        cashUsd: prev.cashUsd + pos.margin + pnl,
        positions: prev.positions.filter((p) => p.id !== id),
      }
    })
    showToast('Position closed')
  }

  function doReset() {
    setPortfolio(resetPortfolio())
    showToast('Demo portfolio reset to $10,000')
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">PL</div>
          <div>
            <div className="title">PredLane</div>
            <div className="sub">Perps + prediction markets · Solana demo</div>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="chip on ghost" title="Demo works without a wallet">
            Demo mode
          </button>
          <WalletMultiButton />
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>Trade events &amp; perps in one Solana desk</h1>
          <p>
            Browse mock prediction markets and live crypto marks, size YES/NO or
            long/short with leverage, and track PnL — no wallet required for the
            demo.
          </p>
          <div className="stats">
            <div>
              <span className="n mono">{fmtUsd(eq)}</span>
              <span className="l">Equity</span>
            </div>
            <div>
              <span className="n mono">{fmtUsd(portfolio.cashUsd)}</span>
              <span className="l">Cash</span>
            </div>
            <div>
              <span className={`n mono ${upnlTotal >= 0 ? 'up' : 'down'}`}>
                {fmtUsd(upnlTotal)}
              </span>
              <span className="l">uPnL</span>
            </div>
            <div>
              <span className="n mono">{portfolio.positions.length}</span>
              <span className="l">Open</span>
            </div>
          </div>
        </div>
        <div className="hero-card">
          <div className="hc-label">Hackathon track</div>
          <ul>
            <li>
              <a
                href="https://hackathons.solana.com/hackathons/perps-and-prediction-markets"
                target="_blank"
                rel="noreferrer"
              >
                Perps and Prediction Markets
              </a>{' '}
              · $100K · due Sep 25, 2026
            </li>
            <li>Live marks: {liveOk ? 'CoinGecko ✓' : 'mock / offline'}</li>
            <li>
              Wallet:{' '}
              {connected && publicKey
                ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
                : 'optional — not needed'}
            </li>
          </ul>
          <div className="hc-foot">
            Owner IdleDev / KvngJamesII · MIT · payout docs wallet{' '}
            <span className="mono">2Uup…duwW</span>
          </div>
        </div>
      </section>

      <nav className="tabs">
        <button type="button" className={tab === 'trade' ? 'on' : ''} onClick={() => setTab('trade')}>
          Markets &amp; Trade
        </button>
        <button
          type="button"
          className={tab === 'positions' ? 'on' : ''}
          onClick={() => setTab('positions')}
        >
          Positions ({portfolio.positions.length})
        </button>
        <button
          type="button"
          className={tab === 'portfolio' ? 'on' : ''}
          onClick={() => setTab('portfolio')}
        >
          Portfolio
        </button>
      </nav>

      {tab === 'trade' && (
        <div className="layout">
          <div className="panel">
            <h2>Markets</h2>
            <div className="toolbar">
              <input
                placeholder="Search markets…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              >
                <option value="all">All</option>
                <option value="prediction">Predictions</option>
                <option value="perp">Perps</option>
              </select>
              <button type="button" className="chip" onClick={() => void refreshMarks()}>
                Refresh
              </button>
            </div>
            {priceErr && (
              <div className="err">Live prices unavailable ({priceErr}) — using mocks.</div>
            )}
            <div className="mkt-list">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mkt ${selected.id === m.id ? 'sel' : ''}`}
                  onClick={() => setSelected(m)}
                >
                  <div>
                    <div>
                      <span className={`badge ${m.kind === 'prediction' ? 'pred' : 'perp'}`}>
                        {m.kind}
                      </span>
                      <span className="sym">{m.symbol}</span>
                    </div>
                    <div className="ttl">{m.title}</div>
                  </div>
                  <div>
                    <div className="px">
                      {m.kind === 'prediction' ? fmtProb(m.mark) : fmtUsd(m.mark)}
                    </div>
                    <div className={`chg ${ (m.change24h ?? 0) >= 0 ? 'up' : 'down'}`}>
                      {fmtPct(m.change24h)}
                    </div>
                  </div>
                </button>
              ))}
              {!filtered.length && <div className="empty">No markets match.</div>}
            </div>
          </div>

          <div className="panel">
            <h2>Trade ticket</h2>
            <div className="muted" style={{ marginBottom: 10 }}>
              {selected.symbol} · {selected.title}
              <div style={{ marginTop: 4 }}>{selected.meta}</div>
            </div>

            <div className="field">
              <label>Side</label>
              <div className="side-row">
                {selected.kind === 'prediction' ? (
                  <>
                    <button
                      type="button"
                      className={`side-btn yes ${side === 'yes' ? 'on' : ''}`}
                      onClick={() => setSide('yes')}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      className={`side-btn no ${side === 'no' ? 'on' : ''}`}
                      onClick={() => setSide('no')}
                    >
                      NO
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`side-btn long ${side === 'long' ? 'on' : ''}`}
                      onClick={() => setSide('long')}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      className={`side-btn short ${side === 'short' ? 'on' : ''}`}
                      onClick={() => setSide('short')}
                    >
                      SHORT
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="field">
              <label>
                {selected.kind === 'prediction' ? 'Contracts' : 'Size (base)'}
              </label>
              <input
                inputMode="decimal"
                value={sizeStr}
                onChange={(e) => setSizeStr(e.target.value)}
              />
            </div>

            {selected.kind === 'perp' && (
              <div className="field">
                <label>Leverage (1–50×)</label>
                <input
                  inputMode="numeric"
                  value={levStr}
                  onChange={(e) => setLevStr(e.target.value)}
                />
              </div>
            )}

            <div className="preview">
              <div className="row">
                <span>Mark</span>
                <span>
                  {selected.kind === 'prediction'
                    ? fmtProb(selected.mark)
                    : fmtUsd(selected.mark)}
                </span>
              </div>
              <div className="row">
                <span>Margin / cost</span>
                <span>{fmtUsd(preview.margin)}</span>
              </div>
              <div className="row">
                <span>Notional</span>
                <span>{fmtUsd(preview.notional)}</span>
              </div>
              {preview.liqApprox != null && (
                <div className="row">
                  <span>Approx. liq</span>
                  <span>{fmtUsd(preview.liqApprox)}</span>
                </div>
              )}
              <div className="row">
                <span>Cash after</span>
                <span
                  className={
                    portfolio.cashUsd - preview.margin < 0 ? 'down' : undefined
                  }
                >
                  {fmtUsd(portfolio.cashUsd - preview.margin)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn primary"
              disabled={!canTrade}
              onClick={openTrade}
            >
              {canTrade
                ? `Open ${side.toUpperCase()} (demo)`
                : preview.margin > portfolio.cashUsd
                  ? 'Insufficient demo cash'
                  : 'Enter a valid size'}
            </button>
            <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
              Demo fills instantly and persist in localStorage. Connecting a
              wallet is optional and never required.
            </p>
          </div>
        </div>
      )}

      {tab === 'positions' && (
        <div className="panel">
          <h2>Open positions</h2>
          {!portfolio.positions.length && (
            <div className="empty">No open positions — open a trade from Markets.</div>
          )}
          <div className="pos-list">
            {portfolio.positions.map((p) => {
              const mark = marksMap[p.marketId] ?? p.entry
              const pnl = unrealizedPnl(p, mark)
              return (
                <div key={p.id} className="pos">
                  <div className="pos-head">
                    <div>
                      <span className={`badge ${p.kind === 'prediction' ? 'pred' : 'perp'}`}>
                        {p.kind}
                      </span>
                      <strong>{p.symbol}</strong>{' '}
                      <span className={p.side === 'yes' || p.side === 'long' ? 'up' : 'down'}>
                        {p.side.toUpperCase()}
                      </span>
                    </div>
                    <div className={`mono ${pnl >= 0 ? 'up' : 'down'}`}>{fmtUsd(pnl)}</div>
                  </div>
                  <div className="pos-meta">
                    Opened {new Date(p.openedAt).toLocaleString()} · {p.leverage}×
                  </div>
                  <div className="pos-grid">
                    <div>
                      <div className="l">Size</div>
                      <div className="v">{p.size}</div>
                    </div>
                    <div>
                      <div className="l">Entry</div>
                      <div className="v">
                        {p.kind === 'prediction' ? fmtProb(p.entry) : fmtUsd(p.entry)}
                      </div>
                    </div>
                    <div>
                      <div className="l">Mark</div>
                      <div className="v">
                        {p.kind === 'prediction' ? fmtProb(mark) : fmtUsd(mark)}
                      </div>
                    </div>
                    <div>
                      <div className="l">Margin</div>
                      <div className="v">{fmtUsd(p.margin)}</div>
                    </div>
                    <div>
                      <div className="l">Equity</div>
                      <div className="v">{fmtUsd(p.margin + pnl)}</div>
                    </div>
                    <div>
                      <div className="l">ROE</div>
                      <div className={`v ${pnl >= 0 ? 'up' : 'down'}`}>
                        {fmtPct((pnl / Math.max(p.margin, 1e-9)) * 100)}
                      </div>
                    </div>
                  </div>
                  <div className="pos-actions">
                    <button
                      type="button"
                      className="btn danger"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      onClick={() => closePosition(p.id)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="layout">
          <div className="panel">
            <h2>Portfolio</h2>
            <div className="preview">
              <div className="row">
                <span>Demo cash</span>
                <span>{fmtUsd(portfolio.cashUsd)}</span>
              </div>
              <div className="row">
                <span>Margin in positions</span>
                <span>
                  {fmtUsd(portfolio.positions.reduce((s, p) => s + p.margin, 0))}
                </span>
              </div>
              <div className="row">
                <span>Unrealized PnL</span>
                <span className={upnlTotal >= 0 ? 'up' : 'down'}>{fmtUsd(upnlTotal)}</span>
              </div>
              <div className="row">
                <span>Equity</span>
                <span>{fmtUsd(eq)}</span>
              </div>
            </div>
            <button type="button" className="btn ghost" onClick={doReset}>
              Reset demo portfolio ($10k)
            </button>
            <p className="muted" style={{ marginTop: 12 }}>
              Persistence key <span className="mono">predlane.portfolio.v1</span>. Wallet
              connect does not move demo balances — it is only for future on-chain
              settlement demos.
            </p>
          </div>
          <div className="panel">
            <h2>Why Solana</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
              <li>Sub-second fills &amp; cheap risk updates for perps</li>
              <li>Composable collateral, oracles, and keepers on one L1</li>
              <li>Same Phantom / Solflare UX traders already know</li>
              <li>24/7 event + crypto markets without exchange hours</li>
            </ul>
          </div>
        </div>
      )}

      <footer className="foot">
        <span>
          <a
            href="https://hackathons.solana.com/hackathons/perps-and-prediction-markets"
            target="_blank"
            rel="noreferrer"
          >
            Hackathon
          </a>
        </span>
        <span>
          <a href="https://github.com/KvngJamesII/predlane" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </span>
        <span>MIT · IdleDev / KvngJamesII</span>
        <span className="mono">2Uup61Xjcqpyh9jfSNKBfHr4J1Ju7qjzDyUzFpdmduwW</span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
