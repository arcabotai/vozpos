import { useMemo, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
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
const elevenLabsAgentId =
  import.meta.env.VITE_ELEVENLABS_AGENT_ID || "agent_8601kr8a686gfkja545y8erwr8a0";

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
        "Unique Solana Pay reference generated.",
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
    <ConversationProvider agentId={elevenLabsAgentId}>
      <main className="app-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Dev3pack x ChileDAO submission</p>
            <h1>VozPOS</h1>
            <p className="lede">
              A voice-first Solana Mobile cashier for pop-up and local merchants.
            </p>
          </div>
          <div className="hero-proof" aria-label="Current demo status">
            <span>merchant speaks</span>
            <strong>{formatUsd(total || 0)}</strong>
            <span>validated checkout</span>
          </div>
        </section>

        <section className="workflow" aria-label="VozPOS checkout demo">
          <form
            className="panel order-panel"
            onSubmit={(event) => {
              event.preventDefault();
              createInvoice();
            }}
          >
            <div className="section-heading">
              <span>1</span>
              <h2>Voice order</h2>
            </div>
            <label htmlFor="order">Merchant input</label>
            <textarea
              id="order"
              value={orderText}
              onChange={(event) => setOrderText(event.target.value)}
              rows={4}
            />
            <button type="submit">Create Solana Pay invoice</button>
          </form>

        <section className="panel">
          <div className="section-heading">
            <span>2</span>
            <h2>Cart confirmation</h2>
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
            <h2>Invoice</h2>
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
                  <dd>{invoice.reference.slice(0, 12)}...</dd>
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
            <h2>Payment validation</h2>
          </div>
          <h3>{validation.title}</h3>
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
            <h2>Receipt</h2>
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

        <section className="panel topup-panel">
          <div className="section-heading">
            <span>+</span>
            <h2>Cross-chain top-up</h2>
          </div>
          <p>
            LI.FI path reserved for customers who need to bridge into Solana before checkout.
            The submitted build marks execution as a next integration step.
          </p>
        </section>

          <ElevenLabsPanel cart={cart} invoice={invoice} validation={validation} />
        </section>
      </main>
    </ConversationProvider>
  );
}

function ElevenLabsPanel({
  cart,
  invoice,
  validation,
}: {
  cart: CartLine[];
  invoice: Invoice | null;
  validation: ValidationState;
}) {
  const [lastEvent, setLastEvent] = useState("Ready to connect the live ElevenLabs cashier.");
  const conversation = useConversation({
    onConnect: ({ conversationId }) => setLastEvent(`Connected: ${conversationId}`),
    onDisconnect: () => setLastEvent("Voice cashier disconnected."),
    onError: (message) => setLastEvent(`Voice error: ${message}`),
    onMessage: (message) => {
      const payload = message as { agent_response?: unknown; user_transcript?: unknown; text?: unknown };
      const text =
        typeof payload.agent_response === "string"
          ? payload.agent_response
          : typeof payload.user_transcript === "string"
            ? payload.user_transcript
            : typeof payload.text === "string"
              ? payload.text
            : "ElevenLabs message received.";
      setLastEvent(text);
    },
  });

  function sendCheckoutContext() {
    conversation.sendContextualUpdate(
      [
        "You are VozPOS, a concise voice cashier for a Solana Mobile checkout demo.",
        `Cart: ${cart
          .map((item) => `${item.quantity} ${item.label}`)
          .join(", ") || "empty"}.`,
        invoice
          ? `Invoice ${invoice.id}, amount ${formatUsd(invoice.total)}, reference ${invoice.reference}.`
          : "No invoice created yet.",
        `Validation state: ${validation.status}.`,
        "Never sign transactions or claim money moved. Explain invoice creation, validation, and receipt status.",
      ].join(" "),
    );
    setLastEvent("Checkout context sent to ElevenLabs agent.");
  }

  return (
    <section className="panel elevenlabs-panel">
      <div className="section-heading">
        <span>AI</span>
        <h2>ElevenLabs cashier</h2>
      </div>
      <p>
        Live Conversational AI agent wired through <code>@elevenlabs/react</code>. It can narrate
        the checkout and receive invoice context without touching funds.
      </p>
      <div className="voice-status">
        <span>Status</span>
        <strong>{conversation.status}</strong>
      </div>
      <div className="actions">
        <button
          type="button"
          onClick={() => conversation.startSession()}
          disabled={conversation.status === "connected" || conversation.status === "connecting"}
        >
          Start ElevenLabs voice
        </button>
        <button
          type="button"
          onClick={sendCheckoutContext}
          disabled={conversation.status !== "connected"}
        >
          Send checkout context
        </button>
        <button
          type="button"
          onClick={() => conversation.endSession()}
          disabled={conversation.status !== "connected"}
        >
          End voice
        </button>
      </div>
      <p className="voice-event">{lastEvent}</p>
    </section>
  );
}

export default App;
