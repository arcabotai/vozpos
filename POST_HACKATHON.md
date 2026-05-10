# VozPOS Post-Hackathon Backlog

Decision: do not force VozPOS into the current hackathon submission window. Keep it as a strong post-hackathon product idea.

## Why Save It

VozPOS has a clear merchant pain point: local vendors need a phone-native cashier that can create crypto invoices without POS hardware, manual amount entry, or static QR risk.

The strongest direction is a voice-first Solana Mobile checkout where a merchant can say the order, confirm the cart, generate a Solana Pay invoice, validate the payment, and issue a receipt.

## Current State

- Public repo: https://github.com/arcabotai/vozpos
- Live prototype: https://vozpos.vercel.app
- Local repo: `/Users/arca/.openclaw/workspace/vozpos`
- Current prototype includes React/Vite UI, cart parsing, Solana Pay URL generation, valid base58 Solana references, QR/deep link handoff, demo validation states, and receipts.
- ElevenLabs voice-session wiring was removed from the live app on 2026-05-10 to avoid spending sessions while the project is paused.
- `SUBMISSION.md` contains the paste-ready hackathon submission copy if this is ever revived.

## Do Not Overclaim

- Solana Pay invoice generation is real.
- Solana Mobile positioning is real as a phone-first checkout UX.
- ElevenLabs is a future voice-cashier pass, not active in the current live app.
- Payment settlement is demo-limited unless connected to real transaction polling.
- LI.FI is only a future cross-chain top-up path, not currently implemented.
- No custom Solana program is deployed.

## Next Build Pass

1. Add real Solana RPC transaction polling for invoice reference, recipient, amount, token, expiry, and duplicate-use checks.
2. Replace demo merchant wallet with configurable merchant onboarding.
3. Add Mobile Wallet Adapter support and test on a Solana Mobile device.
4. Add persisted receipt history and merchant dashboard.
5. Give the ElevenLabs agent explicit tools for creating invoices, reading cart state, and confirming checkout status.
6. Decide whether LI.FI is worth implementing as cross-chain top-up, then wire it honestly or remove it from the pitch.
7. Record a concise demo video after real settlement is in place.

## Product Position

VozPOS is not just a hackathon page. Treat it as a later merchant payments prototype: voice cashier, Solana Pay terminal, mobile-first receipt flow.
