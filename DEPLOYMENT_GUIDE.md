# 🔐 SECURE AUTH SYSTEM - DEPLOYMENT GUIDE

## ⚠️ CRITICAL: Follow Steps IN ORDER

This is a complete rebuild with proper Supabase Authentication. Do NOT skip steps.

---

## STEP 1: SUPABASE CONFIGURATION (5 minutes)

### A) Enable Row Level Security Policies

1. Go to Supabase Dashboard → **SQL Editor**
2. Click "New query"
3. Copy ENTIRE contents of `SECURITY_POLICIES.sql`
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. Verify: Should see "Success. No rows returned"

### B) Verify Settings

Go to **Authentication** → **Settings**:

**These should be ON:**
- ✅ Enable email provider
- ✅ Confirm email
- ✅ Secure email change
- ✅ Secure password change

**These should be OFF:**
- ❌ Enable anonymous sign-ins (optional, can leave on)

### C) URL Configuration

Go to **Authentication** → **URL Configuration**:

- **Site URL:** `https://thesolringshop.com`
- **Redirect URLs:** Add these:
  - `https://thesolringshop.com/**`
  - `http://localhost:5173/**` (for local testing)

Click **Save**

---

## STEP 2: CLEAN DATABASE (2 minutes)

Go to **Table Editor**:

1. Click `profiles` table
2. **Delete ALL rows** (we're starting fresh)
3. Confirm deletion

---

## STEP 3: DEPLOY TO GITHUB/VERCEL (5 minutes)

### Extract & Upload:

1. **Extract** `solringshop-secure.zip`
2. Open the extracted `mtg-store-secure` folder
3. Upload these to GitHub:
   - `src/` folder (all files inside)
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `vercel.json`

4. **Commit** and wait for Vercel deployment (~30 seconds)

---

## STEP 4: TESTING CHECKLIST ✅

### Test 1: Email Signup

1. Go to thesolringshop.com
2. Click "Sign In"
3. Click "Sign up"
4. Enter:
   - Email: joeyr1989@gmail.com
   - Password: (your choice, 6+ chars)
   - Username: joeyr
5. Click "Create Account"
6. **Expected:** "Check Your Email" message
7. Check your email inbox
8. Click the confirmation link
9. **Expected:** Redirected to site, automatically logged in

### Test 2: Login

1. Sign out (click username → Sign Out)
2. Click "Sign In"
3. Enter email + password
4. **Expected:** Logged in successfully

### Test 3: Magic Link

1. Sign out
2. Click "Sign In"
3. Click "Use magic link instead"
4. Enter your email
5. Click "Send Magic Link"
6. Check email
7. Click the link
8. **Expected:** Auto-logged in

### Test 4: Password Reset

1. Sign out
2. Click "Sign In"
3. Click "Forgot password?"
4. Enter your email
5. Click "Send Reset Link"
6. Check email
7. Click reset link
8. Enter new password twice
9. **Expected:** Password updated, redirected home

### Test 5: Profile & Settings

1. While logged in, click your username
2. **Expected:** Dropdown shows View Profile, Account Settings, Sign Out
3. Click "View Profile"
4. **Expected:** Your profile page loads
5. Go to Account Settings
6. Update display name or bio
7. Click "Save Profile Changes"
8. **Expected:** Changes saved, still visible when you refresh

### Test 6: Wallet Linking

1. Go to Account Settings
2. Click "Link Wallet"
3. Phantom connects
4. **Expected:** Wallet address shown in settings

### Test 7: Admin Access

1. While logged in as joeyr1989@gmail.com
2. Click "Admin" button
3. Enter password: `solring2024`
4. **Expected:** Admin panel loads

### Test 8: Make a Purchase (Order Linking)

1. Browse shop, add cards to cart
2. Go to checkout
3. Complete payment
4. Go to your profile
5. Click "Orders" tab
6. **Expected:** Your order shows up

### Test 9: Wallet Signup (New Account)

1. Sign out
2. Click "Sign In"
3. Switch to "Wallet" tab
4. Click "Sign up"
5. Enter username: testuser
6. Connect Phantom
7. **Expected:** Account created, logged in

---

## STEP 5: VERIFY SECURITY 🔒

### Check RLS is Working:

1. Open browser console (F12)
2. Try this in console:
```javascript
// Try to delete someone else's data (should fail)
fetch('https://drxozafwhmvlnerlydek.supabase.co/rest/v1/profiles?id=eq.SOME_OTHER_ID', {
  method: 'DELETE',
  headers: {
    'apikey': 'your_anon_key',
    'Authorization': 'Bearer your_anon_key'
  }
})
```

**Expected:** 401 Unauthorized or 403 Forbidden

### Admin-Only Actions:

1. Sign out
2. Sign up as a test user (NOT joeyr1989@gmail.com)
3. Try to access Admin panel
4. **Expected:** Can't modify inventory (RLS blocks it)

---

## WHAT'S NEW & SECURE 🛡️

### Authentication:
✅ Real password hashing (bcrypt via Supabase)
✅ Email verification required
✅ Magic link login
✅ Password reset via email
✅ Secure session tokens
✅ Auto-refresh tokens

### Database Security:
✅ Row Level Security enabled
✅ Users can only see/edit their own data
✅ Only admin (joeyr1989@gmail.com) can modify inventory
✅ Orders protected
✅ Profiles protected

### Rate Limiting:
✅ Supabase handles auth rate limiting automatically

### Session Management:
✅ Secure session storage
✅ Auto-refresh on page load
✅ Logout clears all sessions

---

## TROUBLESHOOTING

### "Email not confirmed"
- Check spam folder for confirmation email
- Resend by signing up again with same email

### "Invalid credentials"
- Make sure you confirmed your email first
- Try password reset if you forgot password

### Stuck on loading
- Clear browser cache
- Check Supabase → Authentication → Users to see if account exists

### RLS blocking legitimate actions
- Check SQL policies are applied
- Verify joeyr1989@gmail.com has is_admin = true

### Admin panel not loading
- Password is: `solring2024`
- Make sure you're logged in

---

## SUCCESS CRITERIA ✓

All these should work:
- ✅ Email signup with confirmation
- ✅ Email login
- ✅ Magic link login
- ✅ Password reset
- ✅ Profile pages load
- ✅ Settings save
- ✅ Wallet linking works
- ✅ Orders attach to profile
- ✅ Admin panel works
- ✅ Non-admins can't modify inventory
- ✅ Users can only edit own data

---

## SUPPORT

If something breaks:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify RLS policies are active
4. Make sure email confirmation is ON in Supabase

---

**REMEMBER:** Extract the zip first, then upload to GitHub!
