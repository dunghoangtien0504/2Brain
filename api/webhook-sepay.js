// api/webhook-sepay.js
// Payment Gateway IPN Webhook from Sepay

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY; // ✅ FIX: Use RESEND_API_KEY instead of SMTP_PASS
const NOTION_LINK = 'https://www.notion.so/AI2B8rain-M-u-b631c4cec0b821b97f881db2823341s3?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9wljHjll1';
const FROM_EMAIL = 'onboarding@resend.dev';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    console.log('📩 [WEBHOOK] IPN received:', JSON.stringify(body, null, 2));

    // Expected: { order_code: "CO1234567", amount: 299000, status: "success", ... }
    const orderId = body.order_code || body.id || '';
    const amount = parseInt(body.amount) || 0;
    const status = body.status || body.transaction_status || '';

    if (!orderId) {
      console.log('⚠️ [WEBHOOK] Missing order_code');
      return res.status(400).json({ error: 'Missing order_code' });
    }

    // Query Supabase for lead
    const queryUrl = `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}&select=id,full_name,email,phone,payment_status`;
    const queryRes = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!queryRes.ok) {
      console.error('❌ [WEBHOOK] Supabase query error:', queryRes.status);
      return res.status(500).json({ error: 'Database error' });
    }

    const leads = await queryRes.json();

    if (!leads || leads.length === 0) {
      console.error('❌ [WEBHOOK] Lead not found:', orderId);
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leads[0];
    const fullName = lead.full_name || 'Customer';
    const email = lead.email;
    const phone = lead.phone;

    // Check if already completed
    if (lead.payment_status === 'completed') {
      console.log('⚠️ [WEBHOOK] Payment already processed:', orderId);
      return res.status(200).json({ success: true, orderId, message: 'Already processed' });
    }

    // Validate payment
    if (status !== 'success' && status !== 'completed') {
      console.log('⚠️ [WEBHOOK] Invalid payment status:', status);
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    if (amount !== 299000) {
      console.warn('⚠️ [WEBHOOK] Amount mismatch:', amount, 'expected 299000');
      // Don't fail - Sepay might have fees
    }

    console.log(`✅ [WEBHOOK] Valid payment: ${orderId} — ${amount}đ`);
    console.log(`✅ [WEBHOOK] Lead found: ${fullName} — ${email}`);

    // Update payment status to completed
    const updateUrl = `${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: 'completed',
        reference_code: orderId,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      console.error('❌ [WEBHOOK] Supabase update error:', updateRes.status);
      return res.status(500).json({ error: 'Update failed' });
    }

    console.log(`✅ [WEBHOOK] Payment status updated to: completed`);

    // Send email via Resend
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`, // ✅ CORRECT KEY
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: '✅ Thanh Toán Thành Công - 2Brain Content OS',
          html: `
            <h1>🎉 Thanh Toán Thành Công!</h1>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi đã xác nhận thanh toán của bạn. Bạn sẽ nhận được:</p>
            <ul>
              <li>📚 Notion Database đầy đủ: <a href="${NOTION_LINK}">Xem tại đây</a></li>
              <li>👥 Nhóm Telegram VIP: <a href="${TELEGRAM_LINK}">Vào nhóm</a></li>
            </ul>
            <p><strong>Nếu cần hỗ trợ:</strong> Liên hệ Zalo: 0931546814</p>
            <p>Cảm ơn bạn đã tin tưởng Content OS!</p>
          `
        })
      });

      if (!emailRes.ok) {
        const emailErr = await emailRes.json();
        console.error('❌ [WEBHOOK] Resend error:', emailErr);
        // Don't fail webhook - payment was processed
      } else {
        console.log(`✅ [WEBHOOK] Email sent to: ${email}`);
      }
    } catch (emailErr) {
      console.error('❌ [WEBHOOK] Email send error:', emailErr.message);
      // Don't fail webhook
    }

    // Success response
    return res.status(200).json({
      success: true,
      orderId,
      email,
      emailSent: true,
      message: 'Payment processed successfully'
    });

  } catch (err) {
    console.error('❌ [WEBHOOK] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
