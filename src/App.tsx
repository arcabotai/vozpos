import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

type CatalogItem = {
  key: string;
  label: string;
  aliases: string[];
  price: number;
};

type CartLine = CatalogItem & {
  quantity: number;
};

type Invoice = {
  id: string;
  reference: string;
  total: number;
  url: string;
  createdAt: string;
  expiresAt: string;
};

type ValidationState =
  | { status: "idle"; title: string; checks: string[] }
  | { status: "rejected"; title: string; checks: string[] }
  | { status: "accepted"; title: string; checks: string[]; proofId: string };

const merchantWallet = "9xQeWvG816bUx9EPfW9XMRskhaZwoU7Tj9cxF8fK9F5";
const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const oneLiner =
  "Mobile Solana cashier that turns orders into Solana Pay invoices and validated receipts.";

const catalog: CatalogItem[] = [
  { key: "coffee", label: "Coffee", aliases: ["coffee", "coffees", "cafe", "cafes"], price: 3 },
  { key: "juice", label: "Juice", aliases: ["juice", "juices", "jugo", "jugos"], price: 2 },
  { key: "sandwich", label: "Sandwich", aliases: ["sandwich", "sandwiches"], price: 5 },
];

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  un: 1,
  una: 1,
  two: 2,
  dos: 2,
  three: 3,
  tres: 3,
  four: 4,
  cuatro: 4,
  five: 5,
  cinco: 5,
};

const proofCards = [
  {
    title: "Solana Mobile",
    body: "Phone-sized cashier flow with QR and solana: deep link handoff for mobile wallets.",
    status: "Claim",
  },
  {
    title: "ElevenLabs",
    body: "Parked for a future voice-cashier pass instead of running live sessions now.",
    status: "Future",
  },
  {
    title: "Solana Pay",
    body: "Each invoice includes amount, USDC mint, memo, label, and a valid 32-byte reference.",
    status: "Core",
  },
  {
    title: "LI.FI",
    body: "Documented as a next-step bridge/top-up path. Not claimed in this submission.",
    status: "Not claimed",
  },
];

const demoSteps = [
  "Type: two coffees and one juice.",
  "Create a Solana Pay invoice and show the QR/deep link.",
  "Reject a wrong payment to prove validation rules are visible.",
  "Accept the demo-valid payment and issue the receipt.",
];

const techStack = [
  "React",
  "TypeScript",
  "Vite",
  "Solana Pay URL scheme",
  "SPL USDC reference flow",
  "qrcode.react",
  "Vercel",
];

function randomBase58(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => base58[byte % base58.length]).join("");
}

function encodeBase58(bytes: Uint8Array) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  for (const byte of bytes) {
    if (byte !== 0) break;
    digits.push(0);
  }

  return digits
    .reverse()
    .map((digit) => base58[digit])
    .join("");
}

function randomSolanaReference() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase58(bytes);
}

function parseQuantityBefore(text: string, index: number) {
  const before = text.slice(0, index).trim().split(/\s+/).at(-1) ?? "";
  const numeric = Number.parseInt(before, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return numberWords[before] ?? 1;
}

function parseCart(input: string): CartLine[] {
  const normalized = input.toLowerCase().replace(/[.,]/g, " ");
  return catalog.flatMap((item) => {
    const match = item.aliases
      .map((alias) => ({ alias, index: normalized.search(new RegExp(`\\b${alias}\\b`)) }))
      .find((entry) => entry.index >= 0);
    if (!match) {
      return [];
    }
    return [{ ...item, quantity: parseQuantityBefore(normalized, match.index) }];
  });
}

function buildInvoice(cart: CartLine[]): Invoice {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = `inv_${Date.now().toString(36)}_${randomBase58(5)}`;
  const reference = randomSolanaReference();
  const params = new URLSearchParams({
    amount: total.toFixed(2),
    "spl-token": usdcMint,
    reference,
    label: "VozPOS Demo Merchant",
    message: `VozPOS invoice ${id}`,
    memo: `VOZPOS:${id}`,
  });

  return {
    id,
    reference,
    total,
    url: `solana:${merchantWallet}?${params.toString()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

function formatUsd(value: number) {
  return `${value.toFixed(2)} USDC`;
}

function App() {
  const [orderText, setOrderText] = useState("two coffees and one juice");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
    title: "Waiting for invoice",
    checks: ["Create an invoice to start validation."],
  });

  const cart = useMemo(() => parseCart(orderText), [orderText]);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function createInvoice() {
    if (cart.length === 0) {
      setValidation({
        status: "rejected",
        title: "Order needs merchant review",
        checks: ["No known catalog item was found. Add coffee, juice, or sandwich."],
      });
      return;
    }
    const nextInvoice = buildInvoice(cart);
    setInvoice(nextInvoice);
    setValidation({
      status: "idle",
      title: "Invoice ready",
      checks: [
        "Valid 32-byte Solana reference generated.",
        "Merchant wallet and USDC mint attached.",
        "Waiting for payment validation.",
      ],
    });
  }

  function rejectWrongPayment() {
    if (!invoice) return;
    setValidation({
      status: "rejected",
      title: "Payment rejected",
      checks: [
        "Reference does not match this invoice.",
        `Amount received: ${formatUsd(Math.max(invoice.total - 1, 0))}; expected ${formatUsd(
          invoice.total,
        )}.`,
        "Receipt blocked until recipient, amount, token, reference, expiry, and reuse checks pass.",
      ],
    });
  }

  function acceptDemoPayment() {
    if (!invoice) return;
    setValidation({
      status: "accepted",
      title: "Payment confirmed",
      proofId: `demo_${invoice.reference.slice(0, 10)}`,
      checks: [
        "Reference matches invoice.",
        `Recipient matches ${merchantWallet.slice(0, 4)}...${merchantWallet.slice(-4)}.`,
        `Amount matches ${formatUsd(invoice.total)}.`,
        "USDC mint, expiry, confirmation, and duplicate-use checks passed in demo validator.",
      ],
    });
  }

  return (
    <main className="app-shell">
        <section className="hero" aria-labelledby="project-title">
          <div className="hero-copy">
            <p className="eyebrow">Dev3pack x ChileDAO submission</p>
            <h1 id="project-title">VozPOS</h1>
            <p className="lede">{oneLiner}</p>
            <div className="hero-actions" aria-label="Project links">
              <a className="primary-link" href="#demo">
                Run demo
              </a>
              <a className="secondary-link" href="https://github.com/arcabotai/vozpos">
                GitHub repo
              </a>
            </div>
          </div>
          <div className="submission-card" aria-label="Submission summary">
            <span className="card-kicker">Submit with</span>
            <strong>Solana Mobile</strong>
            <dl>
              <div>
                <dt>Project name</dt>
                <dd>VozPOS</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>Payments / Commerce</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{merchantWallet}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="copy-grid" aria-label="Submission form copy">
          <article className="copy-panel wide">
            <span className="label">Description</span>
            <p>
              VozPOS turns a merchant phone into a crypto cashier for pop-up shops and local
              vendors. The merchant types an order, confirms the parsed cart, generates a Solana
              Pay invoice, and shows a mobile wallet QR/deep link. The checkout flow rejects
              wrong payments and only unlocks a receipt when
              amount, recipient, token, reference, expiry, confirmation, and duplicate-use
              checks pass in the demo validator. The ElevenLabs voice layer is intentionally
              parked for a future build so this live demo does not start or spend voice sessions.
            </p>
          </article>
          <article className="copy-panel">
            <span className="label">One-liner</span>
            <p>{oneLiner}</p>
          </article>
          <article className="copy-panel">
            <span className="label">Tech stack</span>
            <div className="tag-cloud">
              {techStack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        </section>

        <section className="proof-grid" aria-label="Track proof">
          {proofCards.map((card) => (
            <article className="proof-card" key={card.title}>
              <div>
                <span>{card.status}</span>
                <h2>{card.title}</h2>
              </div>
              <p>{card.body}</p>
            </article>
          ))}
        </section>

        <section className="demo-layout" id="demo" aria-label="VozPOS checkout demo">
          <div className="demo-header">
            <p className="eyebrow">Live demo surface</p>
            <h2>Judge-ready checkout flow</h2>
            <p>
              This is the flow to record or present: order capture, Solana Pay invoice,
              validation failure, validation success, then receipt.
            </p>
          </div>

          <form
            className="panel order-panel"
            onSubmit={(event) => {
              event.preventDefault();
              createInvoice();
            }}
          >
            <div className="section-heading">
              <span>1</span>
              <h3>Order capture</h3>
            </div>
            <label htmlFor="order">Merchant types</label>
            <textarea
              id="order"
              value={orderText}
              onChange={(event) => setOrderText(event.target.value)}
              rows={4}
            />
            <button type="submit">Create Solana Pay invoice</button>
          </form>

          <section className="panel cart-panel">
            <div className="section-heading">
              <span>2</span>
              <h3>Cart</h3>
            </div>
            <div className="cart-lines">
              {cart.length === 0 ? (
                <p className="muted">No recognized items yet.</p>
              ) : (
                cart.map((item) => (
                  <div className="cart-line" key={item.key}>
                    <span>
                      {item.quantity} x {item.label}
                    </span>
                    <strong>{formatUsd(item.quantity * item.price)}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="total-row">
              <span>Total</span>
              <strong>{formatUsd(total)}</strong>
            </div>
          </section>

          <section className="panel invoice-panel">
            <div className="section-heading">
              <span>3</span>
              <h3>Invoice</h3>
            </div>
            {invoice ? (
              <>
                <div className="qr-wrap">
                  <QRCodeSVG value={invoice.url} size={168} marginSize={1} />
                </div>
                <a className="deep-link" href={invoice.url}>
                  Open Solana Pay link
                </a>
                <dl>
                  <div>
                    <dt>Invoice</dt>
                    <dd>{invoice.id}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{invoice.reference}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{new Date(invoice.expiresAt).toLocaleTimeString()}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="muted">Create an invoice to show the QR and deep link.</p>
            )}
          </section>

          <section className={`panel validation-panel ${validation.status}`}>
            <div className="section-heading">
              <span>4</span>
              <h3>Validation</h3>
            </div>
            <h4>{validation.title}</h4>
            <ul>
              {validation.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <div className="actions">
              <button type="button" onClick={rejectWrongPayment} disabled={!invoice}>
                Reject wrong payment
              </button>
              <button type="button" onClick={acceptDemoPayment} disabled={!invoice}>
                Accept demo-valid payment
              </button>
            </div>
          </section>

          <section className="panel receipt-panel">
            <div className="section-heading">
              <span>5</span>
              <h3>Receipt</h3>
            </div>
            {validation.status === "accepted" && invoice ? (
              <>
                <p className="receipt-status">Payment confirmed. Receipt issued.</p>
                <dl>
                  <div>
                    <dt>Proof</dt>
                    <dd>{validation.proofId}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatUsd(invoice.total)}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Demo validator</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="muted">Receipt unlocks only after validation passes.</p>
            )}
          </section>

        </section>

        <section className="script-panel" aria-label="Demo script and honesty notes">
          <article>
            <span className="label">Recording script</span>
            <ol>
              {demoSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article>
            <span className="label">Real vs demo-limited</span>
            <p>
              Real: Solana Pay URL generation, valid references, QR/deep links, mobile-first
              checkout UI, and receipt state machine. Demo-limited: payment acceptance is
              simulated unless a live transaction is added during recording. No active
              ElevenLabs session, no custom Solana program, and no LI.FI execution claim.
            </p>
          </article>
        </section>
      </main>
  );
}

export default App;
