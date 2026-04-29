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
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0a0a0c; color: #d4b86a; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f9f9f9; padding: 30px; }
        .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; padding-top: 15px; border-top: 2px solid #d4b86a; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .tx-hash { font-family: monospace; font-size: 11px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>◎ Order Confirmed</h1>
        </div>
        <div class="content">
          <h2>Thank you for your order!</h2>
          <p>Order #<strong>${order.order_number}</strong></p>
          <p>Your payment has been confirmed on the Solana blockchain.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            ${order.items.map(item => `
              <div class="item">
                <span>${item.name} ${item.foil ? '(Foil)' : ''} - ${item.condition}</span>
                <span>$${item.price} × ${item.qty}</span>
              </div>
            `).join('')}
            <div class="item">
              <span>Shipping</span>
              <span>$${order.shipping_fee.toFixed(2)}</span>
            </div>
            <div class="item total">
              <span>Total (USD)</span>
              <span>$${order.total_usd.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Paid (SOL)</span>
              <span>◎${order.total_sol.toFixed(6)}</span>
            </div>
          </div>

          <div class="order-details">
            <h3>Shipping Address</h3>
            <p>
              ${order.shipping_name}<br>
              ${order.shipping_address_line1}<br>
              ${order.shipping_address_line2 ? order.shipping_address_line2 + '<br>' : ''}
              ${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}<br>
              ${order.shipping_country}
            </p>
          </div>

          <div class="order-details">
            <h3>Transaction Details</h3>
            <p><strong>Transaction Hash:</strong></p>
            <div class="tx-hash">${order.transaction_signature}</div>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              You can verify this transaction on 
              <a href="https://solscan.io/tx/${order.transaction_signature}" target="_blank">Solscan</a>
            </p>
          </div>

          <p>We'll send you another email with tracking information once your order ships!</p>
        </div>
        <div class="footer">
          <p>The Sol Ring Shop | Crypto-Native MTG Cards</p>
          <p>Questions? Reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: order.customer_email,
    subject: `Order Confirmed - ${order.order_number}`,
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
