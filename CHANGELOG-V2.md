# 📋 Content OS Landing Page V2 — Changelog & Deploy Guide

**Tác giả thay đổi:** Phân tích Hormozi + Marketing-Pro framework  
**Ngày:** 26/4/2026  
**File thay đổi:** `index.html`, `sections.css`, `script.js` (styles.css giữ nguyên)

---

## 🎯 TÓM TẮT NHỮNG GÌ ĐÃ THAY ĐỔI

### ✅ Sections MỚI được thêm (5)

| # | Section | Vị trí trong page | Mục đích |
|---|---------|------------------|----------|
| 1 | **Demo Preview** | Sau Promise Cards | 3 trang Notion public — xóa rủi ro mua nhầm |
| 2 | **Founder Story** | Sau Modules Grid | Tăng authority — bạn là ai, tại sao tin |
| 3 | **V2 Honest Positioning** | Sau Founder | Biến "thiếu testimonial" thành lợi thế early bird |
| 4 | **Guarantee Stack** | Sau Value Stack | 4 cam kết khả thi (không hoàn tiền nhưng có Demo + Support + Lifetime) |
| 5 | **FAQ — 10 Q&A** | Trước Order Section | Xử lý 10 objection chính trước khi mua |

### 🔄 Sections được UPDATE

| Section | Thay đổi chính |
|---------|----------------|
| **Topbar** | "Ưu đãi Đại Lễ 30/4 — 1/5: 299k → sau 1/5 lên 499k" |
| **Hero Headline** | Đổi sang Version A (Hormozi M.A.G.I.C): "Hệ Thống Notion 7 Ngày: Thoát Trang Trắng — Đăng Bài Đầu Tiên Thu Hút Client Cho Freelancer Việt 25-35" |
| **Hero Stats** | Đổi: 60 phút có bài đầu, 14 ngày coaching, 200+ V1 |
| **Pain Section** | Target hơn: nhắm freelancer phụ thuộc client, mất 1 client = mất 30-50% thu nhập |
| **Timeline** | Đổi từ 30 ngày → **7 ngày sprint + 7 ngày follow-up** với check-in qua Zalo |
| **Promise Cards** | Thêm card "Có lý do tăng giá dịch vụ 30%" (6 cards) |
| **Value Stack** | 3 bonus mới: Coaching 1-1 (1.5tr) + Group VIP (500k) + Fast Action Audit (700k) |
| **Total Value** | Từ 1.699.000đ → **4.399.000đ** (93% off) |
| **Commitment Box** | Refined: 5-15 phút thay vì 5 phút (realistic hơn) |
| **For-Who Section** | Mở rộng: 4 yes (freelancer, solopreneur, side-hustle, đã thử bỏ) + 4 no |
| **Order Countdown** | **Deadline THẬT: 1/5/2026 23:59:59 GMT+7** (thay vì rolling 12h) |
| **Final CTA** | "Bắt Đầu 7 Ngày Sprint Của Tôi" |

---

## ⚠️ CẦN LÀM TRƯỚC KHI DEPLOY (4 việc bắt buộc)

### 1. ✅ Bật public 3 trang demo file Notion (30 phút)

Mở file Notion gốc, làm 3 trang demo public:

```
Trang 1: Brand Voice Canvas (1 ví dụ điền sẵn)
Trang 2: 20/200 Hook đầu tiên
Trang 3: 1 Story Khuôn đã điền hoàn chỉnh
```

**Cách làm:**
1. Mở trang trong Notion
2. Click **Share** (góc trên phải)
3. Toggle **"Share to web"** → ON
4. Tắt **"Allow editing"**
5. Tắt **"Allow duplicate as template"** (quan trọng — không cho copy)
6. Copy link

Sau đó **mở `index.html`** tìm 3 chỗ này và thay `href="#"`:

```html
<a href="#" class="demo-card" target="_blank" rel="noopener" data-demo="brand-voice">
                                                                  ↑ thay bằng link Notion
```

```html
<a href="#" class="demo-card" target="_blank" rel="noopener" data-demo="hooks">
```

```html
<a href="#" class="demo-card" target="_blank" rel="noopener" data-demo="story">
```

---

### 2. ✅ Điền số liệu THẬT vào Founder Story (15 phút)

Mở `index.html`, tìm `<!-- ═══ FOUNDER STORY -->`, thay 4 placeholder:

```
[Thành phố của bạn]   → vd: TP.HCM
[Nghề chính]          → vd: Marketer Freelance
[X] giờ               → vd: 3 giờ
[Y] tháng             → vd: 6 tháng
[Z] bài/tuần          → vd: 4 bài/tuần
[N] follower          → vd: 1.200 follower
[M] inbox client/tháng → vd: 5-7 inbox
```

**LƯU Ý:** Chỉ điền số THẬT. Nếu chỉ có 200 follower thật, viết 200. Đừng phóng đại — khách Việt Nam soi rất kỹ.

Sau khi điền xong, có thể xoá hoặc giữ section `.founder-edit-note` (đó là note nhắc cho bạn).

---

### 3. ✅ Thêm headshot Dũng Hoàng (10 phút)

Trong `index.html`, tìm:

```html
<div class="founder-photo-placeholder">
  <span>📸</span>
  <small>[Đặt headshot rõ mặt vào đây]</small>
</div>
```

Thay bằng:

```html
<div class="founder-photo-placeholder">
  <img src="dung-hoang.jpg" alt="Dũng Hoàng" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);">
</div>
```

Đặt file `dung-hoang.jpg` (headshot rõ mặt, vuông, 600x600+) vào cùng thư mục với `index.html`.

---

### 4. ✅ Verify Countdown deadline đúng giờ Việt Nam (5 phút)

Mở `script.js`, tìm dòng:

```js
const deadline = new Date('2026-05-01T23:59:59+07:00').getTime();
```

`+07:00` là múi giờ Việt Nam (GMT+7). Kiểm tra ngày bằng cách mở trang trong browser, xem countdown có đúng không (so với hôm nay 26/4/2026 → còn ~5 ngày).

Sau **1/5/2026 23:59:59**, countdown sẽ tự hiển thị: *"Đợt ưu đãi đã kết thúc — giá hiện tại 499.000đ"* — bạn cần update giá tay trên trang.

---

## 📈 NÊN LÀM TRONG TUẦN SAU (tăng conversion thêm)

### 5. Outreach 200 khách V1 cũ → lấy 5-10 testimonial THẬT

Dùng script trong file `content-os-landing-v2.md` (Phần 5). Sau khi có testimonial thật, thêm section testimonial vào trang (đặt giữa Founder Story và V2 Honest Positioning).

### 6. Setup tracking conversion

Cài Google Analytics 4 + Facebook Pixel. Track:
- Click "Bắt Đầu 7 Ngày Sprint" 
- Submit form (lead)
- Đến trang thanh toán
- Click "Copy" số TK / nội dung CK
- Demo Preview clicks (xem có ai click demo không)

### 7. A/B test Hero Headline

Sau 100-200 visitor đầu, nếu conversion < 5%, test Version B:

> "7 Ngày Có Personal Brand Đầu Tiên: Freelancer 25-35 Đăng Bài Mà Không Cần Cảm Hứng"

---

## 🎨 STRUCTURE TRANG MỚI (15 sections)

```
1. Topbar (Đại Lễ banner)
2. Hero (new headline + 3 stats)
3. Pain (target freelancer)
4. Future Self Timeline (7 ngày + 7 ngày follow-up)
5. Promise Cards (6 cards)
6. Demo Preview ⭐ NEW
7. Modules Grid (8 module)
8. Founder Story ⭐ NEW
9. V2 Honest Positioning ⭐ NEW
10. Value Stack (4 items: 1 main + 3 bonus)
11. Guarantee Stack ⭐ NEW (4 cam kết)
12. Commitment Box (5-15 phút)
13. For Who (4 yes + 4 no)
14. FAQ — 10 Q&A ⭐ NEW
15. Order Section (form + payment)
+ Final CTA + Footer
```

---

## 🔧 KỸ THUẬT — Files thay đổi

| File | Thay đổi | LOC |
|------|---------|-----|
| `index.html` | Rewrite toàn bộ | 484 dòng |
| `sections.css` | Append CSS cho 5 section mới + responsive | 331 dòng (was 184) |
| `script.js` | Sửa countdown deadline thật + FAQ accordion | 221 dòng |
| `styles.css` | **KHÔNG ĐỔI** — design tokens giữ nguyên | 76 dòng |

---

## 🚀 DEPLOY

```bash
# Trong thư mục local
git add .
git commit -m "feat: V2 - Hormozi-optimized landing page

- New headline (M.A.G.I.C formula) targeting freelancer 25-35
- Add Demo Preview section (3 Notion pages public)
- Add Founder Story (honest positioning)
- Add V2 Honest section (early bird positioning)
- Add Guarantee Stack (4 cam kết khả thi)
- Add FAQ (10 Q&A xử lý objection)
- Update timeline 30 ngày → 7 ngày sprint + 7 ngày follow-up
- Update bonuses: Coaching 1-1 + Group VIP + Fast Action Audit
- Real countdown deadline: 1/5/2026 23:59:59 GMT+7
- Total value 1.699k → 4.399k (93% off)"

git push origin main
# Vercel sẽ tự deploy
```

---

## ⚡ QUICK CHECKLIST TRƯỚC KHI LIVE

- [ ] 3 link demo Notion đã thay vào index.html
- [ ] Số liệu thật trong Founder Story đã điền
- [ ] Ảnh headshot dung-hoang.jpg đã upload
- [ ] Test countdown timer chạy đúng (~5 ngày tới 1/5)
- [ ] Test form submit → trang thanh toán hiển thị
- [ ] Test trên mobile (responsive)
- [ ] Test FAQ click expand/collapse
- [ ] Test demo cards click mở tab mới
- [ ] Cập nhật meta tags (title + description) nếu cần

---

## 📊 KỲ VỌNG THỰC TẾ

| Metric | V1 (cũ) | V2 (mới — kỳ vọng) |
|--------|---------|---------------------|
| Conversion cold traffic | 1-2% | 3-5% |
| Conversion warm traffic | 3-5% | 8-12% |
| Time on page | 30-60s | 90-180s |
| Bounce rate | 70-80% | 50-60% |
| Demo card click rate | N/A | 25-40% (target) |
| FAQ engagement | N/A | 15-25% expand |

**LƯU Ý:** Đừng kỳ vọng 50% conversion trên cold traffic — không thực tế cho bất kỳ LP nào. Mục tiêu Grand Slam thật:
- **Conversion 5-10%** × **LTV cao** (qua upsell + continuity) = máy in tiền

---

**Câu hỏi? Cần help section nào sâu hơn? Cứ gửi.**
