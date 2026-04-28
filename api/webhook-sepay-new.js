// api/webhook-sepay.js
// Payment Gateway IPN Webhook from Sepay

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.SMTP_PASS;

const NOTION_LINK = 'https://www.notion.so/AI2Brain-M-u-b631c4caec0b821b97f881db282341a5?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9WljMjll';
const FROM_EMAIL = 'onboarding@resend.dev';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('📩 Payment Gateway IPN received:', JSON.stringify(body, null, 2));

    // Expected: { order_code: "CO1234567", amount: 299000, status: "success", ... }
    const orderId = body.order_code || body.id || '';
    const amount = parseInt(body.amount || 0);
    const status = body.status || body.transaction_status || '';

    if (!orderId) {
      console.log('⚠️ Missing order_code');
      return res.status(400).json({ error: 'Missing order_code' });
    }

    // Check amount
    if (amount < 299000) {
      console.log('⚠️ Amount insufficient:', amount);
      return res.status(400).json({ error: 'Amount insufficient' });
    }

    // Check status (success, completed, APPROVED, etc.)
    if (!['success', 'completed', 'APPROVED', 'SUCCESS'].includes(status)) {
      console.log('⚠️ Payment not successful:', status);
      return res.status(400).json({ error: 'Payment not successful' });
    }

    console.log('✅ Valid payment:', orderId, amount);

    // 1. Find lead by order_id
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const leads = await findRes.json();
    if (!leads || leads.length === 0) {
      console.log('⚠️ Lead not found for order:', orderId);
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leads[0];
    console.log('✅ Lead found:', lead.full_name, lead.email);

    // Skip if already paid
    if (lead.payment_status === 'completed') {
      console.log('ℹ️ Already paid:', orderId);
      return res.status(200).json({ success: true, message: 'Already paid' });
    }

    // 2. Update payment_status
    await fetch(
      `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          payment_status: 'completed',
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    );

    console.log('✅ Payment status updated');

    // 3. Send email
    const firstName = lead.full_name.split(' ').pop();
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: lead.email,
        subject: `🎉 File Content OS của bạn đây, ${firstName}!`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#FF6B2C,#FF8A3D);color:white;padding:40px;border-radius:16px;text-align:center;margin-bottom:20px;">
    <div style="font-size:48px;">🎉</div>
    <h1 style="margin:10px 0 0;font-size:24px;">Chúc mừng ${lead.full_name}!</h1>
    <p style="opacity:0.9;margin:8px 0 0;">Thanh toán thành công — File đang chờ bạn bên dưới</p>
  </div>
  <div style="background:white;padding:30px;border-radius:16px;margin-bottom:16px;">
    <h2 style="color:#FF6B2C;margin:0 0 16px;">📦 File Notion Content OS V2</h2>
    <a href="${NOTION_LINK}" style="display:block;background:#FF6B2C;color:white;text-align:center;padding:16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:10px;">↓ Nhấn đây để lấy File Notion →</a>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">Nhấn "Duplicate" để copy vào Notion của bạn</p>
  </div>
  <div style="background:white;padding:30px;border-radius:16px;margin-bottom:16px;">
    <h2 style="color:#333;margin:0 0 16px;">👥 Nhóm VIP Telegram</h2>
    <a href="${TELEGRAM_LINK}" style="display:block;background:#229ED9;color:white;text-align:center;padding:16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">↳ Vào Nhóm VIP Telegram →</a>
  </div>
  <div style="background:#FFF8F5;border:1px solid #FFE4D6;padding:20px;border-radius:12px;margin-bottom:16px;">
    <p style="margin:0;font-size:14px;"><strong style="color:#FF6B2C;">⏰ Bước tiếp theo:</strong><br>
    Hôm nay mình sẽ nhắn Zalo (<strong>${lead.phone}</strong>) để bắt đầu 7 ngày coaching 1-1.</p>
  </div>
  <p style="text-align:center;color:#999;font-size:12px;">Content OS by Dũng Hoàng · Zalo: 0931546814</p>
</div></body></html>`
      })
    });

    console.log('✅ Email sent to:', lead.email);
    return res.status(200).json({ success: true, orderId, email: lead.email });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
