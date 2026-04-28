// api/webhook-sepay.js - FIXED: Match lead by phone from description
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
    console.log('🔔 [WEBHOOK] Sepay payload:', JSON.stringify(body));

    // Sepay gửi: id, description, transferAmount, referenceCode
    const transactionId = body.id || body.transaction_id || '';
    const description = body.description || body.content || '';
    const amount = parseInt(body.transferAmount || body.amount) || 0;
    const referenceCode = body.referenceCode || body.reference_code || '';

    console.log(`📝 description="${description}", amount=${amount}, ref=${referenceCode}`);

    // Extract phone từ description: "BankAPINotify 2Brain 0931546814"
    // Tìm số điện thoại 10 số bắt đầu bằng 0
    const phoneMatch = description.match(/0\d{9}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    console.log(`📱 Extracted phone: ${phone}`);

    if (!phone) {
      console.error('❌ Cannot extract phone from description:', description);
      return res.status(400).json({ 
        error: 'Cannot identify payment',
        description 
      });
    }

    // Tìm lead theo phone + pending status
    const queryUrl = `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&payment_status=eq.pending&select=*&order=created_at.desc&limit=1`;
    console.log(`🔍 Searching lead by phone=${phone}`);

    const queryRes = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!queryRes.ok) {
      console.error('❌ Supabase query error:', queryRes.status);
      return res.status(500).json({ error: 'Database error' });
    }

    const leads = await queryRes.json();
    console.log(`📋 Found ${leads.length} lead(s)`);

    if (!leads || leads.length === 0) {
      // Fallback: tìm lead mới nhất theo phone (kể cả completed)
      const fallbackUrl = `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&select=*&order=created_at.desc&limit=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (fallbackRes.ok) {
        const fallbackLeads = await fallbackRes.json();
        if (fallbackLeads && fallbackLeads.length > 0) {
          const existingLead = fallbackLeads[0];
          console.log(`⚠️ Lead already completed: ${existingLead.order_id}`);
          return res.status(200).json({ 
            success: true, 
            message: 'Already processed',
            orderId: existingLead.order_id
          });
        }
      }

      console.error(`❌ No lead found for phone=${phone}`);
      return res.status(404).json({ error: 'Lead not found', phone });
    }

    const lead = leads[0];
    const { full_name: fullName, email, id: leadId, order_id: orderId } = lead;

    console.log(`✅ Lead found: ${fullName} (${email}) - order: ${orderId}`);

    // Validate amount (optional)
    if (amount > 0 && amount !== 299000) {
      console.warn(`⚠️ Amount mismatch: ${amount} (expected 299000)`);
    }

    // Update payment_status → completed
    const updateUrl = `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`;
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
        reference_code: referenceCode || String(transactionId),
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      console.error('❌ Update failed:', updateRes.status);
      return res.status(500).json({ error: 'Update failed' });
    }

    console.log(`✅ payment_status → completed for ${orderId}`);

    // Send email
    let emailSent = false;
    let emailError = null;

    try {
      console.log(`📧 Sending email to: ${email}`);
      console.log(`📧 API key prefix: ${RESEND_API_KEY?.substring(0, 15)}...`);

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
            <h1>🎉 Thanh Toán Thành Công!</h1>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi đã xác nhận thanh toán <strong>299,000đ</strong> của bạn.</p>
            <p>Bạn sẽ nhận được:</p>
            <ul>
              <li>📚 Notion Database đầy đủ: <a href="${NOTION_LINK}">Xem tại đây</a></li>
              <li>👥 Nhóm Telegram VIP: <a href="${TELEGRAM_LINK}">Vào nhóm</a></li>
            </ul>
            <p><strong>Hỗ trợ:</strong> Zalo 0931546814</p>
            <p>Cảm ơn bạn đã tin tưởng 2Brain! 🚀</p>
          `
        })
      });

      console.log(`📧 Resend status: ${emailRes.status}`);
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
      phone,
      email,
      emailSent,
      emailError: emailError || null,
      message: 'Payment processed'
    });

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
