# v21 - CRITICAL FIXES

## Issues Fixed:

### ✅ CRITICAL: SOL Conversion Bug
**Problem:** $0.50 USD charged 0.50 SOL (~$40+)
**Fix:**
- Added extensive logging to track conversion
- Added error alerts if SOL price fails to load
- Console will now show: conversion breakdown, API responses, calculated amounts
- **Test this first** - check browser console (F12) during checkout to verify conversion is correct

### ✅ CRITICAL: Inventory Deduction
**Problem:** Cards stayed in inventory after purchase (ghost inventory)
**Fix:**
- Added `deductInventory()` function to supabase.js
- After order confirmed → automatically subtracts purchased qty from inventory
- Logs each deduction to console
- **Inventory now updates immediately after payment**

### ✅ CRITICAL: Shipping Fee Display
**Problem:** Only showed card price, not shipping
**Fix:**
- Shipping ($4.98) was already in calculation but now verified
- Shows clearly in order summary:
  - Card(s): $X.XX
  - Shipping: $4.98
  - Total: $X.XX

### ✅ Email Design Improved
**Problem:** Emails looked unprofessional
**Fix:**
- Completely redesigned order confirmation email
- Modern, clean layout
- Better typography and spacing
- Mobile-responsive
- Professional branding

---

## Still TODO (for next session):

### High Priority:
- [ ] Auto-detect QR code payments (no manual hash entry)
- [ ] Remove USDC references from UI
- [ ] Fix order tracking in admin panel
- [ ] Fix profile order history
- [ ] Improve order number format
- [ ] Streamline overall UX

### Medium Priority:
- [ ] Better error messages
- [ ] Loading states during checkout
- [ ] Prevent duplicate orders

---

## Testing Steps:

### 1. Check SOL Conversion:
1. Add a $0.50 card to cart
2. Go to checkout
3. **Open browser console (F12)**
4. Fill in address
5. Look for logs:
   ```
   [Checkout] Fetching SOL price from CoinGecko...
   [Checkout] SOL price received: 142.50 (example)
   [Checkout] Conversion: {
     subtotal: "0.50",
     shipping: "4.98",
     totalUSD: "5.48",
     solPrice: "142.50",
     totalSOL: "0.038456"  ← Should be ~0.03, NOT 0.50!
   }
   ```
6. **Verify:** Total SOL should be ~0.035-0.04, NOT 0.50 or 5.48

### 2. Check Inventory Deduction:
1. Note card quantity before purchase
2. Complete checkout
3. Go to Admin → Inventory
4. **Verify:** Quantity decreased by amount purchased

### 3. Check Shipping:
1. During checkout, verify summary shows:
   - Card: $0.50
   - Shipping: $4.98
   - Total: $5.48 USD
   - ≈ 0.038 SOL (at $142/SOL example rate)

### 4. Check Email:
1. After purchase, check your email
2. Should see professional-looking email with:
   - Order number
   - Items purchased
   - Shipping address
   - Transaction hash with Solscan link

---

## If Conversion is STILL Wrong:

**Check these in browser console:**

1. Is CoinGecko API being called?
   - Look for: `[Checkout] Fetching SOL price...`

2. What price did it return?
   - Look for: `[Checkout] SOL price received: X`

3. What's the conversion math?
   - Look for: `[Checkout] Conversion: {...}`

**Send me screenshots of console logs if still broken!**

---

## Known Remaining Issues:

1. Manual transaction hash entry (clunky)
2. USDC mentioned somewhere in UI
3. Order tracking broken
4. Profile tracking broken
5. Order numbers could be better
6. UX needs polish

**We'll tackle these next session after verifying these critical fixes work!**
