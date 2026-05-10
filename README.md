# VozPOS

VozPOS turns a merchant's phone into a voice-operated Solana cashier.

## Problem

Small and pop-up merchants need fast checkout without bulky POS hardware. Crypto checkout often requires typing amounts, managing wallet details, or trusting static QR codes that do not validate whether the right invoice was actually paid.

## Solution

VozPOS lets the merchant speak or type an order, confirm the parsed cart, generate a Solana Pay invoice with a unique reference, validate the payment, and issue a receipt.

## Demo Flow

Live app: https://vozpos.vercel.app

1. Merchant says/types: "two coffees and one juice."
2. VozPOS parses the cart and asks for confirmation.
3. App creates a Solana Pay invoice with a unique reference.
4. Wrong payment is rejected.
5. Correct demo-valid payment is accepted.
6. Receipt is issued.

## Tracks

- Solana: Solana Pay invoice URL, unique references, validation rules, receipt proof.
- Solana Mobile: mobile-first phone-as-terminal checkout flow.
- ElevenLabs: live Conversational AI cashier wired through `@elevenlabs/react`; receives checkout context and narrates the flow without touching funds.
- LI.FI: cross-chain top-up path is represented as a product path and documented as the next execution step.

## Architecture

- Vite + React + TypeScript frontend.
- Solana Pay URL generation with merchant wallet, USDC mint, unique reference, label, message, and memo.
- Demo payment validator checks reference, recipient, amount, token, expiry, duplicate-use, and confirmation semantics before issuing a receipt.
- ElevenLabs agent panel starts a live voice session and sends current cart, invoice, and validation context to the cashier agent.
- QR/deep link handoff for mobile wallet payment.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

```bash
VITE_SOLANA_RPC_URL=
VITE_SOLANA_CLUSTER=devnet
VITE_MERCHANT_WALLET=
VITE_ELEVENLABS_AGENT_ID=agent_8601kr8a686gfkja545y8erwr8a0
VITE_LIFI_API_KEY=
```

Never commit real keys. The public ElevenLabs agent id is safe for the client; API keys stay out of the frontend.

## Real vs Mocked

Real in this prototype:

- Mobile-first checkout UI.
- Cart parsing and merchant confirmation.
- Solana Pay invoice URL/reference generation.
- QR/deep link rendering.
- ElevenLabs Conversational AI session control and checkout context handoff.
- Payment validation rule flow.
- Receipt screen.

Demo-limited:

- Payment acceptance is a clearly labeled demo validator unless a real transaction is added during recording.
- ElevenLabs does not sign transactions or validate chain settlement; it is a cashier voice layer.
- LI.FI execution is a documented integration path, not a hidden fake sponsor call.
- No custom Solana program. VozPOS uses Solana Pay / SPL transfer semantics with unique invoice references.

## Built During Dev3pack

This project was built during the Dev3pack Global Hackathon x ChileDAO using AI-assisted development. Arca/Cad coordinated planning and implementation support, with Codex and Claude Code used for rapid coding/review. The team reviewed the implementation and documented real vs mocked parts here.

## One More Week

- Full Mobile Wallet Adapter support.
- Real devnet/mainnet USDC settlement and explorer links.
- Merchant account history and refunds.
- Production-grade receipt storage.
- ElevenLabs tool-calling cashier agent.
- Fully executed LI.FI cross-chain payment flow.
