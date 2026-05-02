// Email service using Resend

const RESEND_API_KEY = 're_9K9GnWr7_J1ybm4vsxgfVXfSc8BERhEHe';
const FROM_EMAIL = 'orders@thesolringshop.com'; // You'll need to verify this domain in Resend
const ADMIN_EMAIL = 'joeyr1989@gmail.com';

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(order) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #d4b86a; 
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .header p {
          margin: 10px 0 0 0;
          color: #999;
          font-size: 14px;
        }
        .content { 
          padding: 40px 30px;
        }
        .order-number {
          text-align: center;
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
        }
        .order-number strong {
          color: #d4b86a;
          font-size: 18px;
        }
        .section {
          background: #f9f9f9;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 6px;
          border-left: 3px solid #d4b86a;
        }
        .section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .item-row:last-child {
          border-bottom: none;
        }
        .item-name {
          flex: 1;
          color: #333;
        }
        .item-qty {
          margin: 0 15px;
          color: #666;
        }
        .item-price {
          font-weight: 600;
          color: #333;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 15px 0;
          border-top: 2px solid #d4b86a;
          margin-top: 10px;
          font-weight: 700;
          font-size: 18px;
        }
        .address {
          line-height: 1.6;
          color: #555;
        }
        .tx-box {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 4px;
          margin-top: 10px;
        }
        .tx-hash {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
          color: #666;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #d4b86a;
          color: #000;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin-top: 10px;
        }
        .footer {
          background: #f5f5f5;
          text-align: center;
          padding: 30px;
          color: #999;
          font-size: 13px;
        }
        .footer strong {
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>◎ THE SOL RING SHOP</h1>
          <p>Thank You For Your Order</p>
        </div>
        
        <div class="content">
          <div class="order-number">
            Order <strong>#${order.order_number}</strong>
          </div>
          
          <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Your payment has been confirmed on the Solana blockchain.<br>
            We'll ship your cards and send tracking information shortly.
          </p>
          
          <div class="section">
            <h3>Order Items</h3>
            ${order.items.map(item => `
              <div class="item-row">
                <span class="item-name">${item.name}${item.foil ? ' (Foil)' : ''} - ${item.condition}</span>
                <span class="item-qty">×${item.qty}</span>
                <span class="item-price">$${(item.price * item.qty).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="item-row">
              <span class="item-name">Shipping (USPS)</span>
              <span class="item-qty"></span>
              <span class="item-price">$${order.shipping_fee.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Total (USD)</span>
              <span>$${order.total_usd.toFixed(2)}</span>
            </div>
            <div style="text-align: right; margin-top: 10px; color: #999; font-size: 14px;">
              Paid: ◎${order.total_sol.toFixed(6)} SOL
            </div>
          </div>

          <div class="section">
            <h3>Shipping Address</h3>
            <div class="address">
              ${order.shipping_name}<br>
              ${order.shipping_address_line1}<br>
              ${order.shipping_address_line2 ? order.shipping_address_line2 + '<br>' : ''}
              ${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}<br>
              ${order.shipping_country}
            </div>
          </div>

          <div class="section">
            <h3>Transaction Verification</h3>
            <div class="tx-box">
              <p class="tx-hash">${order.transaction_signature}</p>
            </div>
            <a href="https://solscan.io/tx/${order.transaction_signature}" class="button" target="_blank">
              View on Solscan →
            </a>
          </div>

          <p style="text-align: center; color: #999; margin-top: 40px; font-size: 14px;">
            Questions? Just reply to this email
          </p>
        </div>
        
        <div class="footer">
          <strong>The Sol Ring Shop</strong><br>
          Crypto-Native Magic: The Gathering Cards
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: order.customer_email,
    subject: `Order #${order.order_number} Confirmed - The Sol Ring Shop`,
    html: emailHtml
  });
}

/**
 * Send shipping notification with tracking to customer
 */
export async function sendTrackingEmail(order) {
  const trackingUrl = order.tracking_carrier === 'USPS' 
    ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`
    : `https://www.google.com/search?q=${order.tracking_number}+tracking`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0a0a0c; color: #d4b86a; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; }
        .tracking-box { background: white; padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center; }
        .tracking-number { font-size: 20px; font-weight: bold; color: #d4b86a; margin: 15px 0; }
        .track-button { display: inline-block; background: #d4b86a; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Your Order Has Shipped!</h1>
        </div>
        <div class="content">
          <h2>Order #${order.order_number} is on its way!</h2>
          <p>Your cards have been shipped and should arrive soon.</p>
          
          <div class="tracking-box">
            <p><strong>Tracking Number:</strong></p>
            <div class="tracking-number">${order.tracking_number}</div>
            <p><strong>Carrier:</strong> ${order.tracking_carrier || 'USPS'}</p>
            <a href="${trackingUrl}" class="track-button" target="_blank">Track Package</a>
          </div>

          <p>If you have any questions about your order, just reply to this email!</p>
        </div>
        <div class="footer">
          <p>The Sol Ring Shop | Crypto-Native MTG Cards</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: order.customer_email,
    subject: `Your Order Has Shipped - ${order.order_number}`,
    html: emailHtml
  });
}

/**
 * Send new order notification to admin
 */
export async function sendAdminNotification(order) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4ade80; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .item { padding: 8px 0; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New Order Received!</h1>
        </div>
        <div class="content">
          <h2>Order #${order.order_number}</h2>
          
          <div class="order-details">
            <h3>Customer:</h3>
            <p><strong>${order.shipping_name}</strong><br>
            ${order.customer_email}</p>
          </div>

          <div class="order-details">
            <h3>Shipping Address:</h3>
            <p>
              ${order.shipping_address_line1}<br>
              ${order.shipping_address_line2 ? order.shipping_address_line2 + '<br>' : ''}
              ${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}
            </p>
          </div>

          <div class="order-details">
            <h3>Items:</h3>
            ${order.items.map(item => `
              <div class="item">${item.name} ${item.foil ? '(Foil)' : ''} - ${item.condition} (×${item.qty})</div>
            `).join('')}
          </div>

          <div class="order-details">
            <h3>Payment:</h3>
            <p>
              <strong>Total:</strong> $${order.total_usd.toFixed(2)} (◎${order.total_sol.toFixed(6)})<br>
              <strong>TX:</strong> ${order.transaction_signature}
            </p>
          </div>

          <p><a href="https://thesolringshop.com" target="_blank">View in Admin Panel</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Order: ${order.order_number} - $${order.total_usd.toFixed(2)}`,
    html: emailHtml
  });
}

/**
 * Base email sending function using Resend API
 */
async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return { success: false, error: data };
    }

    console.log('Email sent:', data);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
