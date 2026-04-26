import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as db from "./supabase.js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const SHOP_WALLET = "9tYP264asowHuBFHRPY5sULr4zCgFdB6AKZ573VQ3r14";
const EMAILJS_SERVICE = "service_hix7zrj";
const EMAILJS_TEMPLATE = "template_3rllz3r";
const EMAILJS_PUBLIC_KEY = "E8tp_9UHnflfVZ-vK";
const SHOP_EMAIL = "solringshoporders@gmail.com";

// SOL and USDC mint on mainnet
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function generateOrderId() {
  return "SRS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatPrice(price) {
  if (!price) return "$0.00";
  return `$${parseFloat(price).toFixed(2)}`;
}

function formatItems(cart) {
  return cart
    .map(
      (c) =>
        `${c.cartQty}x ${c.name} (${c.condition}${c.foil ? " ✦ Foil" : ""}) — ${formatPrice(c.price)} each`
    )
    .join("\n");
}

// Build Solana Pay URL
function buildSolanaPayUrl({ wallet, amount, currency, orderId, label, message }) {
  if (currency === "SOL") {
    return `solana:${wallet}?amount=${amount}&label=${encodeURIComponent(label)}&message=${encodeURIComponent(message)}&memo=${encodeURIComponent(orderId)}`;
  } else {
    // USDC SPL token transfer
    return `solana:${wallet}?amount=${amount}&spl-token=${USDC_MINT}&label=${encodeURIComponent(label)}&message=${encodeURIComponent(message)}&memo=${encodeURIComponent(orderId)}`;
  }
}

// Simple QR code using Google Charts API (no library needed)
function getQRUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}&color=c9a84c&bgcolor=111115&qzone=2`;
}

// Send email via EmailJS
async function sendEmail(templateParams) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE,
      template_id: EMAILJS_TEMPLATE,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    }),
  });
  return res.ok;
}

// ─── STEP 1 — SHIPPING FORM ───────────────────────────────────────────────────

function ShippingForm({ cart, cartTotal, onNext, onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [errors, setErrors] = useState({});

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim()) e.zip = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (validate()) onNext(form);
  };

  return (
    <div className="checkout-step">
      <div className="checkout-header">
        <h2 className="checkout-title">Shipping Information</h2>
        <button className="checkout-close" onClick={onClose}>×</button>
      </div>

      <div className="checkout-body">
        <div className="checkout-left">
          <div className="shipping-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  className={`co-input ${errors.name ? "error" : ""}`}
                  placeholder="Joey Russo"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  className={`co-input ${errors.email ? "error" : ""}`}
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Street Address *</label>
              <input
                className={`co-input ${errors.address ? "error" : ""}`}
                placeholder="123 Main St, Apt 4"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
              {errors.address && <span className="field-error">{errors.address}</span>}
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>City *</label>
                <input
                  className={`co-input ${errors.city ? "error" : ""}`}
                  placeholder="Manchester"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
                {errors.city && <span className="field-error">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  className={`co-input ${errors.state ? "error" : ""}`}
                  placeholder="NH"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
                {errors.state && <span className="field-error">{errors.state}</span>}
              </div>
              <div className="form-group">
                <label>ZIP *</label>
                <input
                  className={`co-input ${errors.zip ? "error" : ""}`}
                  placeholder="03101"
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                />
                {errors.zip && <span className="field-error">{errors.zip}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <select
                className="co-input"
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="JP">Japan</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="checkout-right">
          <div className="order-summary-box">
            <h3 className="summary-title">Order Summary</h3>
            <div className="summary-items">
              {cart.map((item) => (
                <div key={item.id} className="summary-item">
                  <img src={item.imageUri} alt={item.name} className="summary-img" />
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-meta">
                      {item.condition}{item.foil ? " · ✦ Foil" : ""} · ×{item.cartQty}
                    </span>
                  </div>
                  <span className="summary-item-price">
                    {formatPrice(parseFloat(item.price) * item.cartQty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span className="summary-total-price">{formatPrice(cartTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-footer">
        <button className="co-btn-primary" onClick={submit}>
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2 — PAYMENT ─────────────────────────────────────────────────────────

function PaymentStep({ cart, cartTotal, shipping, onSuccess, onBack, onClose }) {
  const [currency, setCurrency] = useState("USDC");
  const [orderId] = useState(generateOrderId);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [txSig, setTxSig] = useState("");
  const [txError, setTxError] = useState("");

  const amount = cartTotal.toFixed(2);
  const label = "The Sol Ring Shop";
  const message = `Order ${orderId} — ${cart.length} item${cart.length !== 1 ? "s" : ""}`;

  const payUrl = buildSolanaPayUrl({
    wallet: SHOP_WALLET,
    amount,
    currency,
    orderId,
    label,
    message,
  });

  const qrUrl = getQRUrl(payUrl);

  const copyWallet = () => {
    navigator.clipboard.writeText(SHOP_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmPayment = async () => {
    if (!txSig.trim()) {
      setTxError("Please paste your transaction signature");
      return;
    }
    if (txSig.trim().length < 30) {
      setTxError("That doesn't look like a valid transaction signature");
      return;
    }
    setConfirming(true);
    setTxError("");

    const shippingAddress = `${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}, ${shipping.country}`;

    // Send order notification to shop
    await sendEmail({
      order_id: orderId,
      date: new Date().toLocaleString(),
      customer_name: shipping.name,
      customer_email: shipping.email,
      shipping_address: shippingAddress,
      order_items: formatItems(cart),
      total: `${formatPrice(cartTotal)} (${currency})`,
      payment_method: currency,
      tx_signature: txSig.trim(),
      to_email: SHOP_EMAIL,
    });

    // Send receipt to customer
    await sendEmail({
      order_id: orderId,
      date: new Date().toLocaleString(),
      customer_name: shipping.name,
      customer_email: shipping.email,
      shipping_address: shippingAddress,
      order_items: formatItems(cart),
      total: `${formatPrice(cartTotal)} (${currency})`,
      payment_method: currency,
      tx_signature: txSig.trim(),
      to_email: shipping.email,
    });

    setConfirming(false);
    onSuccess({
      orderId,
      txSig: txSig.trim(),
      currency,
      shipping,
      cart,
      cartTotal,
    });
  };

  return (
    <div className="checkout-step">
      <div className="checkout-header">
        <button className="checkout-back" onClick={onBack}>← Back</button>
        <h2 className="checkout-title">Payment</h2>
        <button className="checkout-close" onClick={onClose}>×</button>
      </div>

      <div className="checkout-body payment-body">
        <div className="checkout-left">

          {/* Currency selector */}
          <div className="currency-selector">
            <button
              className={`currency-btn ${currency === "USDC" ? "active" : ""}`}
              onClick={() => setCurrency("USDC")}
            >
              <span className="currency-icon">💵</span>
              <div>
                <span className="currency-name">USDC</span>
                <span className="currency-desc">Stable — always ${amount}</span>
              </div>
            </button>
            <button
              className={`currency-btn ${currency === "SOL" ? "active" : ""}`}
              onClick={() => setCurrency("SOL")}
            >
              <span className="currency-icon">◎</span>
              <div>
                <span className="currency-name">SOL</span>
                <span className="currency-desc">Solana native token</span>
              </div>
            </button>
          </div>

          {/* Payment methods */}
          <div className="payment-methods">

            {/* Method 1 - QR Code */}
            <div className="payment-method">
              <div className="method-header">
                <span className="method-num">1</span>
                <span className="method-title">Scan QR Code</span>
                <span className="method-tag">Mobile</span>
              </div>
              <div className="qr-wrap">
                <img src={qrUrl} alt="Solana Pay QR" className="qr-code" />
                <p className="qr-hint">Open Phantom or any Solana wallet and scan</p>
              </div>
            </div>

            {/* Method 2 - Click to Pay */}
            <div className="payment-method">
              <div className="method-header">
                <span className="method-num">2</span>
                <span className="method-title">Click to Pay</span>
                <span className="method-tag">Desktop</span>
              </div>
              <button
                className="click-to-pay-btn"
                onClick={async () => {
                  // Check if Phantom is installed
                  const isPhantom = window?.solana?.isPhantom;
                  if (!isPhantom) {
                    window.open("https://phantom.app/download", "_blank");
                    return;
                  }

                  try {
                    // Connect to Phantom
                    const resp = await window.solana.connect();
                    const publicKey = resp.publicKey;

                    // Create simple SOL transfer transaction
                    // In production you'd use @solana/web3.js here
                    // For now just show the payment URL so they can scan or copy
                    alert(`Phantom connected! Wallet: ${publicKey.toString()}\n\nPlease use QR code or manual payment methods below to complete the transaction.`);
                  } catch (err) {
                    console.error("Phantom error:", err);
                    alert("Failed to connect Phantom. Please try the QR code or manual payment instead.");
                  }
                }}
              >
                {window?.solana?.isPhantom
                  ? "◎ Open in Phantom Wallet"
                  : "◎ Install Phantom Wallet"}
              </button>
              <p className="method-hint">
                {window?.solana?.isPhantom
                  ? "Phantom detected — click to open payment"
                  : "Phantom browser extension required for this option"}
              </p>
            </div>

            {/* Method 3 - Manual */}
            <div className="payment-method">
              <div className="method-header">
                <span className="method-num">3</span>
                <span className="method-title">Send Manually</span>
                <span className="method-tag">Any Wallet</span>
              </div>
              <div className="manual-pay">
                <div className="manual-row">
                  <span className="manual-label">Send to:</span>
                  <div className="wallet-wrap">
                    <span className="wallet-addr">{SHOP_WALLET.slice(0, 20)}…</span>
                    <button className="copy-btn" onClick={copyWallet}>
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="manual-row">
                  <span className="manual-label">Amount:</span>
                  <span className="manual-amount">
                    {currency === "USDC" ? `${amount} USDC` : `${amount} SOL`}
                  </span>
                </div>
                <div className="manual-row">
                  <span className="manual-label">Memo:</span>
                  <span className="manual-memo">{orderId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="checkout-right">
          <div className="order-summary-box">
            <h3 className="summary-title">Order {orderId}</h3>
            <div className="summary-items">
              {cart.map((item) => (
                <div key={item.id} className="summary-item">
                  <img src={item.imageUri} alt={item.name} className="summary-img" />
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-meta">
                      {item.condition}{item.foil ? " · ✦ Foil" : ""} · ×{item.cartQty}
                    </span>
                  </div>
                  <span className="summary-item-price">
                    {formatPrice(parseFloat(item.price) * item.cartQty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span className="summary-total-price">{formatPrice(cartTotal)}</span>
            </div>

            {/* Shipping summary */}
            <div className="shipping-summary">
              <p className="shipping-summary-label">Ship to:</p>
              <p className="shipping-summary-text">
                {shipping.name}<br />
                {shipping.address}<br />
                {shipping.city}, {shipping.state} {shipping.zip}<br />
                {shipping.country}
              </p>
            </div>
          </div>

          {/* Confirm payment */}
          <div className="confirm-payment-box">
            <p className="confirm-label">After paying paste your transaction signature:</p>
            <input
              className={`co-input ${txError ? "error" : ""}`}
              placeholder="Transaction signature…"
              value={txSig}
              onChange={(e) => { setTxSig(e.target.value); setTxError(""); }}
            />
            {txError && <span className="field-error">{txError}</span>}
            <button
              className="co-btn-primary"
              onClick={confirmPayment}
              disabled={confirming}
              style={{ marginTop: 10, width: "100%" }}
            >
              {confirming ? "Confirming…" : "Confirm Payment ✓"}
            </button>
            <p className="confirm-hint">
              Find your transaction signature in your wallet's transaction history
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3 — RECEIPT ─────────────────────────────────────────────────────────

function Receipt({ order, onClose }) {
  const shippingAddress = `${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}, ${order.shipping.country}`;

  return (
    <div className="checkout-step receipt-step">
      <div className="receipt-header">
        <div className="receipt-check">✓</div>
        <h2 className="receipt-title">Order Confirmed!</h2>
        <p className="receipt-sub">
          A receipt has been sent to {order.shipping.email}
        </p>
      </div>

      <div className="receipt-body">
        <div className="receipt-box">
          <div className="receipt-row">
            <span className="receipt-label">Order ID</span>
            <span className="receipt-value accent">{order.orderId}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Date</span>
            <span className="receipt-value">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Payment</span>
            <span className="receipt-value">{order.currency}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Transaction</span>
            <span className="receipt-value tx">
              {order.txSig.slice(0, 24)}…
            </span>
          </div>
          <div className="receipt-divider" />
          <div className="receipt-row">
            <span className="receipt-label">Ship to</span>
            <span className="receipt-value">{order.shipping.name}</span>
          </div>
          <div className="receipt-address">{shippingAddress}</div>
          <div className="receipt-divider" />
          <div className="receipt-items">
            {order.cart.map((item) => (
              <div key={item.id} className="receipt-item">
                <img src={item.imageUri} alt={item.name} className="receipt-img" />
                <div className="receipt-item-info">
                  <span className="receipt-item-name">{item.name}</span>
                  <span className="receipt-item-meta">
                    {item.condition}{item.foil ? " · ✦ Foil" : ""} · ×{item.cartQty}
                  </span>
                </div>
                <span className="receipt-item-price">
                  {formatPrice(parseFloat(item.price) * item.cartQty)}
                </span>
              </div>
            ))}
          </div>
          <div className="receipt-divider" />
          <div className="receipt-total-row">
            <span className="receipt-total-label">Total Paid</span>
            <span className="receipt-total-price">{formatPrice(order.cartTotal)}</span>
          </div>
        </div>

        <div className="receipt-note">
          <p>⭕ Thank you for shopping at The Sol Ring Shop</p>
          <p>Your cards will be shipped within 1-3 business days</p>
          <p>Questions? Email orders@thesolringshop.com</p>
        </div>
      </div>

      <div className="checkout-footer">
        <button className="co-btn-primary" onClick={onClose}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

// ─── MAIN CHECKOUT COMPONENT ──────────────────────────────────────────────────

export function Checkout({ cart, cartTotal, onClose, onComplete }) {
  const [step, setStep] = useState("shipping"); // shipping → payment → receipt
  const [shipping, setShipping] = useState(null);
  const [order, setOrder] = useState(null);
  const { user } = useAuth();

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div
        className="checkout-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="checkout-progress">
          <div className={`progress-step ${step === "shipping" ? "active" : step !== "shipping" ? "done" : ""}`}>
            <span className="ps-num">{step !== "shipping" ? "✓" : "1"}</span>
            <span className="ps-label">Shipping</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === "payment" ? "active" : step === "receipt" ? "done" : ""}`}>
            <span className="ps-num">{step === "receipt" ? "✓" : "2"}</span>
            <span className="ps-label">Payment</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === "receipt" ? "active" : ""}`}>
            <span className="ps-num">3</span>
            <span className="ps-label">Receipt</span>
          </div>
        </div>

        {step === "shipping" && (
          <ShippingForm
            cart={cart}
            cartTotal={cartTotal}
            onNext={(shippingData) => {
              setShipping(shippingData);
              setStep("payment");
            }}
            onClose={onClose}
          />
        )}

        {step === "payment" && (
          <PaymentStep
            cart={cart}
            cartTotal={cartTotal}
            shipping={shipping}
            onSuccess={async (orderData) => {
              // Save order to database
              await db.createOrder({
                ...orderData,
                profileId: user?.id || null, // Link to profile if logged in
              });
              
              // Update user's total spent if logged in
              if (user) {
                const newTotal = (parseFloat(user.total_spent) || 0) + cartTotal;
                await db.updateProfile(user.id, { total_spent: newTotal });
              }
              
              setOrder(orderData);
              setStep("receipt");
              onComplete();
            }}
            onBack={() => setStep("shipping")}
            onClose={onClose}
          />
        )}

        {step === "receipt" && (
          <Receipt
            order={order}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
