// ═══ SUPABASE CONFIG ═══
const SUPABASE_URL = 'https://qmmiuqztukpagbuigzma.supabase.co';
const SUPABASE_KEY = 'sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse';

// ═══ SEPAY CONFIG ═══
const SEPAY_UNIT_ID = 'SP-TEST-HTB532B4';
const SEPAY_KEY = 'spsk_test_DFPo1zrQAqGnUZuX8WBiAUEsS777csem';
const SEPAY_API = 'https://test-api.sepay.vn'; // Test environment

// ═══ PAYMENT CONFIG ═══
const PAYMENT_CONFIG = {
  amount: 299000,
  description: 'Content OS V2 - Notion System',
  bankCode: 'MB',
  accountNo: '333303838',
  accountName: 'HOANG TIEN DUNG',
  successUrl: 'https://ai2brain.vercel.app/#success',
  failUrl: 'https://ai2brain.vercel.app/#fail'
};

// ═══ UTILITY: Generate unique reference code ═══
function generateReferenceCode() {
  return 'CO' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// ═══ SUPABASE: Insert lead ═══
async function insertLead(fullName, phone, email) {
  const referenceCode = generateReferenceCode();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        full_name: fullName,
        phone: phone,
        email: email,
        amount: PAYMENT_CONFIG.amount,
        payment_status: 'pending',
        reference_code: referenceCode,
        status: 'new'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Supabase error:', response.status, errorData);
      alert('❌ Lỗi lưu thông tin. Vui lòng kiểm tra kết nối internet và thử lại.');
      return null;
    }

    const data = await response.json();
    console.log('✅ Lead inserted:', referenceCode);
    return referenceCode;
  } catch (error) {
    console.error('❌ Error inserting lead:', error);
    alert('❌ Lỗi kết nối. Vui lòng thử lại sau.');
    return null;
  }
}

// ═══ SEPAY: Generate QR Code URL ═══
async function generateSepayQR(referenceCode, amount, accountNo) {
  const memo = referenceCode;
  
  // Fallback: Tạo QR static từ Vietcombank API
  // Format: https://api.vietqr.io/image/{BANK}/{ACCOUNT}/{AMOUNT}/{DESCRIPTION}.jpg
  const qrUrl = `https://api.vietqr.io/image/MB/${accountNo}/${amount}/${memo}.jpg`;
  console.log('✅ QR URL generated:', qrUrl);
  return qrUrl;
}

// ═══ FORM: Handle Submit ═══
function handleSubmit() {
  const fullname = document.getElementById('fullname');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  
  let valid = true;
  
  // Reset errors
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
  
  // Validate
  const nameValue = fullname.value.trim();
  const phoneValue = phone.value.trim().replace(/\s/g, '');
  const emailValue = email.value.trim();
  
  if (!nameValue || nameValue.length < 2) {
    fullname.classList.add('error');
    document.getElementById('err-fullname').classList.add('show');
    valid = false;
  }
  
  if (!phoneValue || !/^0[0-9]{9}$/.test(phoneValue)) {
    phone.classList.add('error');
    document.getElementById('err-phone').classList.add('show');
    valid = false;
  }
  
  if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    email.classList.add('error');
    document.getElementById('err-email').classList.add('show');
    valid = false;
  }
  
  if (!valid) return;
  
  // 1. Insert lead to Supabase
  insertLead(nameValue, phoneValue, emailValue).then(async (referenceCode) => {
    if (!referenceCode) {
      alert('❌ Lỗi lưu thông tin. Vui lòng thử lại.');
      return;
    }
    
    // 2. Show greeting
    document.getElementById('greetingName').textContent = nameValue.split(' ').pop();
    document.getElementById('greetingEmail').textContent = emailValue;
    document.getElementById('greetingPhone').textContent = phoneValue;
    document.getElementById('confirmEmail').textContent = emailValue;
    window.currentEmail = emailValue;
    
    // Hide form, show payment
    document.querySelector('.form-wrapper').style.display = 'none';
    document.querySelector('.payment-section').style.display = 'block';
    
    // 3. Generate & display Sepay QR
    const qrUrl = await generateSepayQR(referenceCode, PAYMENT_CONFIG.amount, PAYMENT_CONFIG.accountNo);
    if (qrUrl) {
      document.getElementById('sepayQR').src = qrUrl;
      document.getElementById('sepayQRContainer').style.display = 'block';
    }
    
    // Store referenceCode để polling
    window.currentReferenceCode = referenceCode;
    startPaymentPolling(referenceCode);
  });
}

// ═══ POLLING: Cek tình trạng thanh toán ═══
function startPaymentPolling(referenceCode) {
  let checkCount = 0;
  const maxChecks = 180; // 15 phút với interval 5 giây
  
  const pollInterval = setInterval(async () => {
    checkCount++;
    const paid = await checkPaymentStatus(referenceCode);
    
    if (paid) {
      clearInterval(pollInterval);
      showPaymentSuccess();
    }
    
    if (checkCount >= maxChecks) {
      clearInterval(pollInterval);
    }
  }, 5000); // Check every 5 seconds
}

// ═══ SUPABASE: Check payment status ═══
async function checkPaymentStatus(referenceCode) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?reference_code=eq.${referenceCode}&select=payment_status`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0 && data[0].payment_status === 'completed') {
        return true;
      }
    }
  } catch (error) {
    console.error('Error checking payment:', error);
  }
  return false;
}

// ═══ UI: Show success message ═══
function showPaymentSuccess() {
  document.querySelector('.payment-section').style.display = 'none';
  document.querySelector('.payment-success').style.display = 'block';
  document.getElementById('successEmail').textContent = window.currentEmail || 'email@gmail.com';
}

// ═══ UI: Go back to edit form ═══
function goBack() {
  document.querySelector('.form-wrapper').style.display = 'block';
  document.querySelector('.payment-section').style.display = 'none';
  document.querySelector('.payment-success').style.display = 'none';
}

// ═══ UI: Copy text to clipboard ═══
function copyText(elementId, btn) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '✓ Đã copy';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// ═══ UI: Countdown timer ═══
function initCountdown() {
  const deadline = new Date('2026-05-01T23:59:59+07:00').getTime();
  
  setInterval(() => {
    const now = new Date().getTime();
    const timeLeft = deadline - now;
    
    if (timeLeft < 0) {
      document.querySelectorAll('[data-countdown]').forEach(el => {
        el.innerHTML = 'Ưu đãi đã kết thúc';
      });
      return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    const display = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    document.querySelectorAll('[data-countdown]').forEach(el => {
      el.textContent = display;
    });
  }, 1000);
}

// ═══ SCROLL REVEAL ═══
function setupScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  
  reveals.forEach(reveal => {
    reveal.style.opacity = '0';
    reveal.style.transform = 'translateY(20px)';
    reveal.style.transition = 'all 0.6s ease-out';
    observer.observe(reveal);
  });
}

// ═══ FAQ ACCORDION ═══
function setupFAQ() {
  document.querySelectorAll('.faq-item summary').forEach(summary => {
    summary.addEventListener('click', function(e) {
      e.preventDefault();
      const details = this.parentElement;
      
      // Close other details
      document.querySelectorAll('.faq-item details[open]').forEach(other => {
        if (other !== details) {
          other.removeAttribute('open');
        }
      });
      
      // Toggle current
      if (details.hasAttribute('open')) {
        details.removeAttribute('open');
      } else {
        details.setAttribute('open', '');
      }
    });
  });
}

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  setupScrollReveal();
  setupFAQ();
  
  // Bind form submit
  const submitBtn = document.getElementById('submitForm');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }
});
