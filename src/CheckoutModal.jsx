import { useState, useEffect } from 'react';
import * as solanaPay from './solanaPay.js';
import * as db from './supabase.js';
import * as email from './emailService.js';

const SHIPPING_FEE = 4.98;

export function CheckoutModal({ cart, onClose, onSuccess }) {
  const [step, setStep] = useState('info'); // info, payment, verifying, success
  const [solPrice, setSolPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  // Payment data
  const [solanaPayUrl, setSolanaPayUrl] = useState('');
  const [reference, setReference] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [verificationProgress, setVerificationProgress] = useState(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + SHIPPING_FEE;
  const totalSol = solPrice ? solanaPay.usdToSol(total, solPrice) : null;
  
  // Debug logging
  useEffect(() => {
    if (solPrice && total) {
      console.log('[Checkout] Conversion:', {
        subtotal: subtotal.toFixed(2),
        shipping: SHIPPING_FEE.toFixed(2),
        totalUSD: total.toFixed(2),
        solPrice: solPrice.toFixed(2),
        totalSOL: totalSol?.toFixed(6)
      });
    }
  }, [solPrice, total, subtotal, totalSol]);

  // Fetch SOL price on mount
  useEffect(() => {
    loadSolPrice();
    const interval = setInterval(loadSolPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadSolPrice() {
    console.log('[Checkout] Fetching SOL price from CoinGecko...');
    const price = await solanaPay.getSolPrice();
    console.log('[Checkout] SOL price received:', price);
    
    if (price && price > 0) {
      setSolPrice(price);
      console.log('[Checkout] SOL price set to:', price);
    } else {
      console.error('[Checkout] Invalid SOL price received:', price);
      alert('Unable to load current SOL price. Please refresh and try again.');
    }
  }

  function validateForm() {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return false;
    }
    if (!name || !address1 || !city || !state || !zip) {
      alert('Please fill in all shipping address fields');
      return false;
    }
    if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      alert('Please enter a valid ZIP code');
      return false;
    }
    return true;
  }

  async function handleProceedToPayment() {
    if (!validateForm()) return;
    if (!solPrice || !totalSol) {
      alert('Unable to load SOL price. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // Generate payment request
      const ref = solanaPay.generateReference();
      const payUrl = solanaPay.generateSolanaPayUrl(
        totalSol,
        ref,
        `Order for ${name}`
      );

      setReference(ref);
      setSolanaPayUrl(payUrl);
      setStep('payment');
    } catch (error) {
      console.error('Error generating payment:', error);
      alert('Error generating payment request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTransactionSubmitted(signature) {
    setTxSignature(signature);
    setStep('verifying');

    try {
      // Wait for transaction confirmation
      const txData = await solanaPay.waitForTransaction(
        signature,
        totalSol,
        (progress) => {
          setVerificationProgress(progress);
        }
      );

      if (!txData) {
        alert('Transaction verification timed out. Please contact support with your transaction signature.');
        setStep('payment');
        return;
      }

      // Create order in database
      const orderData = {
        customer_email: email,
        shipping_name: name,
        shipping_address_line1: address1,
        shipping_address_line2: address2 || null,
        shipping_city: city,
        shipping_state: state,
        shipping_zip: zip,
        shipping_country: 'US',
        items: cart.map(item => ({
          card_id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          qty: item.qty,
          foil: item.foil || false,
          condition: item.condition || 'NM'
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        shipping_fee: SHIPPING_FEE,
        total_usd: parseFloat(total.toFixed(2)),
        total_sol: parseFloat(totalSol.toFixed(6)),
        sol_price_at_time: parseFloat(solPrice.toFixed(2)),
        transaction_signature: signature,
        wallet_address: txData.sender,
        payment_status: 'confirmed'
      };

      const order = await db.createOrder(orderData);

      if (!order) {
        throw new Error('Failed to create order in database');
      }

      // Deduct purchased items from inventory
      console.log('[Checkout] Deducting inventory for order:', order.order_number);
      for (const item of cart) {
        const success = await db.deductInventory(item.id, item.qty);
        if (!success) {
          console.error('[Checkout] Failed to deduct inventory for:', item.name);
        }
      }

      // Send confirmation emails
      await email.sendOrderConfirmation(order);
      await email.sendAdminNotification(order);

      setStep('success');
      
      setTimeout(() => {
        onSuccess(order);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error processing your order. Your payment was received. Please contact support with transaction: ' + signature);
    }
  }

  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {step === 'info' && (
          <div className="checkout-step">
            <h2>Checkout</h2>
            
            <div className="checkout-summary">
              <h3>Order Summary</h3>
              {cart.map((item, i) => (
                <div key={i} className="summary-item">
                  <span>{item.name} {item.foil ? '(Foil)' : ''} × {item.qty}</span>
                  <span>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="summary-item">
                <span>Shipping</span>
                <span>${SHIPPING_FEE.toFixed(2)}</span>
              </div>
              <div className="summary-total">
                <span>Total (USD)</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {solPrice && totalSol && (
                <div className="summary-sol">
                  <span>≈ {totalSol.toFixed(6)} SOL</span>
                  <span className="sol-rate">1 SOL = ${solPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="checkout-form">
              <h3>Contact & Shipping</h3>
              
              <label>
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </label>

              <label>
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </label>

              <label>
                Address Line 1
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </label>

              <label>
                Address Line 2 (Optional)
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Apt 4B"
                />
              </label>

              <div className="form-row">
                <label>
                  City
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    required
                  />
                </label>

                <label>
                  State
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    maxLength={2}
                    required
                  />
                </label>

                <label>
                  ZIP Code
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="10001"
                    required
                  />
                </label>
              </div>

              <button
                className="btn-proceed"
                onClick={handleProceedToPayment}
                disabled={loading || !solPrice}
              >
                {loading ? 'Loading...' : `Pay ${totalSol?.toFixed(6) || '...'} SOL`}
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <SolanaPaymentStep
            solanaPayUrl={solanaPayUrl}
            totalSol={totalSol}
            totalUsd={total}
            onTransactionSubmitted={handleTransactionSubmitted}
            onBack={() => setStep('info')}
          />
        )}

        {step === 'verifying' && (
          <div className="checkout-step verification-step">
            <div className="loader"></div>
            <h2>Verifying Transaction...</h2>
            <p>Transaction: {txSignature.slice(0, 20)}...</p>
            {verificationProgress && (
              <p>Checking blockchain... ({verificationProgress.secondsElapsed}s)</p>
            )}
            <p className="verification-note">This may take up to 2 minutes</p>
          </div>
        )}

        {step === 'success' && (
          <div className="checkout-step success-step">
            <div className="success-icon">✓</div>
            <h2>Payment Confirmed!</h2>
            <p>Check your email for order confirmation and tracking updates.</p>
            <p className="tx-hash">TX: {txSignature.slice(0, 20)}...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SolanaPaymentStep({ solanaPayUrl, totalSol, totalUsd, onTransactionSubmitted, onBack }) {
  const [manualSignature, setManualSignature] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    // Generate QR code
    generateQR();
  }, [solanaPayUrl]);

  async function generateQR() {
    // We'll use qrcode library for this
    // For now, just store the URL - we'll add proper QR generation
    try {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(solanaPayUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (error) {
      console.error('QR generation error:', error);
    }
  }

  function handleSubmitSignature() {
    if (!manualSignature || manualSignature.length < 20) {
      alert('Please enter a valid transaction signature');
      return;
    }
    onTransactionSubmitted(manualSignature);
  }

  function openInWallet() {
    window.location.href = solanaPayUrl;
  }

  function copyAddress() {
    navigator.clipboard.writeText('9tYP264asowHuBFHRPY5sULr4zCgFdB6AKZ573VQ3r14');
    alert('Wallet address copied!');
  }

  return (
    <div className="checkout-step payment-step">
      <button className="btn-back" onClick={onBack}>← Back</button>
      
      <h2>Pay with Solana</h2>
      <div className="payment-amount">
        <div className="amount-sol">◎ {totalSol.toFixed(6)} SOL</div>
        <div className="amount-usd">${totalUsd.toFixed(2)} USD</div>
      </div>

      <div className="payment-methods">
        <div className="payment-method">
          <h3>Scan QR Code</h3>
          <p>Open your Solana wallet app and scan:</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Solana Pay QR Code" className="qr-code" />
          ) : (
            <div className="qr-loading">Generating QR code...</div>
          )}
        </div>

        <div className="payment-divider">OR</div>

        <div className="payment-method">
          <h3>Desktop Wallet</h3>
          <button className="btn-wallet" onClick={openInWallet}>
            Open in Phantom/Solflare
          </button>
          
          <h3 style={{ marginTop: '20px' }}>Manual Payment</h3>
          <button className="btn-copy" onClick={copyAddress}>
            Copy Wallet Address
          </button>
          <p className="wallet-address">9tYP...3r14</p>
        </div>
      </div>

      <div className="manual-signature">
        <h3>Already Sent Payment?</h3>
        <p>Enter your transaction signature:</p>
        <input
          type="text"
          value={manualSignature}
          onChange={(e) => setManualSignature(e.target.value)}
          placeholder="Transaction signature..."
        />
        <button className="btn-verify" onClick={handleSubmitSignature}>
          Verify Transaction
        </button>
      </div>
    </div>
  );
}
