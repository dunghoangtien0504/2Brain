// ═══════════════════════════════════════════════════════════
// Content OS V2 - Form → Sepay Order API → Payment Gateway IPN
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://qmmiuqztukpagbuigzma.supabase.co';
const SUPABASE_KEY = 'sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse';

// ═══ SUPABASE: Insert lead ═══
async function insertLead(fullName, phone, email, orderId) {
  const leadData = {
    full_name: fullName,
    phone,
    email,
    amount: 299000,
    payment_status: 'pending',
    order_id: orderId, // Track by order_id
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(leadData)
      }
    );

    if (response.ok) {
      console.log('✅ Lead inserted');
      return orderId;
    } else {
      console.log('⚠️ Insert response:', response.status);
      return orderId;
    }
  } catch (err) {
    console.error('⚠️ Insert error (non-critical):', err.message);
    return orderId;
  }
}

// ═══ SEPAY: Gọi API tạo order + QR ═══
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

// ═══ MAIN: Form submission ═══
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameValue = document.getElementById('fullName').value.trim();
  const phoneValue = document.getElementById('phone').value.trim();
  const emailValue = document.getElementById('email').value.trim();

  if (!nameValue || !phoneValue || !emailValue) {
    alert('Vui lòng điền đủ thông tin');
    return;
  }

  // Show loading
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('loadingSection').style.display = 'block';

  try {
    // 1. Create Sepay order
    const orderResult = await createSepayOrder(phoneValue, nameValue, emailValue);
    if (!orderResult) {
      alert('Lỗi tạo đơn hàng. Vui lòng thử lại!');
      location.reload();
      return;
    }

    const orderId = orderResult.orderId;

    // 2. Insert lead
    await insertLead(nameValue, phoneValue, emailValue, orderId);

    // 3. Show QR
    document.getElementById('greetingName').textContent = nameValue.split(' ').pop();
    document.getElementById('greetingEmail').textContent = emailValue;
    document.getElementById('greetingPhone').textContent = phoneValue;
    document.getElementById('qrImage').src = orderResult.qrCode;
    document.getElementById('transferNote').textContent = `2Brain ${phoneValue}`;

    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('qrSection').style.display = 'block';

    // 4. Start polling for payment
    startPaymentPolling(orderId);

  } catch (err) {
    console.error('Form error:', err);
    alert('Lỗi: ' + err.message);
    location.reload();
  }
});

// ═══ Polling: Check payment status ═══
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

    const data = await response.json();

    if (data.length > 0 && data[0].payment_status === 'completed') {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Polling error:', err);
    return false;
  }
}

function startPaymentPolling(orderId) {
  let checks = 0;
  const maxChecks = 180; // 15 phút

  const pollInterval = setInterval(async () => {
    checks++;
    console.log(`⏳ Check ${checks}/180...`);

    const paid = await checkPaymentStatus(orderId);
    if (paid) {
      clearInterval(pollInterval);
      console.log('✅ Payment confirmed!');
      
      document.getElementById('qrSection').style.display = 'none';
      document.getElementById('successSection').style.display = 'block';
      
      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = 'https://www.notion.so/AI2Brain-M-u-b631c4caec0b821b97f881db282341a5';
      }, 3000);
      return;
    }

    if (checks >= maxChecks) {
      clearInterval(pollInterval);
      console.log('⏱️ Timeout');
      alert('Hết thời gian. Vui lòng tải lại trang.');
      location.reload();
    }
  }, 5000); // Check every 5 seconds
}

// ═══ Countdown ═══
function initCountdown() {
  const deadline = new Date('2026-05-01T23:59:59+07:00');

  function updateCountdown() {
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-minutes').textContent = '00';
      document.getElementById('cd-seconds').textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n) => String(n).padStart(2, '0');
    document.getElementById('cd-days').textContent = pad(days);
    document.getElementById('cd-hours').textContent = pad(hours);
    document.getElementById('cd-minutes').textContent = pad(minutes);
    document.getElementById('cd-seconds').textContent = pad(seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Init
document.addEventListener('DOMContentLoaded', initCountdown);
