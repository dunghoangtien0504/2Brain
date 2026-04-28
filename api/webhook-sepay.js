// api/webhook-sepay.js — FINAL v4
// ✅ FIX 400: Extract DH code từ description khi body.code = null
// ✅ FIX 403 Resend: FROM_EMAIL = noreply@hoangtiendung.com
// ✅ Lookup: DH code từ body.code → regex description → phone

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTION_LINK = 'https://www.notion.so/AI2B8rain-M-u-b631c4cec0b821b97f881db2823341s3?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9wljHjll1';
const FROM_EMAIL = 'noreply@hoangtiendung.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('🔔 [WEBHOOK] Full payload:', JSON.stringify(body));

    const transactionId = body.id || '';
    const description   = body.description || body.content || '';
    const amount        = parseInt(body.transferAmount || body.amount) || 0;
    const referenceCode = body.referenceCode || body.reference_code || '';

    // ══════════════════════════════════════════════════════
    // BƯỚC 1: Xác định DH order code
    // SePay đôi khi không tự populate body.code dù config đúng
    // → Tự extract bằng regex từ description
    // Ví dụ description: "BankAPINotify DH1777394309294"
    // ══════════════════════════════════════════════════════
    let orderCode = (body.code && body.code.startsWith('DH')) ? body.code : null;

    if (!orderCode) {
      const dhMatch = description.match(/DH\d{10,}/);
      if (dhMatch) {
        orderCode = dhMatch[0];
        console.log(`🔍 Extracted from description: ${orderCode}`);
      }
    } else {
      console.log(`✅ body.code = ${orderCode}`);
    }

    console.log(`📝 orderCode=${orderCode} | amount=${amount} | desc="${description}"`);

    let lead = null;

    // ══════════════════════════════════════════════════════
    // BƯỚC 2a: Tìm theo DH order code (ưu tiên)
    // ══════════════════════════════════════════════════════
    if (orderCode) {
      console.log(`🔍 [PRIMARY] Supabase lookup order_id = ${orderCode}`);
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderCode}&select=*&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (rows && rows.length > 0) {
          lead = rows[0];
          console.log(`✅ [PRIMARY] Found: ${lead.full_name} (${lead.email}) status=${lead.payment_status}`);
        } else {
          console.warn(`⚠️ Không tìm thấy order_id=${orderCode} trong DB`);
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // BƯỚC 2b: Fallback — tìm theo số điện thoại
    // ══════════════════════════════════════════════════════
    if (!lead) {
      const phoneMatch = description.match(/0\d{9}/);
      const phone = phoneMatch ? phoneMatch[0] : null;
      console.log(`📱 [FALLBACK] phone = ${phone}`);

      if (phone) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&payment_status=eq.pending&select=*&order=created_at.desc&limit=1`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (r.ok) {
          const rows = await r.json();
          if (rows && rows.length > 0) {
            lead = rows[0];
            console.log(`✅ [FALLBACK] Found by phone: ${lead.full_name}`);
          }
        }
      }

      if (!lead) {
        console.error(`❌ Không tìm thấy lead nào. orderCode=${orderCode}`);
        return res.status(404).json({ error: 'Lead not found', orderCode, description });
      }
    }

    const { full_name: fullName, email, id: leadId, order_id: orderId, payment_status } = lead;

    // Đã xử lý rồi → bỏ qua
    if (payment_status === 'completed') {
      console.log(`⚠️ Already completed: ${orderId}`);
      return res.status(200).json({ success: true, message: 'Already processed', orderId });
    }

    // ══════════════════════════════════════════════════════
    // BƯỚC 3: Cập nhật Supabase → completed
    // ══════════════════════════════════════════════════════
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: 'completed',
        reference_code: referenceCode || String(transactionId),
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!upd.ok) {
      console.error(`❌ Supabase update failed (${upd.status})`);
      return res.status(500).json({ error: 'Update failed' });
    }
    console.log(`✅ Supabase updated → completed (${orderId})`);

    // ══════════════════════════════════════════════════════
    // BƯỚC 4: Gửi email Resend
    // ══════════════════════════════════════════════════════
    let emailSent = false;
    let emailError = null;

    try {
      console.log(`📧 Sending → ${email} | from: ${FROM_EMAIL}`);
      console.log(`📧 API key: ${RESEND_API_KEY?.substring(0,12)}...`);

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: '✅ Thanh Toán Thành Công - 2Brain',
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h1 style="color:#FF6B2C;">🎉 Thanh Toán Thành Công!</h1>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi đã xác nhận thanh toán <strong style="color:#16a34a;">299.000đ</strong> của bạn.</p>
            <hr style="border:1px solid #e5e7eb;margin:20px 0;">
            <p><strong>Bạn sẽ nhận được:</strong></p>
            <ul style="line-height:2;">
              <li>📚 Notion Database: <a href="${NOTION_LINK}" style="color:#FF6B2C;">Xem tại đây</a></li>
              <li>👥 Nhóm Telegram VIP: <a href="${TELEGRAM_LINK}" style="color:#FF6B2C;">Vào nhóm ngay</a></li>
            </ul>
            <hr style="border:1px solid #e5e7eb;margin:20px 0;">
            <p>Mã đơn: <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;">${orderId}</code></p>
            <p>Hỗ trợ Zalo: <a href="https://zalo.me/0931546814" style="color:#FF6B2C;">0931546814</a></p>
            <p style="color:#6b7280;font-size:14px;">Cảm ơn bạn đã tin tưởng 2Brain! 🚀</p>
          </body></html>`
        })
      });

      const emailData = await emailRes.json();
      console.log(`📧 Resend (${emailRes.status}):`, JSON.stringify(emailData));

      if (!emailRes.ok) {
        emailError = emailData?.message || `HTTP ${emailRes.status}`;
        console.error(`❌ Email failed: ${emailError}`);
      } else {
        emailSent = true;
        console.log(`✅ Email sent! ID: ${emailData?.id}`);
      }
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('❌ Email exception:', emailErr.message);
    }

    return res.status(200).json({
      success: true, orderId, email, emailSent,
      emailError: emailError || null,
      message: 'Payment processed'
    });

  } catch (err) {
    console.error('❌ Fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
