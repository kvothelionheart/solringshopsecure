# Solana Pay Setup Instructions

## What Was Built:

✅ Complete Solana Pay checkout system  
✅ Real-time USD → SOL conversion (CoinGecko API)  
✅ Email confirmations (Resend API)  
✅ Admin order management  
✅ Tracking number emails  

---

## Setup Steps:

### 1. Run Database Migrations

In Supabase SQL Editor, run these files in order:

1. `SETTINGS_TABLE.sql` (if not already run)
2. `ORDERS_TABLE.sql` (NEW - creates orders table)

### 2. Resend Email Setup

Your API key is already in the code: `re_9K9GnWr7_J1ybm4vsxgfVXfSc8BERhEHe`

**BUT - you need to verify your domain:**

1. Go to resend.com/domains
2. Add domain: `thesolringshop.com`
3. Add these DNS records (they'll give you the exact values):
   - SPF record
   - DKIM record
   - DMARC record (optional)

**Until domain is verified, emails will come from:** `onboarding@resend.dev`

**Update email service** once verified:
- Open `/src/emailService.js`
- Change `FROM_EMAIL` from `orders@thesolringshop.com` to your verified email

### 3. Install Dependencies

```bash
npm install
```

This will install the `qrcode` package needed for QR code generation.

### 4. Deploy

Upload to GitHub → Vercel will auto-deploy

---

## How It Works:

### Customer Flow:

1. Add cards to cart
2. Click "Checkout"
3. Enter email + shipping address
4. See total in SOL (real-time conversion)
5. Pay via:
   - **QR Code** (scan with phone wallet)
   - **Open in Wallet** (desktop Phantom/Solflare)
   - **Manual** (copy address, paste tx signature)
6. Transaction verified on-chain
7. Order created in database
8. Confirmation email sent

### Admin Flow:

1. Get email notification when order arrives
2. Go to Admin → Orders
3. See all orders with shipping addresses
4. Ship cards → get tracking number
5. Enter tracking in admin panel
6. Click "Add & Email Customer"
7. Customer gets tracking email automatically

---

## Pricing:

- **Subtotal:** Sum of card prices
- **Shipping:** $4.98 (flat rate)
- **Total USD:** Subtotal + $4.98
- **Total SOL:** USD ÷ current SOL price (via CoinGecko)

**Conversion updates every 30 seconds** during checkout.

---

## Testing:

### Test on Solana Devnet First:

1. Change `SOLANA_RPC` in `/src/solanaPay.js`:
   ```javascript
   const SOLANA_RPC = 'https://api.devnet.solana.com';
   ```

2. Use a devnet wallet address

3. Get devnet SOL from faucet: https://faucet.solana.com/

4. Test full checkout flow

5. **BEFORE GOING LIVE:** Change back to mainnet URL

---

## Email Templates:

Three email types are sent:

1. **Order Confirmation** (to customer)
   - Order number
   - Items purchased
   - Shipping address
   - Transaction hash
   - Link to Solscan

2. **Tracking Notification** (to customer)
   - Tracking number
   - Carrier
   - Link to track package

3. **Admin Notification** (to you)
   - New order alert
   - Customer info
   - Shipping address
   - Items to ship

All templates are in `/src/emailService.js` - customize as needed!

---

## Security Notes:

- ✅ Transaction verification happens on-chain (can't be faked)
- ✅ Email is stored but not verified (no account required)
- ✅ No customer passwords or sensitive data stored
- ✅ Wallet addresses are public (blockchain data)
- ✅ Orders table has RLS policies (only admins can see all)

---

## Support:

If customers have issues:
- Give them your transaction signature
- Check Solscan to verify payment
- Can manually create order in database if needed

---

## File Changes:

**New Files:**
- `/src/CheckoutModal.jsx` - Full checkout UI
- `/src/solanaPay.js` - Solana payment utilities
- `/src/emailService.js` - Email sending
- `/src/OrdersPage.jsx` - Admin order management (replaced old one)
- `ORDERS_TABLE.sql` - Database schema

**Modified Files:**
- `/src/Storefront.jsx` - Uses new CheckoutModal
- `/src/supabase.js` - Added order CRUD functions
- `/src/styles/main.css` - Added checkout + orders CSS
- `package.json` - Added qrcode dependency

---

## Next Steps After Deploy:

1. Test checkout with small amount
2. Verify email delivery
3. Test tracking email flow
4. Add more inventory
5. **LAUNCH! 🚀**
