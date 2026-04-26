// ═══════════════════════════════════════════════════════════════════
// CONTENT OS V2 — script.js
// ═══════════════════════════════════════════════════════════════════

// Scroll reveal animation
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ═══════════════════════════════════════════════════════════════════
// COUNTDOWN — DEADLINE THẬT cho Đại Lễ 30/4 - 1/5/2026
// Deadline: 1/5/2026 23:59:59 GMT+7 (Vietnam time)
// ═══════════════════════════════════════════════════════════════════
function startCountdown() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  if (!hoursEl || !minutesEl || !secondsEl) return;

  // Deadline THẬT — không rolling, không reset
  // Format ISO: YYYY-MM-DDTHH:mm:ss+07:00 (giờ Việt Nam)
  const deadline = new Date('2026-05-01T23:59:59+07:00').getTime();

  const update = () => {
    const now = Date.now();
    const remaining = deadline - now;

    // Đã hết hạn → hiển thị thông báo và stop
    if (remaining <= 0) {
      if (daysEl) daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';

      // Display expired notice
      const countdownLabel = document.querySelector('.order-countdown-label');
      if (countdownLabel && !countdownLabel.dataset.expired) {
        countdownLabel.innerHTML = '⏰ <span style="color:#FF4D3A">Đợt ưu đãi đã kết thúc — giá hiện tại 499.000đ</span>';
        countdownLabel.dataset.expired = '1';
      }
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  };

  update();
  setInterval(update, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT — VietQR
// ═══════════════════════════════════════════════════════════════════
const PAYMENT_CONFIG = {
  bankId: 'MB',
  accountNo: '333303838',
  accountName: 'HOANG TIEN DUNG',
  amount: 299000,
  template: 'compact2',
  transferPrefix: 'SecondBrainAI'
};

function buildVietQrUrl(amount, addInfo) {
  const baseUrl = `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNo}-${PAYMENT_CONFIG.template}.png`;
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: addInfo,
    accountName: PAYMENT_CONFIG.accountName
  });
  return `${baseUrl}?${query.toString()}`;
}

function renderVietQr(amount, transferContent) {
  const qrBox = document.getElementById('vietqrBox');
  if (!qrBox) return;

  const qrUrl = buildVietQrUrl(amount, transferContent);
  qrBox.style.height = '220px';
  qrBox.style.minHeight = '220px';
  qrBox.style.padding = '10px';
  qrBox.style.background = '#fff';
  qrBox.style.overflow = 'hidden';
  qrBox.innerHTML = `<img src="${qrUrl}" alt="QR chuyển khoản VietQR" style="width:200px;max-width:100%;height:200px;max-height:100%;object-fit:contain;display:block;margin:0 auto;border-radius:8px;" onerror="this.parentElement.innerHTML='⚠️ Không tải được QR. Vui lòng thử tải lại trang.';" />`;
}

// ═══════════════════════════════════════════════════════════════════
// FORM HANDLING
// ═══════════════════════════════════════════════════════════════════
function handleSubmit() {
  var name = document.getElementById('fullname').value.trim();
  var phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
  var email = document.getElementById('email').value.trim();
  var valid = true;

  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));

  if (!name || name.length < 2) {
    document.getElementById('fullname').classList.add('error');
    document.getElementById('err-fullname').classList.add('show');
    valid = false;
  }
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    document.getElementById('phone').classList.add('error');
    document.getElementById('err-phone').classList.add('show');
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('email').classList.add('error');
    document.getElementById('err-email').classList.add('show');
    valid = false;
  }

  if (!valid) return;

  document.getElementById('greetingName').textContent = name;
  document.getElementById('greetingEmail').textContent = email;
  document.getElementById('greetingPhone').textContent = phone;
  document.getElementById('bankNum').textContent = PAYMENT_CONFIG.accountNo;
  document.getElementById('amountDisplay').textContent = PAYMENT_CONFIG.amount.toLocaleString('vi-VN') + 'đ';

  const transferContent = `${PAYMENT_CONFIG.transferPrefix} ${phone}`;
  document.getElementById('transferNote').textContent = transferContent;
  document.getElementById('transferNoteDisplay').textContent = transferContent;
  document.getElementById('confirmEmail').textContent = email;
  renderVietQr(PAYMENT_CONFIG.amount, transferContent);

  document.getElementById('formSection').style.display = 'none';
  document.getElementById('paymentSection').classList.add('show');
  document.getElementById('paymentSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goBack() {
  document.getElementById('formSection').style.display = 'flex';
  document.getElementById('formSection').style.flexDirection = 'column';
  document.getElementById('paymentSection').classList.remove('show');
}

function copyText(elId, btn) {
  var text = document.getElementById(elId).textContent.replace('đ', '').replace(/\./g, '').trim();
  if (elId === 'amountDisplay') text = String(PAYMENT_CONFIG.amount);
  if (elId === 'transferNote') text = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Đã copy ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    var el = document.getElementById(elId);
    var r = document.createRange();
    r.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
  });
}

// ═══════════════════════════════════════════════════════════════════
// SMOOTH SCROLL & STAGGER ANIMATION
// ═══════════════════════════════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

const staggerObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const items = entry.target.children;
      Array.from(items).forEach((item, i) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`;
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }, 50);
      });
      staggerObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.pain-list, .modules-grid, .stack-items, .promise-cards, .forlist, .demo-cards, .guarantee-grid, .faq-list').forEach(el => {
  staggerObserver.observe(el);
});

// ═══════════════════════════════════════════════════════════════════
// FAQ ACCORDION — Smooth toggle (HTML5 details element with custom enhancement)
// ═══════════════════════════════════════════════════════════════════
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('toggle', () => {
    const toggle = item.querySelector('.faq-toggle');
    if (!toggle) return;
    toggle.textContent = item.open ? '−' : '+';
  });
});

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
renderVietQr(PAYMENT_CONFIG.amount, `${PAYMENT_CONFIG.transferPrefix} 0000000000`);
startCountdown();
