# VozPOS Submission Copy

## Project

Project name: VozPOS

One-liner: Mobile Solana cashier that turns orders into Solana Pay invoices and validated receipts.

Partner tracks: Solana Mobile

Category: Payments / Commerce

Smart Contract / Program Address: `9xQeWvG816bUx9EPfW9XMRskhaZwoU7Tj9cxF8fK9F5`

Note for address field: VozPOS does not deploy a custom program. This is the demo merchant Solana address used by the Solana Pay checkout flow.

Local hub: Santiago, Chile

## Description

VozPOS turns a merchant phone into a crypto cashier for pop-up shops and local vendors. The merchant types an order, confirms the parsed cart, generates a Solana Pay invoice, and shows a mobile wallet QR/deep link.

The checkout flow rejects wrong payments and only unlocks a receipt when amount, recipient, token, reference, expiry, confirmation, and duplicate-use checks pass in the demo validator. Each invoice uses a valid 32-byte Solana reference, encoded as base58, so the payment can be tied back to one checkout.

The ElevenLabs voice layer is parked for a future build so the current live app does not start or spend voice sessions. The app is intentionally honest about scope: Solana Pay generation, mobile checkout UI, and receipt state are real; chain settlement is demo-limited unless a live transaction is added during recording.

## Tech Stack

React, TypeScript, Vite, Solana Pay URL scheme, SPL USDC reference flow, qrcode.react, Vercel.

## Links

Live app: https://vozpos.vercel.app

GitHub repo: https://github.com/arcabotai/vozpos

## Demo Script

1. Type: "two coffees and one juice."
2. Create a Solana Pay invoice and show the QR/deep link.
3. Reject a wrong payment to prove validation rules are visible.
4. Accept the demo-valid payment and issue the receipt.

## Do Not Claim

Do not claim LI.FI. It is documented as a next-step bridge/top-up path only.
Do not claim active ElevenLabs integration. It is parked for a later voice pass.
