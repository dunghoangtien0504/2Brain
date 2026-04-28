// ═══════════════════════════════════════════════════════════
// Content OS V2 - script.js — FINAL VERSION
// ✅ Updated SUPABASE_KEY (New key from 2026-04-28)
// ✅ Better error handling
// ✅ Improved user feedback
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://qmmiuqztukpagbuigzma.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbWl1cXp0dWtwYWdidWlnem1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzQ2ODYsImV4cCI6MjA5Mjg1MDY4Nn0.psr5dAzxvIIT0DfJpdpg_k_knylxwodewsWpvV4A-Zk';

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('⚠️ Supabase insert error:', errorText);
      throw new Error('Failed to save order');
    }

    console.log('✅ Lead inserted:', response.status);
  } catch (err) {
    console.error('❌ Insert error:', err);
    throw err;
  }
}

// ═══ SEPAY: Tạo order ═══
async function createSepayOrder(phone, fullName, email) {
  try {
    console.log('🔄 Creating Sepay order...');
    const response = await fetch('/api/create-order-sepay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, fullName, email, amount: 299000 })
    });

    const responseText = await response.text();
    console.log('📥 Sepay API response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON from create-order:', responseText);
      return null;
    }

    if (result.success) {
      console.log('✅ Order created:', result.orderId);
      return result;
    } else {
      console.error('❌ Sepay error:', result.error, result.details);
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
  if (!nameValue) { 
    document.getElementById('err-fullname').style.display = 'block'; 
    hasError = true; 
  } else { 
    document.getElementById('err-fullname').style.display = 'none'; 
  }
  
  if (!/^0\d{9}$/.test(phoneValue)) { 
    document.getElementById('err-phone').style.display = 'block'; 
    hasError = true; 
  } else { 
    document.getElementById('err-phone').style.display = 'none'; 
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) { 
    document.getElementById('err-email').style.display = 'block'; 
    hasError = true; 
  } else { 
    document.getElementById('err-email').style.display = 'none'; 
  }
  
  if (hasError) return;

  // Disable button
  const btn = document.getElementById('submitForm');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    // 1. Tạo order Sepay
    const orderResult = await createSepayOrder(phoneValue, nameValue, emailValue);
    let orderId;

    if (orderResult && orderResult.orderId) {
      // Success case: Got real order from Sepay
      orderId = orderResult.orderId;
      console.log('✅ Got real orderId from Sepay:', orderId);
      
      // Show QR từ Sepay API
      document.getElementById('sepayQR').src = orderResult.qrCode;
      document.getElementById('sepayQRContainer').style.display = 'block';
      document.getElementById('sepayError').style.display = 'none';
      
    } else {
      // Fallback: Sepay API failed — dùng VietQR tĩnh
      console.log('⚠️ Sepay order failed, using fallback VietQR');
      orderId = 'CO' + Date.now();
      
      const addInfo = encodeURIComponent(`2Brain ${phoneValue}`);
      const qrUrl = `https://img.vietqr.io/image/MB-333303838-compact2.jpg?amount=299000&addInfo=${addInfo}&accountName=HOANG%20TIEN%20DUNG`;
      
      document.getElementById('sepayQR').src = qrUrl;
      document.getElementById('sepayQRContainer').style.display = 'block';
      document.getElementById('sepayError').style.display = 'block';
    }

    // 2. Insert lead vào Supabase
    await insertLead(nameValue, phoneValue, emailValue, orderId);
    window.currentOrderId = orderId;

    // 3. Show payment section
    document.getElementById('formWrapper').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    document.getElementById('greetingName').textContent = nameValue.split(' ').pop();
    document.getElementById('greetingEmail').textContent = emailValue;
    document.getElementById('greetingPhone').textContent = phoneValue;
    document.getElementById('confirmEmail').textContent = emailValue;

    // 4. Fill transfer note với phone
    document.getElementById('transferNote').textContent = `2Brain ${phoneValue}`;
    document.getElementById('transferNoteDisplay').textContent = `2Brain ${phoneValue}`;

    // 5. Start polling
    startPaymentPolling(orderId);

  } catch (err) {
    console.error('❌ Form error:', err);
    btn.disabled = false;
    btn.textContent = 'Tiếp Theo — Xem Thông Tin Thanh Toán →';
    alert('Lỗi: ' + err.message + '. Vui lòng thử lại hoặc liên hệ Zalo: 0931546814');
  }
});

// ═══ Polling ═══
async function checkPaymentStatus(orderId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}&select=payment_status`,
      { 
        headers: { 
          'apikey': SUPABASE_KEY, 
          'Authorization': `Bearer ${SUPABASE_KEY}` 
        } 
      }
    );
    
    if (!response.ok) {
      console.error('⚠️ Polling error:', response.status);
      return false;
    }
    
    const data = await response.json();
    const isPaid = data.length > 0 && data[0].payment_status === 'completed';
    
    if (isPaid) {
      console.log('✅ Payment completed detected!');
    }
    
    return isPaid;
  } catch (err) {
    console.error('⚠️ Polling network error:', err);
    return false;
  }
}

function startPaymentPolling(orderId) {
  console.log('🔄 Starting payment polling for:', orderId);
  let checks = 0;
  const maxChecks = 180; // 15 minutes (180 * 5s)
  
  const pollInterval = setInterval(async () => {
    checks++;
    console.log(`🔍 Poll check ${checks}/${maxChecks}`);
    
    const paid = await checkPaymentStatus(orderId);
    
    if (paid) {
      clearInterval(pollInterval);
      console.log('🎉 Payment success! Showing success message...');
      
      // Show success
      document.getElementById('paymentSection').style.display = 'none';
      document.querySelector('.payment-success').style.display = 'block';
      document.getElementById('successEmail').textContent = document.getElementById('greetingEmail').textContent;
    }
    
    if (checks >= maxChecks) {
      clearInterval(pollInterval);
      console.log('⏰ Polling timeout after 15 minutes');
    }
  }, 5000); // Poll every 5 seconds
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
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Không thể copy. Vui lòng copy thủ công.');
  });
}

// ═══ Countdown ═══
function initCountdown() {
  const deadline = new Date('2026-05-01T23:59:59+07:00');
  
  function update() {
    const diff = deadline - new Date();
    
    if (diff <= 0) { 
      ['cd-days','cd-hours','cd-minutes','cd-seconds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return; 
    }
    
    const pad = n => String(n).padStart(2,'0');
    
    const days = document.getElementById('cd-days');
    const hours = document.getElementById('cd-hours');
    const minutes = document.getElementById('cd-minutes');
    const seconds = document.getElementById('cd-seconds');
    
    if (days) days.textContent = pad(Math.floor(diff/86400000));
    if (hours) hours.textContent = pad(Math.floor(diff/3600000)%24);
    if (minutes) minutes.textContent = pad(Math.floor(diff/60000)%60);
    if (seconds) seconds.textContent = pad(Math.floor(diff/1000)%60);
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

// ═══ Init ═══
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Script loaded - SUPABASE_KEY updated 2026-04-28');
  initCountdown();
  initReveal();
});
