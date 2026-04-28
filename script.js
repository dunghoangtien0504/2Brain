// ═══════════════════════════════════════════════════════════
// Content OS V2 - script.js
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://qmmiuqztukpagbuigzma.supabase.co';
const SUPABASE_KEY = 'sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse';

// ═══ SUPABASE: Insert lead ═══
async function insertLead(fullName, phone, email, orderId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        email,
        amount: 299000,
        payment_status: 'pending',
        order_id: orderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    console.log('✅ Lead inserted:', response.status);
  } catch (err) {
    console.error('⚠️ Insert error:', err.message);
  }
}

// ═══ SEPAY: Tạo order ═══
async function createSepayOrder(phone, fullName, email) {
  try {
    const response = await fetch('/api/create-order-sepay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, fullName, email, amount: 299000 })
    });
    const result = await response.json();
    if (result.success) {
      console.log('✅ Order created:', result.orderId);
      return result;
    } else {
      console.error('❌ Sepay error:', result.error);
      return null;
    }
  } catch (err) {
    console.error('❌ Create order error:', err);
    return null;
  }
}

// ═══ MAIN: Submit form ═══
document.getElementById('submitForm').addEventListener('click', async (e) => {
  e.preventDefault();

  const nameValue = document.getElementById('fullname').value.trim();
  const phoneValue = document.getElementById('phone').value.trim();
  const emailValue = document.getElementById('email').value.trim();

  // Validate
  let hasError = false;
  if (!nameValue) { document.getElementById('err-fullname').style.display = 'block'; hasError = true; }
  else { document.getElementById('err-fullname').style.display = 'none'; }
  if (!/^0\d{9}$/.test(phoneValue)) { document.getElementById('err-phone').style.display = 'block'; hasError = true; }
  else { document.getElementById('err-phone').style.display = 'none'; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) { document.getElementById('err-email').style.display = 'block'; hasError = true; }
  else { document.getElementById('err-email').style.display = 'none'; }
  if (hasError) return;

  // Disable button
  const btn = document.getElementById('submitForm');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    // 1. Tạo order Sepay
    const orderResult = await createSepayOrder(phoneValue, nameValue, emailValue);

    // 2. Show payment section
    document.getElementById('formWrapper').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    document.getElementById('greetingName').textContent = nameValue.split(' ').pop();
    document.getElementById('greetingEmail').textContent = emailValue;
    document.getElementById('greetingPhone').textContent = phoneValue;
    document.getElementById('confirmEmail').textContent = emailValue;

    // 3. Fill transfer note với phone
    document.getElementById('transferNote').textContent = `2Brain ${phoneValue}`;
    document.getElementById('transferNoteDisplay').textContent = `2Brain ${phoneValue}`;

    let orderId;

    if (orderResult) {
      orderId = orderResult.orderId;
      // Show QR từ Sepay API
      document.getElementById('sepayQR').src = orderResult.qrCode;
      document.getElementById('sepayQRContainer').style.display = 'block';
    } else {
      // Fallback: dùng VietQR tĩnh
      const addInfo = encodeURIComponent(`2Brain ${phoneValue}`);
      const qrUrl = `https://img.vietqr.io/image/MB-333303838-compact2.jpg?amount=299000&addInfo=${addInfo}&accountName=HOANG%20TIEN%20DUNG`;
      document.getElementById('sepayQR').src = qrUrl;
      document.getElementById('sepayQRContainer').style.display = 'block';
      // Tạo orderId tạm
      orderId = 'CO' + Date.now();
    }

    // 4. Insert lead
    await insertLead(nameValue, phoneValue, emailValue, orderId);
    window.currentOrderId = orderId;

    // 5. Start polling
    startPaymentPolling(orderId);

  } catch (err) {
    console.error('Form error:', err);
    btn.disabled = false;
    btn.textContent = 'Tiếp Theo — Xem Thông Tin Thanh Toán →';
    alert('Lỗi: ' + err.message);
  }
});

// ═══ Polling ═══
async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}&select=payment_status`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await response.json();
    return data.length > 0 && data[0].payment_status === 'completed';
  } catch (err) {
    return false;
  }
}

function startPaymentPolling(orderId) {
  let checks = 0;
  const pollInterval = setInterval(async () => {
    checks++;
    const paid = await checkPaymentStatus(orderId);
    if (paid) {
      clearInterval(pollInterval);
      // Show success
      document.getElementById('paymentSection').style.display = 'none';
      document.querySelector('.payment-success').style.display = 'block';
      document.getElementById('successEmail').textContent = document.getElementById('greetingEmail').textContent;
    }
    if (checks >= 180) clearInterval(pollInterval);
  }, 5000);
}

// ═══ Go back ═══
function goBack() {
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('formWrapper').style.display = 'block';
  const btn = document.getElementById('submitForm');
  btn.disabled = false;
  btn.textContent = 'Tiếp Theo — Xem Thông Tin Thanh Toán →';
}

// ═══ Copy ═══
function copyText(id, btn) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

// ═══ Countdown ═══
function initCountdown() {
  const deadline = new Date('2026-05-01T23:59:59+07:00');
  function update() {
    const diff = deadline - new Date();
    if (diff <= 0) { ['cd-days','cd-hours','cd-minutes','cd-seconds'].forEach(id => document.getElementById(id).textContent = '00'); return; }
    const pad = n => String(n).padStart(2,'0');
    document.getElementById('cd-days').textContent = pad(Math.floor(diff/86400000));
    document.getElementById('cd-hours').textContent = pad(Math.floor(diff/3600000)%24);
    document.getElementById('cd-minutes').textContent = pad(Math.floor(diff/60000)%60);
    document.getElementById('cd-seconds').textContent = pad(Math.floor(diff/1000)%60);
  }
  update();
  setInterval(update, 1000);
}

// ═══ Reveal animation (scroll) ═══
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initReveal();
});
