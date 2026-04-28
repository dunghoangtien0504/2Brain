# 🚀 QUICK START — Deploy Fixed Version

## 30-Second Overview
3 files đã được fix để improve error handling, logging, và user experience:
- `api/webhook-sepay.js` ✅ Better IPN handling
- `api/create-order-sepay.js` ✅ Robust order creation
- `script.js` ✅ Improved frontend UX

---

## Step 1: Update GitHub Repo (5 minutes)

### Option A: Direct Upload via GitHub Web
1. Go to https://github.com/dunghoangtien0504/2Brain
2. Navigate to each file:
   - Click `api/webhook-sepay.js` → Edit (pencil icon)
   - Delete all content → Paste content from fixed version
   - Commit: "Fix: Improve webhook error handling"
3. Repeat for:
   - `api/create-order-sepay.js`
   - `script.js`

### Option B: Git Command Line
```bash
# Clone repo (if not already)
git clone https://github.com/dunghoangtien0504/2Brain.git
cd 2Brain

# Copy fixed files
# (Copy từ /home/claude/2Brain-fixed/)

# Commit and push
git add api/webhook-sepay.js api/create-order-sepay.js script.js
git commit -m "Fix: Improve error handling and logging"
git push origin main
```

---

## Step 2: Verify Vercel Deployment (2 minutes)

1. Go to https://vercel.com/dunghoangtien0504-7276s-projects
2. Wait for auto-deployment to finish (~1 minute)
3. Check deployment status shows "Ready"

---

## Step 3: Test Payment Flow (3 minutes)

### A. Test Form Submission
1. Go to https://2brain.hoangtiendung.com
2. Fill form with test data:
   - Name: `Test User`
   - Phone: `0901234567`
   - Email: `your-email@gmail.com`
3. Click "Tiếp Theo"
4. Verify QR code appears

### B. Check Logs
1. Go to Vercel Dashboard → Logs
2. Look for:
```
📤 [CREATE-ORDER] Sepay API request: ...
✅ [CREATE-ORDER] Order created successfully
```

### C. Test Real Payment (Optional)
1. Transfer 299,000đ to:
   - Bank: MB Bank
   - STK: 333303838
   - Note: `2Brain 0901234567`
2. Wait ~10 seconds
3. Check if success message appears

---

## Step 4: Verify Email Setup (CRITICAL)

### Check Resend API Key
1. Go to Vercel → Settings → Environment Variables
2. Find `SMTP_PASS` or `RESEND_API_KEY`
3. Verify it starts with `re_`

### If Missing or Invalid:
1. Go to https://resend.com/api-keys
2. Create new API key
3. Add to Vercel env vars:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. Redeploy project

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Website loads: https://2brain.hoangtiendung.com
- [ ] Form submission works (QR appears)
- [ ] Supabase receives lead (check table)
- [ ] Vercel logs show CREATE-ORDER success
- [ ] Email sent after payment (if tested)

---

## 🆘 If Something Breaks

### Form Not Submitting
**Check:** Browser console (F12) for errors
**Fix:** Clear cache (Ctrl+Shift+R)

### QR Not Showing
**Check:** Vercel logs for [CREATE-ORDER] errors
**Fix:** Verify SEPAY credentials in env vars

### Email Not Received
**Check:** Vercel logs for [WEBHOOK] email errors
**Fix:** Verify RESEND_API_KEY is valid

### Webhook Not Triggered
**Check:** Sepay IPN settings
**Fix:** Ensure URL is `https://2brain.hoangtiendung.com/api/webhook-sepay`

---

## 📞 Emergency Contacts

### Payment Issues
- Sepay Dashboard: https://my.sepay.vn
- Support: support@sepay.vn

### Email Issues  
- Resend Dashboard: https://resend.com/emails
- Check quota/limits

### Database Issues
- Supabase Dashboard: https://supabase.com/dashboard/project/qmmiuqztukpagbuigzma

---

## 🎯 Next Steps After Deployment

1. **Monitor first 5 real transactions**
   - Watch Vercel logs in real-time
   - Verify all emails sent successfully

2. **Set up alerts**
   - Vercel → Integrations → Slack/Discord
   - Get notified on errors

3. **Document issues**
   - Keep track of edge cases
   - Update error handling as needed

---

**Estimated Total Time:** 10-15 minutes  
**Difficulty:** Easy (just copy-paste and verify)

Good luck! 🚀
