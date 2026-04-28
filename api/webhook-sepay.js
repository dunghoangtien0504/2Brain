// api/webhook-sepay.js — FIXED v3
// ✅ Lookup theo code DH (primary) — SePay tự detect từ nội dung CK
// ✅ Lookup theo phone (fallback) — nếu không có code
// ✅ FROM_EMAIL dùng domain verified: noreply@hoangtiendung.com

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTION_LINK = 'https://www.notion.so/AI2B8rain-M-u-b631c4cec0b821b97f881db2823341s3?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9wljHjll1';
const FROM_EMAIL = 'noreply@hoangtiendung.com'; // ✅ FIXED: domain đã verify

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('🔔 [WEBHOOK] Payload:', JSON.stringify(body));

    const transactionId = body.id || '';
    const description = body.description || body.content || '';
    const amount = parseInt(body.transferAmount || body.amount) || 0;
    const referenceCode = body.referenceCode || body.reference_code || '';
    
    // ✅ SePay tự detect code DH từ nội dung CK (nhờ cấu hình prefix DH)
    const sePayCode = body.code || null; // Ví dụ: "DH1777391893418"

    console.log(`📝 description="${description}", amount=${amount}, code=${sePayCode}`);

    let lead = null;

    // ══════════════════════════════════════════
    // BƯỚC 1: Tìm theo code DH (ưu tiên)
    // ══════════════════════════════════════════
    if (sePayCode && sePayCode.startsWith('DH')) {
      console.log(`🔍 [PRIMARY] Tìm lead theo order_id=${sePayCode}`);

      const queryRes = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${sePayCode}&select=*&order=created_at.desc&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );

      if (queryRes.ok) {
        const leads = await queryRes.json();
        if (leads && leads.length > 0) {
          lead = leads[0];
          console.log(`✅ [PRIMARY] Tìm thấy lead: ${lead.full_name} (${lead.email})`);
        }
      }
    }

    // ══════════════════════════════════════════
    // BƯỚC 2: Fallback tìm theo phone
    // ══════════════════════════════════════════
    if (!lead) {
      const phoneMatch = description.match(/0\d{9}/);
      const phone = phoneMatch ? phoneMatch[0] : null;

      console.log(`📱 [FALLBACK] Extracted phone: ${phone}`);

      if (!phone) {
        console.error('❌ Không tìm được order từ code hoặc phone');
        console.error('   code:', sePayCode);
        console.error('   description:', description);
        return res.status(400).json({ error: 'Cannot identify payment', description, code: sePayCode });
      }

      const queryRes = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&payment_status=eq.pending&select=*&order=created_at.desc&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );

      if (queryRes.ok) {
        const leads = await queryRes.json();
        if (leads && leads.length > 0) {
          lead = leads[0];
          console.log(`✅ [FALLBACK] Tìm thấy lead: ${lead.full_name} (${lead.email})`);
        }
      }

      // Fallback cuối: tìm kể cả đã completed
      if (!lead) {
        const fallbackRes = await fetch(
          `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&select=*&order=created_at.desc&limit=1`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (fallbackRes.ok) {
          const fallbackLeads = await fallbackRes.json();
          if (fallbackLeads && fallbackLeads.length > 0) {
            const existingLead = fallbackLeads[0];
            if (existingLead.payment_status === 'completed') {
              console.log(`⚠️ Lead đã xử lý rồi: ${existingLead.order_id}`);
              return res.status(200).json({ success: true, message: 'Already processed', orderId: existingLead.order_id });
            }
            lead = existingLead;
          }
        }
      }
    }

    // Không tìm thấy
    if (!lead) {
      console.error('❌ Không tìm thấy lead nào phù hợp');
      return res.status(404).json({ error: 'Lead not found', code: sePayCode, description });
    }

    const { full_name: fullName, email, id: leadId, order_id: orderId, payment_status } = lead;

    // Đã completed rồi thì bỏ qua
    if (payment_status === 'completed') {
      console.log(`⚠️ Đã xử lý rồi: ${orderId}`);
      return res.status(200).json({ success: true, message: 'Already processed', orderId });
    }

    console.log(`✅ Xử lý thanh toán: ${fullName} (${email}) — order: ${orderId}`);

    // ══════════════════════════════════════════
    // BƯỚC 3: Cập nhật Supabase → completed
    // ══════════════════════════════════════════
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
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

    if (!updateRes.ok) {
      console.error('❌ Update Supabase thất bại:', updateRes.status);
      return res.status(500).json({ error: 'Update failed' });
    }

    console.log(`✅ Supabase updated → completed (${orderId})`);

    // ══════════════════════════════════════════
    // BƯỚC 4: Gửi email via Resend
    // ══════════════════════════════════════════
    let emailSent = false;
    let emailError = null;

    try {
      console.log(`📧 Gửi email → ${email}`);

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
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">🎉 Thanh Toán Thành Công!</h1>
              <p>Xin chào <strong>${fullName}</strong>,</p>
              <p>Chúng tôi đã xác nhận thanh toán <strong style="color:#16a34a;">299,000đ</strong> của bạn.</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p><strong>Bạn sẽ nhận được:</strong></p>
              <ul style="line-height: 2;">
                <li>📚 Notion Database đầy đủ: <a href="${NOTION_LINK}" style="color:#2563eb;">Xem tại đây</a></li>
                <li>👥 Nhóm Telegram VIP: <a href="${TELEGRAM_LINK}" style="color:#2563eb;">Vào nhóm ngay</a></li>
              </ul>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p>Mã đơn hàng: <code style="background:#f3f4f6; padding: 2px 6px; border-radius: 4px;">${orderId}</code></p>
              <p><strong>Hỗ trợ:</strong> Zalo <a href="https://zalo.me/0931546814">0931546814</a></p>
              <p style="color: #6b7280; font-size: 14px;">Cảm ơn bạn đã tin tưởng 2Brain! 🚀</p>
            </body>
            </html>
          `
        })
      });

      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        console.error(`❌ Resend error (${emailRes.status}):`, JSON.stringify(emailData));
        emailError = emailData?.message || `HTTP ${emailRes.status}`;
      } else {
        console.log(`✅ Email sent! ID: ${emailData?.id}`);
        emailSent = true;
      }
    } catch (emailErr) {
      console.error('❌ Email exception:', emailErr.message);
      emailError = emailErr.message;
    }

    return res.status(200).json({
      success: true,
      orderId,
      email,
      emailSent,
      emailError: emailError || null,
      message: 'Payment processed successfully'
    });

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
