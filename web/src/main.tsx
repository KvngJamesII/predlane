import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'
import { SolanaProviders } from './WalletProvider'
import App from './App'
import './index.css'

;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
;(window as unknown as { process: typeof process }).process = process

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProviders>
      <App />
    </SolanaProviders>
  </StrictMode>,
)
