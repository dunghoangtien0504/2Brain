# 🚀 Content OS V2 - Automation Setup Guide

## I. Danh sách các file cần upload

**Frontend (GitHub):**
- ✅ `index.html` — Form + Payment UI
- ✅ `script.js` — Form validation + Supabase + Sepay QR
- ✅ `sections.css` — CSS cho các section
- ✅ `styles.css` — Design tokens (giữ nguyên)
- ✅ `dung-hoang.jpg` — Ảnh profile

**Backend (Vercel):**
- 📁 `api/webhook-sepay.js` — Function xử lý webhook thanh toán

---

## II. Setup Environment Variables

### **A. Supabase Keys (Already have)**
```
SUPABASE_URL = https://qmmiuqztukpagbuigzma.supabase.co
SUPABASE_KEY = sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse
```

### **B. Vercel Environment (cho webhook function)**

Vào **Vercel Dashboard** → Settings → Environment Variables → Thêm:

```env
SUPABASE_URL=https://qmmiuqztukpagbuigzma.supabase.co
SUPABASE_KEY=sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse

# Email gửi tự động (chọn 1 trong 3)
# Option 1: Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Tạo tại https://myaccount.google.com/apppasswords

# Option 2: Resend.com (Dễ hơn)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=onboarding@resend.dev
SMTP_PASS=your-resend-api-key  # Lấy tại https://resend.com

# Option 3: SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Khuyến nghị:** Dùng Resend vì free tier + easy setup

---

## III. Cộu hình Sepay Webhook

### **Bước 1: Cấu hình webhook URL**

Vào https://sepay.vn → Account → Webhook Settings

```
Webhook URL: https://your-domain.vercel.app/api/webhook-sepay
Method: POST
Events: payment_received
```

### **Bước 2: Test webhook**

```bash
# Gửi test payment từ Sepay dashboard
# Payload sẽ được gửi tới webhook endpoint
```

**Payload từ Sepay nhìn như thế này:**
```json
{
  "referenceCode": "CO1704067200ABC123XYZ",
  "accountNo": "333303838",
  "transferAmount": 299000,
  "memo": "CO1704067200ABC123XYZ",
  "initiateName": "Khách hàng",
  "description": "Content OS V2"
}
```

---

## IV. Deploy Flow

### **Step 1: Upload GitHub (Frontend)**

```bash
cd Second-Brain-AI
git add index.html script.js sections.css styles.css dung-hoang.jpg
git commit -m "feat: V2 - Full automation with Supabase + Sepay"
git push origin main
# Vercel auto-deploys
```

### **Step 2: Deploy Vercel Function (Backend)**

```bash
# Nếu chưa có vercel.json, tạo:
cat > vercel.json << 'EOF'
{
  "functions": {
    "api/webhook-sepay.js": {
      "memory": 512,
      "maxDuration": 30
    }
  }
}
EOF

git add api/webhook-sepay.js vercel.json
git commit -m "feat: Add Sepay webhook function"
git push origin main
# Vercel tự deploy
```

### **Step 3: Verify Deployment**

```bash
# Check webhook is live
curl -X POST https://your-domain.vercel.app/api/webhook-sepay \
  -H "Content-Type: application/json" \
  -d '{
    "referenceCode": "TEST001",
    "accountNo": "333303838",
    "transferAmount": 299000,
    "memo": "TEST"
  }'

# Should return 200 (hoặc lỗi "Lead not found" nếu chưa có lead)
```

---

## V. User Flow (Hoạt động thực tế)

```
1. Khách vào landing page
   ↓
2. Điền form (Tên, SĐT Zalo, Email)
   ↓
3. Script gọi Supabase: INSERT lead
   → Tạo mã duy nhất (reference_code)
   ↓
4. Hiển thị QR code (từ VietQR API)
   ↓
5. Khách quét QR + chuyển 299.000đ
   ↓
6. Sepay phát hiện tiền trong vòng 1 giây
   ↓
7. Sepay gửi webhook tới /api/webhook-sepay
   → Function: UPDATE lead (payment_status = 'completed')
   → Function: SEND EMAIL với link file + group
   ↓
8. Script polling mỗi 5s kiểm tra payment_status
   ↓
9. Khi thấy 'completed' → Hiển thị success message
   ↓
10. Khách nhận email với file + group link
    ✅ DONE
```

---

## VI. Testing Checklist

- [ ] Form validation hoạt động
- [ ] Lead insert vào Supabase ✓
- [ ] QR code hiển thị đúng
- [ ] Webhook nhận tiền từ Sepay ✓
- [ ] Email tự động gửi ✓
- [ ] Success message hiện lên ✓
- [ ] Group link hoạt động ✓

---

## VII. Production Checklist

- [ ] Update link Notion demo (3 trang public)
- [ ] Update link Group Telegram/Zalo
- [ ] Update email template với link thật
- [ ] Setup monitoring/logging
- [ ] Test 1 transaction end-to-end
- [ ] Setup backup email nhân sự
- [ ] Monitor Supabase storage usage

---

## VIII. Troubleshooting

### **❌ Lead không lưu vào Supabase**
- Check SUPABASE_KEY có đúng không
- Check RLS policy `allow inserts from anyone` đã bật
- Check browser console xem error gì

### **❌ QR không hiển thị**
- Fallback URL sẽ hoạt động: `api.vietqr.io`
- Nếu không: hiển thị thông tin ngân hàng static

### **❌ Webhook không nhận tiền**
- Check webhook URL đúng chưa
- Check Sepay account đã kết nối ngân hàng
- Check memo/reference_code trùng khớp

### **❌ Email không gửi được**
- Verify SMTP credentials
- Check spam folder
- Resend.com hay SendGrid dễ hơn Gmail

---

## IX. Next Steps (Tùy chọn nâng cao)

1. **SMS notification** — Send SMS khi khách thanh toán
2. **Zalo auto-reply** — Bot tự reply khi khách nhắn
3. **Google Sheets tracking** — Log mỗi lead vào Google Sheets
4. **Analytics** — Track conversion rate, refund rate
5. **Upsell flow** — Sau 24h gửi email upgrade khóa cao hơn

---

**Setup dự kiến: 1-2 giờ**
**Go-live date: Hôm nay hoặc ngày mai**

Liên hệ nếu cần support! 🚀
